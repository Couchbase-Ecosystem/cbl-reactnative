import Foundation
import CouchbaseLiteSwift
import React

/**
 * Turbo Module implementation for Couchbase Lite Collection operations
 * 
 * This module handles:
 * - Saving documents to collections
 * - Getting documents from collections
 * - Creating and getting collections
 * 
 * IMPORTANT: This class conforms to RCTTurboModule to enable JSI-based
 * communication for better performance compared to the legacy bridge.
 */
@objc(CouchbaseLiteCollection)
class CouchbaseLiteCollection: NSObject {
    
    private let backgroundQueue = DispatchQueue(label: "com.cblite.collection.turbo")
    
    // MARK: - Collection Handle Caching (for minimal Swift benchmark)
    // This mirrors the C library approach: cache collection once, use handle for saves
    private var cachedCollections: [Int64: Collection] = [:]
    private var nextCollectionHandle: Int64 = 1
    private let cacheQueue = DispatchQueue(label: "com.cblite.collection.cache")
    
    /**
     * Saves a document to a collection
     */
    @objc
    func collection_Save(
        _ document: String,
        blobs: String,
        id: String,
        databaseName: String,
        scopeName: String,
        collectionName: String,
        concurrencyControlValue: NSNumber,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: databaseName as NSString,
            collectionName: collectionName as NSString,
            scopeName: scopeName as NSString,
            reject: reject
        )
        let (isDocumentError, documentArgs) = DataAdapter.shared.adaptDocumentArgs(
            docId: id as NSString,
            concurrencyControlValue: concurrencyControlValue,
            reject: reject
        )
        if isError || isDocumentError {
            return
        }
        let (isDocumentBlobError, documentBlobArgs) = DataAdapter.shared.adaptDocumentBlobStrings(
            document: document as NSString,
            blobs: blobs as NSString,
            reject: reject
        )
        if isDocumentBlobError {
            return
        }
        
        backgroundQueue.async {
            do {
                let blobsDict = try CollectionManager.shared.blobsFromJsonString(documentBlobArgs.blobs)
                
                let result = try CollectionManager.shared.saveDocument(
                    documentArgs.documentId,
                    document: documentBlobArgs.document,
                    blobs: blobsDict,
                    concurrencyControl: documentArgs.concurrencyControlValue,
                    collectionName: args.collectionName,
                    scopeName: args.scopeName,
                    databaseName: args.databaseName
                )
                
                let resultDict: [String: Any] = [
                    "_id": result.id,
                    "_revId": result.revId ?? "",
                    "_sequence": result.sequence
                ]
                resolve(resultDict)
            } catch let error as NSError {
                reject("COLLECTION_ERROR", error.localizedDescription, nil)
            } catch {
                reject("COLLECTION_ERROR", error.localizedDescription, nil)
            }
        }
    }
    
    // MARK: - Synchronous Save (No backgroundQueue.async)
    
    /**
     * Saves a document to a collection SYNCHRONOUSLY
     * 
     * This is the synchronous version of collection_Save for performance testing.
     * Key difference: NO backgroundQueue.async - executes directly on JS thread.
     * 
     * WARNING: This blocks the JS thread during execution!
     * Only use for performance testing or when you understand the implications.
     */
    @objc
    func collection_SaveSync(
        _ document: String,
        blobs: String,
        id: String,
        databaseName: String,
        scopeName: String,
        collectionName: String,
        concurrencyControlValue: NSNumber
    ) -> NSDictionary {
        // Argument validation - using simple validation for sync path
        guard !databaseName.isEmpty else {
            return ["error": "Database name is required"]
        }
        guard !collectionName.isEmpty else {
            return ["error": "Collection name is required"]
        }
        guard !scopeName.isEmpty else {
            return ["error": "Scope name is required"]
        }
        guard !id.isEmpty else {
            return ["error": "Document ID is required"]
        }
        
        do {
            // Parse blobs (same as async version)
            let blobsDict = try CollectionManager.shared.blobsFromJsonString(blobs)
            
            // Parse concurrency control
            let concurrencyControl: ConcurrencyControl?
            let ccValue = concurrencyControlValue.intValue
            if ccValue == -9999 {
                concurrencyControl = nil
            } else if ccValue == 0 {
                concurrencyControl = .lastWriteWins
            } else {
                concurrencyControl = .failOnConflict
            }
            
            // Save document SYNCHRONOUSLY (no backgroundQueue.async!)
            let result = try CollectionManager.shared.saveDocument(
                id,
                document: document,
                blobs: blobsDict,
                concurrencyControl: concurrencyControl,
                collectionName: collectionName,
                scopeName: scopeName,
                databaseName: databaseName
            )
            
            let resultDict: NSDictionary = [
                "_id": result.id,
                "_revId": result.revId ?? "",
                "_sequence": result.sequence
            ]
            return resultDict
        } catch let error as NSError {
            return ["error": error.localizedDescription]
        } catch {
            return ["error": error.localizedDescription]
        }
    }
    
    /**
     * Gets a document from a collection
     */
    @objc
    func collection_GetDocument(
        _ docId: String,
        databaseName: String,
        scopeName: String,
        collectionName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: databaseName as NSString,
            collectionName: collectionName as NSString,
            scopeName: scopeName as NSString,
            reject: reject
        )
        let (isDocumentError, documentId) = DataAdapter.shared.adaptNonEmptyString(
            value: docId as NSString,
            propertyName: "docId",
            reject: reject
        )
        if isError || isDocumentError {
            return
        }
        
        backgroundQueue.async {
            do {
                guard let doc = try CollectionManager.shared.document(
                    documentId,
                    collectionName: args.collectionName,
                    scopeName: args.scopeName,
                    databaseName: args.databaseName
                ) else {
                    let dict: NSDictionary = [:]
                    resolve(dict)
                    return
                }
                
                var data: [String: Any] = [:]
                let documentJson = doc.toJSON()
                if !documentJson.isEmpty {
                    guard let jsonData = documentJson.data(using: .utf8),
                          let jsonDict = try JSONSerialization.jsonObject(with: jsonData, options: []) as? [String: Any] else {
                        reject("COLLECTION_ERROR", "Failed to parse document JSON", nil)
                        return
                    }
                    data["_data"] = jsonDict
                } else {
                    data["_data"] = [:]
                }
                data["_id"] = documentId
                data["_sequence"] = doc.sequence
                data["_revisionID"] = doc.revisionID ?? ""
                
                let dict: NSDictionary = data as NSDictionary
                resolve(dict)
            } catch let error as NSError {
                reject("COLLECTION_ERROR", error.localizedDescription, nil)
            } catch {
                reject("COLLECTION_ERROR", error.localizedDescription, nil)
            }
        }
    }
    
    /**
     * Gets an existing collection
     */
    @objc
    func collection_GetCollection(
        _ collectionName: String,
        databaseName: String,
        scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: databaseName as NSString,
            collectionName: collectionName as NSString,
            scopeName: scopeName as NSString,
            reject: reject
        )
        if isError {
            return
        }
        
        backgroundQueue.async {
            do {
                if let collection = try DatabaseManager.shared.collection(
                    args.collectionName,
                    scopeName: args.scopeName,
                    databaseName: args.databaseName
                ) {
                    let dict = DataAdapter.shared.adaptCollectionToNSDictionary(
                        collection,
                        databaseName: args.databaseName
                    )
                    resolve(dict)
                } else {
                    resolve(nil)
                }
            } catch let error as NSError {
                reject("COLLECTION_ERROR", error.localizedDescription, nil)
            } catch {
                reject("COLLECTION_ERROR", error.localizedDescription, nil)
            }
        }
    }
    
    /**
     * Creates a new collection
     */
    @objc
    func collection_CreateCollection(
        _ collectionName: String,
        databaseName: String,
        scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: databaseName as NSString,
            collectionName: collectionName as NSString,
            scopeName: scopeName as NSString,
            reject: reject
        )
        if isError {
            return
        }
        
        backgroundQueue.async {
            do {
                if let collection = try DatabaseManager.shared.createCollection(
                    args.collectionName,
                    scopeName: args.scopeName,
                    databaseName: args.databaseName
                ) {
                    let dict = DataAdapter.shared.adaptCollectionToNSDictionary(
                        collection,
                        databaseName: args.databaseName
                    )
                    resolve(dict)
                } else {
                    reject("COLLECTION_ERROR", "Error creating collection", nil)
                }
            } catch let error as NSError {
                reject("COLLECTION_ERROR", error.localizedDescription, nil)
            } catch {
                reject("COLLECTION_ERROR", error.localizedDescription, nil)
            }
        }
    }
    
    /**
     * Echo method for measuring pure bridge overhead - TURBO OPTIMIZED
     * 
     * KEY DIFFERENCE FROM LEGACY:
     * - Executes SYNCHRONOUSLY on the JS/JSI thread
     * - NO DispatchQueue.async dispatch (saves ~0.01-0.05ms per call)
     * - Direct promise resolution without thread hop
     * 
     * This is how Turbo Modules SHOULD work - synchronous when possible!
     */
    @objc
    func collection_Echo(
        _ data: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        // TURBO: Execute and resolve IMMEDIATELY on calling thread
        // NO async dispatch - this is the key difference!
        let resultDict: [String: Any] = ["data": data]
        resolve(resultDict)  // Direct resolve, no queue
    }
    
    /**
     * TRUE SYNCHRONOUS echo - returns directly without Promise
     * This is the fastest possible bridge call in Turbo Modules
     */
    @objc
    func collection_EchoSync(_ data: String) -> String {
        // TRUE SYNCHRONOUS - returns directly!
        return data
    }
    
    /**
     * Turbo-optimized performance check - SYNCHRONOUS
     * 
     * This method demonstrates the REAL power of Turbo Modules:
     * - Executes entirely on the JS thread via JSI
     * - No thread switching overhead
     * - No async dispatch overhead
     * - Returns result synchronously
     */
    @objc
    func collection_PerformanceCheckTurboSync(_ iterations: Double) -> NSDictionary {
        let startTime = CFAbsoluteTimeGetCurrent()
        let count = Int(iterations)
        
        // Execute directly - this runs on JS thread!
        var sum: Int = 0
        for i in 0..<count {
            sum += i
        }
        
        let endTime = CFAbsoluteTimeGetCurrent()
        let timeMs = (endTime - startTime) * 1000.0
        
        // Return synchronously - no Promise, no thread hop!
        return [
            "timeMs": timeMs,
            "iterations": count,
            "checksum": sum
        ]
    }
    
    /**
     * Async version for comparison
     */
    @objc
    func collection_PerformanceCheckTurbo(
        _ iterations: Double,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let startTime = CFAbsoluteTimeGetCurrent()
        let count = Int(iterations)
        
        // Execute directly on current thread - NO async dispatch!
        var sum: Int = 0
        for i in 0..<count {
            sum += i
        }
        
        let endTime = CFAbsoluteTimeGetCurrent()
        let timeMs = (endTime - startTime) * 1000.0
        
        // Resolve immediately - no thread dispatch
        let resultDict: [String: Any] = [
            "timeMs": timeMs,
            "iterations": count,
            "checksum": sum
        ]
        resolve(resultDict)
    }
    
    /**
     * Batch echo for measuring overhead across many calls
     * Processes multiple items in a single native call to amortize bridge overhead
     */
    @objc
    func collection_BatchEchoSync(_ count: Double) -> Int {
        // Process batch synchronously - returns count
        return Int(count)
    }
    
    /**
     * Gets the document count in a collection
     */
    @objc
    func collection_GetCount(
        _ collectionName: String,
        databaseName: String,
        scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: databaseName as NSString,
            collectionName: collectionName as NSString,
            scopeName: scopeName as NSString,
            reject: reject
        )
        if isError {
            return
        }
        
        backgroundQueue.async {
            do {
                let count = try CollectionManager.shared.documentsCount(
                    args.collectionName,
                    scopeName: args.scopeName,
                    databaseName: args.databaseName
                )
                let dict: NSDictionary = ["count": count]
                resolve(dict)
            } catch let error as NSError {
                reject("COLLECTION_ERROR", error.localizedDescription, nil)
            } catch {
                reject("COLLECTION_ERROR", error.localizedDescription, nil)
            }
        }
    }
    
    /**
     * Gets all index names in a collection
     */
    @objc
    func collection_GetIndexes(
        _ collectionName: String,
        scopeName: String,
        databaseName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: databaseName as NSString,
            collectionName: collectionName as NSString,
            scopeName: scopeName as NSString,
            reject: reject
        )
        if isError {
            return
        }
        
        backgroundQueue.async {
            do {
                let indexes = try CollectionManager.shared.indexes(
                    args.collectionName,
                    scopeName: args.scopeName,
                    databaseName: args.databaseName
                )
                let dict: NSDictionary = ["indexes": indexes]
                resolve(dict)
            } catch let error as NSError {
                reject("COLLECTION_ERROR", error.localizedDescription, nil)
            } catch {
                reject("COLLECTION_ERROR", error.localizedDescription, nil)
            }
        }
    }
    
    /**
     * Gets all collections in a scope
     */
    @objc
    func collection_GetCollections(
        _ databaseName: String,
        scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptScopeArgs(
            name: databaseName as NSString,
            scopeName: scopeName as NSString,
            reject: reject
        )
        if isError {
            return
        }
        
        backgroundQueue.async {
            do {
                if let collections = try DatabaseManager.shared.collections(
                    args.scopeName,
                    databaseName: args.databaseName
                ) {
                    let collectionsArray = DataAdapter.shared.adaptCollectionsToNSDictionaryString(
                        collections,
                        databaseName: args.databaseName
                    )
                    let results: NSDictionary = ["collections": collectionsArray]
                    resolve(results)
                } else {
                    reject("COLLECTION_ERROR", "Unable to get collections for scope", nil)
                }
            } catch let error as NSError {
                reject("COLLECTION_ERROR", error.localizedDescription, nil)
            } catch {
                reject("COLLECTION_ERROR", error.localizedDescription, nil)
            }
        }
    }
    
    // MARK: - C Library Benchmark Methods
    // These methods expose the raw C library (libcblite) via CbliteBenchmark Obj-C++ bridge
    // for performance comparison with the Swift SDK implementation
    
    private lazy var cbliteBenchmark = CbliteBenchmark()
    
    /**
     * Legacy benchmark method (kept for compatibility)
     */
    @objc
    func benchmarkCLibraryOpenClose(_ name: String, directory: String) -> Double {
        let startTime = CFAbsoluteTimeGetCurrent()
        let handle = cbliteBenchmark.openDatabase(withName: name, directory: directory)
        let opened = CFAbsoluteTimeGetCurrent()
        cbliteBenchmark.closeDatabase(withHandle: handle)
        let closed = CFAbsoluteTimeGetCurrent()
        
        let openMs = (opened - startTime) * 1000
        let closeMs = (closed - opened) * 1000
        let totalMs = (closed - startTime) * 1000
        
        print("[C Library Benchmark] Open: \(String(format: "%.3f", openMs))ms, Close: \(String(format: "%.3f", closeMs))ms, Total: \(String(format: "%.3f", totalMs))ms")
        
        return totalMs
    }
    
    // MARK: - C Library Database Operations
    
    @objc
    func clib_OpenDatabase(_ name: String, directory: String) -> NSNumber {
        let handle = cbliteBenchmark.openDatabase(withName: name, directory: directory)
        return NSNumber(value: handle)
    }
    
    @objc
    func clib_CloseDatabase(_ handle: Double) -> NSNumber {
        let success = cbliteBenchmark.closeDatabase(withHandle: Int64(handle))
        return NSNumber(value: success)
    }
    
    @objc
    func clib_DeleteDatabase(_ name: String, directory: String) -> NSNumber {
        let success = cbliteBenchmark.deleteDatabase(withName: name, directory: directory)
        return NSNumber(value: success)
    }
    
    // MARK: - C Library Collection Operations
    
    @objc
    func clib_GetDefaultCollection(_ dbHandle: Double) -> NSNumber {
        let handle = cbliteBenchmark.getDefaultCollection(withHandle: Int64(dbHandle))
        return NSNumber(value: handle)
    }
    
    @objc
    func clib_CreateCollection(_ dbHandle: Double, name: String, scopeName: String) -> NSNumber {
        let handle = cbliteBenchmark.createCollection(withHandle: Int64(dbHandle), name: name, scopeName: scopeName)
        return NSNumber(value: handle)
    }
    
    @objc
    func clib_GetDocumentCount(_ collectionHandle: Double) -> NSNumber {
        let count = cbliteBenchmark.getDocumentCount(withCollectionHandle: Int64(collectionHandle))
        return NSNumber(value: count)
    }
    
    // MARK: - C Library Document Operations
    
    @objc
    func clib_SaveDocument(_ collectionHandle: Double, docId: String, jsonData: String) -> NSNumber {
        let result = cbliteBenchmark.saveDocument(withCollectionHandle: Int64(collectionHandle), documentId: docId, jsonData: jsonData)
        return NSNumber(value: result != nil)
    }
    
    @objc
    func clib_GetDocument(_ collectionHandle: Double, docId: String) -> Any {
        if let dict = cbliteBenchmark.getDocument(withCollectionHandle: Int64(collectionHandle), documentId: docId),
           let data = dict["_data"] as? String {
            return data
        }
        return NSNull()
    }
    
    // MARK: - C Library Transaction Operations
    
    @objc
    func clib_BeginTransaction(_ dbHandle: Double) -> NSNumber {
        let success = cbliteBenchmark.beginTransaction(withHandle: Int64(dbHandle))
        return NSNumber(value: success)
    }
    
    @objc
    func clib_EndTransaction(_ dbHandle: Double, commit: Bool) -> NSNumber {
        let success = cbliteBenchmark.endTransaction(withHandle: Int64(dbHandle), commit: commit)
        return NSNumber(value: success)
    }
    
    // MARK: - C Library Echo (Pure Overhead Measurement)
    
    @objc
    func clib_Echo(_ data: String) -> String {
        return cbliteBenchmark.echo(withData: data)
    }
    
    // MARK: - C Library Async Methods (for Sync vs Async Comparison Testing)
    
    /**
     * Opens a database using the C library - ASYNC version
     * 
     * This wraps the sync C library call in backgroundQueue.async for fair
     * comparison testing between sync and async approaches.
     */
    @objc
    func clib_OpenDatabaseAsync(
        _ name: String,
        directory: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        backgroundQueue.async {
            let handle = self.cbliteBenchmark.openDatabase(withName: name, directory: directory)
            if handle == 0 {
                reject("CLIB_ERROR", "Failed to open database", nil)
            } else {
                resolve(NSNumber(value: handle))
            }
        }
    }
    
    /**
     * Gets the default collection - ASYNC version
     */
    @objc
    func clib_GetDefaultCollectionAsync(
        _ dbHandle: Double,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        backgroundQueue.async {
            let handle = self.cbliteBenchmark.getDefaultCollection(withHandle: Int64(dbHandle))
            if handle == 0 {
                reject("CLIB_ERROR", "Failed to get default collection", nil)
            } else {
                resolve(NSNumber(value: handle))
            }
        }
    }
    
    /**
     * Saves a document to a collection using the C library - ASYNC version
     * 
     * This wraps the sync C library call in backgroundQueue.async for fair
     * comparison testing between sync and async approaches.
     */
    @objc
    func clib_SaveDocumentAsync(
        _ collectionHandle: Double,
        docId: String,
        jsonData: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        backgroundQueue.async {
            let result = self.cbliteBenchmark.saveDocument(
                withCollectionHandle: Int64(collectionHandle),
                documentId: docId,
                jsonData: jsonData
            )
            resolve(NSNumber(value: result != nil))
        }
    }
    
    /**
     * Closes a database using the C library - ASYNC version
     */
    @objc
    func clib_CloseDatabaseAsync(
        _ handle: Double,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        backgroundQueue.async {
            let success = self.cbliteBenchmark.closeDatabase(withHandle: Int64(handle))
            resolve(NSNumber(value: success))
        }
    }
    
    /**
     * Deletes a database using the C library - ASYNC version
     */
    @objc
    func clib_DeleteDatabaseAsync(
        _ name: String,
        directory: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        backgroundQueue.async {
            let success = self.cbliteBenchmark.deleteDatabase(withName: name, directory: directory)
            resolve(NSNumber(value: success))
        }
    }
    
    // MARK: - Minimal Swift Methods (Collection Handle Approach)
    // These methods mirror the C library approach for fair performance comparison.
    // Instead of looking up collection every time, we cache it once and use a handle.
    
    /**
     * Gets a collection and caches it, returning a handle for subsequent operations.
     * This mirrors clib_GetDefaultCollection - cache once, use handle for all saves.
     * 
     * @param databaseName - Database name
     * @param scopeName - Scope name
     * @param collectionName - Collection name
     * @returns Handle (Int64) to use with swift_SaveDocumentMinimal methods
     */
    @objc
    func swift_GetCollectionHandle(
        _ databaseName: String,
        scopeName: String,
        collectionName: String
    ) -> NSNumber {
        // Get the collection using existing SDK methods
        guard let database = DatabaseManager.shared.getDatabase(databaseName) else {
            NSLog("[SwiftMinimal] Failed to get database: \(databaseName)")
            return NSNumber(value: 0)
        }
        
        do {
            guard let collection = try database.collection(name: collectionName, scope: scopeName) else {
                NSLog("[SwiftMinimal] Failed to get collection: \(collectionName)")
                return NSNumber(value: 0)
            }
            
            // Cache the collection and return handle
            var handle: Int64 = 0
            cacheQueue.sync {
                handle = nextCollectionHandle
                nextCollectionHandle += 1
                cachedCollections[handle] = collection
            }
            
            NSLog("[SwiftMinimal] Cached collection with handle: \(handle)")
            return NSNumber(value: handle)
        } catch {
            NSLog("[SwiftMinimal] Error getting collection: \(error.localizedDescription)")
            return NSNumber(value: 0)
        }
    }
    
    /**
     * Saves a document using cached collection handle - MINIMAL SYNC version.
     * 
     * This is the minimal Swift equivalent of clib_SaveDocument:
     * - Uses cached collection (no lookup)
     * - Creates MutableDocument directly from JSON
     * - Saves without concurrency control
     * - Returns just Bool (no result object)
     * 
     * @param collectionHandle - Handle from swift_GetCollectionHandle
     * @param docId - Document ID
     * @param jsonData - Document JSON string
     * @returns Bool indicating success
     */
    @objc
    func swift_SaveDocumentMinimalSync(
        _ collectionHandle: Double,
        docId: String,
        jsonData: String
    ) -> NSNumber {
        // Get cached collection
        var collection: Collection?
        cacheQueue.sync {
            collection = cachedCollections[Int64(collectionHandle)]
        }
        
        guard let col = collection else {
            return NSNumber(value: false)
        }
        
        do {
            // Minimal document creation - same as C library
            let mutableDocument = try MutableDocument(id: docId, json: jsonData)
            
            // Minimal save - no concurrency control, no blobs
            try col.save(document: mutableDocument)
            
            return NSNumber(value: true)
        } catch {
            return NSNumber(value: false)
        }
    }
    
    /**
     * Saves a document using cached collection handle - MINIMAL ASYNC version.
     * Same as sync but wrapped in backgroundQueue for fair async comparison.
     */
    @objc
    func swift_SaveDocumentMinimalAsync(
        _ collectionHandle: Double,
        docId: String,
        jsonData: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        backgroundQueue.async {
            // Get cached collection
            var collection: Collection?
            self.cacheQueue.sync {
                collection = self.cachedCollections[Int64(collectionHandle)]
            }
            
            guard let col = collection else {
                resolve(NSNumber(value: false))
                return
            }
            
            do {
                // Minimal document creation - same as C library
                let mutableDocument = try MutableDocument(id: docId, json: jsonData)
                
                // Minimal save - no concurrency control, no blobs
                try col.save(document: mutableDocument)
                
                resolve(NSNumber(value: true))
            } catch {
                resolve(NSNumber(value: false))
            }
        }
    }
    
    /**
     * Releases a cached collection handle.
     * Call this when done with bulk operations to free memory.
     */
    @objc
    func swift_ReleaseCollectionHandle(_ handle: Double) -> NSNumber {
        var removed = false
        cacheQueue.sync {
            if cachedCollections.removeValue(forKey: Int64(handle)) != nil {
                removed = true
                NSLog("[SwiftMinimal] Released collection handle: \(Int64(handle))")
            }
        }
        return NSNumber(value: removed)
    }
}
