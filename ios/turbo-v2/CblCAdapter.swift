import Foundation
import UIKit
import React

// Note: CbliteBenchmark (ObjC++ wrapper around libcblite C API) is available via the
// Objective-C bridging header (CblReactnative-Bridging-Header.h).
//
// If you see linter errors about CbliteBenchmark, they will resolve during actual Xcode build.
// The bridging header imports are processed during compilation, not during static analysis.

// MARK: - Error Types

enum CblCError: Error, LocalizedError {
    case databaseNotFound(name: String)
    case collectionNotFound(name: String, scope: String, collection: String)
    case databaseError(message: String)
    case collectionError(message: String)
    case documentError(message: String)
    case queryError(message: String)
    case replicatorError(message: String)
    case jsonParseError(message: String)

    var errorDescription: String? {
        switch self {
        case .databaseNotFound(let name):
            return "Database not found for name: '\(name)'"
        case .collectionNotFound(let name, let scope, let col):
            return "Collection not found: \(scope).\(col) in database '\(name)'"
        case .databaseError(let msg): return "Database error: \(msg)"
        case .collectionError(let msg): return "Collection error: \(msg)"
        case .documentError(let msg): return "Document error: \(msg)"
        case .queryError(let msg): return "Query error: \(msg)"
        case .replicatorError(let msg): return "Replicator error: \(msg)"
        case .jsonParseError(let msg): return "JSON parse error: \(msg)"
        }
    }
}

// MARK: - Adapter

@objcMembers
public class CblCAdapter: NSObject {

    // Thread-safe storage (concurrent reads, barrier writes)
    private let queue = DispatchQueue(label: "com.cbl.c.adapter", attributes: .concurrent)
    private let clib = CbliteBenchmark()

    // Keyed by `name` (= databaseUniqueName) -> Int64 C pointer
    // Example: ["myDatabase": 140735234567890, "travel-sample": 140735234568910]
    private var databases: [String: Int64] = [:]

    // Keyed by "name::scopeName::collectionName" -> (colPtr, dbName)
    // Example: ["myDatabase::_default::items": (colPtr: 140735234569930, dbName: "myDatabase")]
    private var collections: [String: (colPtr: Int64, dbName: String)] = [:]

    // Keyed by replicatorId (UUID string) -> Int64 C pointer
    // Example: ["550e8400-e29b-41d4-a716-446655440000": 140735234570950]
    private var replicators: [String: Int64] = [:]

    // MARK: - Key Helpers

    /// Build collection cache key from the triple that JS always sends
    /// Example: collectionKey("myDB", "_default", "items") → "myDB::_default::items"
    private func collectionKey(name: String, scopeName: String, collectionName: String) -> String {
        return "\(name)::\(scopeName)::\(collectionName)"
    }

    /// Resolve-or-cache for a collection pointer.
    /// IMPORTANT: Must be called from within the dispatch queue (queue.async or queue.async(flags: .barrier)).
    private func resolveCollectionPtr(
        name: String, scopeName: String, collectionName: String
    ) -> Int64? {
        let key = collectionKey(name: name, scopeName: scopeName, collectionName: collectionName)

        // Fast path: already cached
        if let cached = collections[key] {
            return cached.colPtr
        }

        // Slow path: resolve from database
        guard let dbPtr = databases[name] else { return nil }
        let colPtr = clib.createCollection(withHandle: dbPtr, name: collectionName, scopeName: scopeName)
        if colPtr == 0 { return nil }

        // Cache it directly (we're already on the queue)
        collections[key] = (colPtr: colPtr, dbName: name)
        return colPtr
    }

    // MARK: - Database Operations

    /// Opens (or creates) a database. Returns { databaseUniqueName }.
    /// ObjC selector: databaseOpenWithName:directory:encryptionKey:resolve:reject:
    public func databaseOpen(
        name: String, directory: String?, encryptionKey: String?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        // Disable idle timer to prevent screen locking during benchmarks
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = true
            NSLog("[CblCAdapter] databaseOpen: isIdleTimerDisabled = true")
        }

        queue.async(flags: .barrier) {
            let dir = directory ?? ""
            guard !dir.isEmpty else {
                reject("DB_OPEN", "Directory is required for C library", nil)
                return
            }
            let ptr = self.clib.openDatabase(withName: name, directory: dir)
            if ptr == 0 {
                reject("DB_OPEN", "Failed to open database '\(name)'", nil)
                return
            }
            self.databases[name] = ptr
            resolve(["databaseUniqueName": name])
        }
    }

    /// Closes a database by name.
    /// ObjC selector: databaseCloseWithName:resolve:reject:
    public func databaseClose(
        name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let ptr = self.databases[name] else {
                reject("DB_CLOSE", "Database not found: \(name)", nil)
                return
            }
            self.clib.closeDatabase(withHandle: ptr)
            self.databases.removeValue(forKey: name)
            self.collections = self.collections.filter { !$0.key.hasPrefix("\(name)::") }

            if self.databases.isEmpty {
                DispatchQueue.main.async {
                    UIApplication.shared.isIdleTimerDisabled = false
                    NSLog("[CblCAdapter] databaseClose: All databases closed, isIdleTimerDisabled = false")
                }
            }

            resolve(nil)
        }
    }

    /// Deletes an open database by name.
    /// ObjC selector: databaseDeleteWithName:resolve:reject:
    public func databaseDelete(
        name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let ptr = self.databases[name] else {
                reject("DB_DELETE", "Database not found: \(name)", nil)
                return
            }
            self.clib.closeDatabase(withHandle: ptr)
            self.databases.removeValue(forKey: name)
            self.collections = self.collections.filter { !$0.key.hasPrefix("\(name)::") }
            resolve(nil)
        }
    }

    /// Deletes a database file by path (static, db must be closed).
    /// ObjC selector: databaseDeleteWithPathWithDatabaseName:directory:resolve:reject:
    public func databaseDeleteWithPath(
        databaseName: String, directory: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            let success = self.clib.deleteDatabase(withName: databaseName, directory: directory)
            if success {
                resolve(nil)
            } else {
                reject("DB_DELETE_PATH", "Failed to delete database '\(databaseName)' at '\(directory)'", nil)
            }
        }
    }

    /// Returns filesystem path of an open database.
    /// ObjC selector: databaseGetPathWithName:resolve:reject:
    public func databaseGetPath(
        name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async {
            guard let _ = self.databases[name] else {
                reject("DB_PATH", "Database not found: \(name)", nil)
                return
            }
            // TODO: Add CBLDatabase_Path to CbliteBenchmark.mm
            resolve(["path": ""])
        }
    }

    /// Checks if a database file exists at the given path.
    /// ObjC selector: databaseExistsWithDatabaseName:directory:resolve:reject:
    public func databaseExists(
        databaseName: String, directory: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async {
            // TODO: Add CBL_DatabaseExists to CbliteBenchmark.mm
            resolve(["exists": false])
        }
    }

    // MARK: - Collection Operations

    /// Creates (or returns existing) a collection.
    /// ObjC selector: collectionCreateWithCollectionName:name:scopeName:resolve:reject:
    public func collectionCreate(
        collectionName: String, name: String, scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let dbPtr = self.databases[name] else {
                reject("COL_CREATE", "Database not found: \(name)", nil)
                return
            }
            let colPtr = self.clib.createCollection(
                withHandle: dbPtr, name: collectionName, scopeName: scopeName
            )
            if colPtr == 0 {
                reject("COL_CREATE", "Failed to create collection '\(collectionName)'", nil)
                return
            }
            let key = self.collectionKey(name: name, scopeName: scopeName, collectionName: collectionName)
            self.collections[key] = (colPtr: colPtr, dbName: name)
            resolve([
                "name": collectionName,
                "scopeName": scopeName,
                "databaseName": name,
            ])
        }
    }

    /// Deletes a collection.
    /// ObjC selector: collectionDeleteWithCollectionName:name:scopeName:resolve:reject:
    public func collectionDelete(
        collectionName: String, name: String, scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let _ = self.databases[name] else {
                reject("COL_DELETE", "Database not found: \(name)", nil)
                return
            }
            // TODO: Add CBLDatabase_DeleteCollection to CbliteBenchmark.mm
            let key = self.collectionKey(name: name, scopeName: scopeName, collectionName: collectionName)
            self.collections.removeValue(forKey: key)
            resolve(nil)
        }
    }

    /// Document count for a collection.
    /// ObjC selector: collectionGetCountWithCollectionName:name:scopeName:resolve:reject:
    public func collectionGetCount(
        collectionName: String, name: String, scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let colPtr = self.resolveCollectionPtr(
                name: name, scopeName: scopeName, collectionName: collectionName
            ) else {
                reject("COL_COUNT", "Collection not found", nil)
                return
            }
            let count = self.clib.getDocumentCount(withCollectionHandle: colPtr)
            resolve(["count": count])
        }
    }

    // MARK: - Single Document CRUD

    /// Saves a document. Returns { _id, _revId, _sequence }.
    /// ObjC selector: collectionSaveWithDocument:blobs:id:name:scopeName:collectionName:concurrencyControl:resolve:reject:
    public func collectionSave(
        document: String, blobs: String, id: String,
        name: String, scopeName: String, collectionName: String,
        concurrencyControl: Int,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let colPtr = self.resolveCollectionPtr(
                name: name, scopeName: scopeName, collectionName: collectionName
            ) else {
                reject("DOC_SAVE", "Collection not found", nil)
                return
            }
            if let result = self.clib.saveDocument(
                withCollectionHandle: colPtr,
                documentId: id,
                jsonData: document
            ) {
                resolve(result)
            } else {
                reject("DOC_SAVE", "Failed to save document '\(id)'", nil)
            }
        }
    }

    /// Gets a document. Returns { _id, _data, _sequence, _revId } or null.
    /// ObjC selector: collectionGetDocumentWithDocId:name:scopeName:collectionName:resolve:reject:
    public func collectionGetDocument(
        docId: String, name: String, scopeName: String, collectionName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let colPtr = self.resolveCollectionPtr(
                name: name, scopeName: scopeName, collectionName: collectionName
            ) else {
                reject("DOC_GET", "Collection not found", nil)
                return
            }
            if let result = self.clib.getDocument(
                withCollectionHandle: colPtr, documentId: docId
            ) {
                resolve(result)
            } else {
                resolve(nil)  // Document not found
            }
        }
    }

    /// Deletes a document.
    /// ObjC selector: collectionDeleteDocumentWithDocId:name:scopeName:collectionName:concurrencyControl:resolve:reject:
    public func collectionDeleteDocument(
        docId: String, name: String, scopeName: String, collectionName: String,
        concurrencyControl: Int,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let colPtr = self.resolveCollectionPtr(
                name: name, scopeName: scopeName, collectionName: collectionName
            ) else {
                reject("DOC_DEL", "Collection not found", nil)
                return
            }
            let success = self.clib.deleteDocument(withCollectionHandle: colPtr, documentId: docId)
            if success {
                resolve(nil)
            } else {
                reject("DOC_DEL", "Failed to delete document: \(docId)", nil)
            }
        }
    }

    /// Purges a document.
    /// ObjC selector: collectionPurgeDocumentWithDocId:name:scopeName:collectionName:resolve:reject:
    public func collectionPurgeDocument(
        docId: String, name: String, scopeName: String, collectionName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let colPtr = self.resolveCollectionPtr(
                name: name, scopeName: scopeName, collectionName: collectionName
            ) else {
                reject("DOC_PURGE", "Collection not found", nil)
                return
            }
            let success = self.clib.purgeDocument(withCollectionHandle: colPtr, documentId: docId)
            if success {
                resolve(nil)
            } else {
                reject("DOC_PURGE", "Failed to purge document: \(docId)", nil)
            }
        }
    }

    // MARK: - Batch Operations

    /// Batch save using C transactions.
    /// ObjC selector: collectionBatchSaveWithName:scopeName:collectionName:docsJson:resolve:reject:
    public func collectionBatchSave(
        name: String, scopeName: String, collectionName: String, docsJson: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let colPtr = self.resolveCollectionPtr(
                name: name, scopeName: scopeName, collectionName: collectionName
            ) else {
                reject("BATCH_SAVE", "Collection not found", nil)
                return
            }
            guard let dbPtr = self.databases[name] else {
                reject("BATCH_SAVE", "Database not found: \(name)", nil)
                return
            }

            guard let jsonData = docsJson.data(using: .utf8),
                  let docsArray = try? JSONSerialization.jsonObject(with: jsonData) as? [[String: String]]
            else {
                reject("BATCH_SAVE", "Invalid docsJson format. Expected [{id:string, data:string}, ...]", nil)
                return
            }

            var saved = 0
            var failed = 0
            var errors: [String] = []
            let startTime = CFAbsoluteTimeGetCurrent()

            // Begin C transaction
            guard self.clib.beginTransaction(withHandle: dbPtr) else {
                reject("BATCH_SAVE", "Failed to begin transaction", nil)
                return
            }

            for docEntry in docsArray {
                guard let docId = docEntry["id"],
                      let docData = docEntry["data"] else {
                    failed += 1
                    errors.append("Missing id or data")
                    continue
                }
                if self.clib.saveDocument(
                    withCollectionHandle: colPtr,
                    documentId: docId,
                    jsonData: docData
                ) != nil {
                    saved += 1
                } else {
                    failed += 1
                    errors.append("\(docId): save failed")
                }
            }

            // End C transaction (commit)
            guard self.clib.endTransaction(withHandle: dbPtr, commit: true) else {
                reject("BATCH_SAVE", "Failed to commit transaction", nil)
                return
            }

            let timeMs = (CFAbsoluteTimeGetCurrent() - startTime) * 1000.0
            let result: NSDictionary = [
                "saved": saved,
                "failed": failed,
                "timeMs": timeMs,
                "errors": errors.joined(separator: "; "),
            ]
            resolve(result)
        }
    }

    /// Batch get. Returns JSON string array of { _id, _data, _revId, _sequence }.
    /// ObjC selector: collectionBatchGetWithName:scopeName:collectionName:docIdsJson:resolve:reject:
    public func collectionBatchGet(
        name: String, scopeName: String, collectionName: String, docIdsJson: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let colPtr = self.resolveCollectionPtr(
                name: name, scopeName: scopeName, collectionName: collectionName
            ) else {
                reject("BATCH_GET", "Collection not found", nil)
                return
            }
            guard let jsonData = docIdsJson.data(using: .utf8),
                  let docIds = try? JSONSerialization.jsonObject(with: jsonData) as? [String]
            else {
                reject("BATCH_GET", "Invalid docIdsJson format", nil)
                return
            }

            var results: [[String: Any]] = []
            for docId in docIds {
                if let docDict = self.clib.getDocument(
                    withCollectionHandle: colPtr, documentId: docId
                ) as? [String: Any] {
                    results.append(docDict)
                }
            }

            do {
                let resultData = try JSONSerialization.data(withJSONObject: results)
                resolve(String(data: resultData, encoding: .utf8) ?? "[]")
            } catch {
                reject("BATCH_GET", "JSON serialization failed", error)
            }
        }
    }

    /// Batch delete using C transactions.
    /// ObjC selector: collectionBatchDeleteWithName:scopeName:collectionName:docIdsJson:resolve:reject:
    public func collectionBatchDelete(
        name: String, scopeName: String, collectionName: String, docIdsJson: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let colPtr = self.resolveCollectionPtr(
                name: name, scopeName: scopeName, collectionName: collectionName
            ) else {
                reject("BATCH_DEL", "Collection not found", nil)
                return
            }
            guard let dbPtr = self.databases[name] else {
                reject("BATCH_DEL", "Database not found: \(name)", nil)
                return
            }
            guard let jsonData = docIdsJson.data(using: .utf8),
                  let docIds = try? JSONSerialization.jsonObject(with: jsonData) as? [String]
            else {
                reject("BATCH_DEL", "Invalid docIdsJson format", nil)
                return
            }

            let nativeStart = CFAbsoluteTimeGetCurrent()
            _ = self.clib.beginTransaction(withHandle: dbPtr)

            var deleted = 0
            var failed = 0
            for docId in docIds {
                let success = self.clib.deleteDocument(withCollectionHandle: colPtr, documentId: docId)
                if success { deleted += 1 } else { failed += 1 }
            }

            _ = self.clib.endTransaction(withHandle: dbPtr, commit: true)
            let nativeMs = (CFAbsoluteTimeGetCurrent() - nativeStart) * 1000.0

            resolve([
                "deleted": deleted,
                "failed": failed,
                "timeMs": nativeMs,
            ])
        }
    }

    // MARK: - Query

    /// Executes a SQL++ query.
    /// ObjC selector: queryExecuteWithQuery:parametersJson:name:resolve:reject:
    public func queryExecute(
        query queryString: String, parametersJson: String?, name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async {
            guard let dbPtr = self.databases[name] else {
                reject("QUERY", "Database not found: \(name)", nil)
                return
            }

            // Convert parameters dict to JSON string for the C wrapper
            var paramsJsonStr: String? = nil
            if let pJson = parametersJson {
                paramsJsonStr = pJson
            }

            guard let result = self.clib.executeQuery(withDatabaseHandle: dbPtr, query: queryString, parametersJson: paramsJsonStr) else {
                reject("QUERY", "Query execution failed", nil)
                return
            }
            resolve(result)
        }
    }

    // MARK: - Replicator

    /// Creates a replicator from a JSON config string.
    /// Config JSON format (same as CblSwiftAdapter):
    /// {
    ///   "databaseName": "myDB",
    ///   "endpoint": "wss://sync.example.com/mydb",
    ///   "username": "user@example.com",
    ///   "password": "secret",
    ///   "replicatorType": "push" | "pull" | "pushAndPull",
    ///   "continuous": false,
    ///   "collections": [{"scope": "_default", "name": "items"}]
    /// }
    /// Returns { replicatorId: string }.
    /// ObjC selector: replicatorCreateWithConfigJson:resolve:reject:
    public func replicatorCreate(
        configJson: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            // 1. Parse the config JSON
            guard let jsonData = configJson.data(using: .utf8),
                  let config = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any]
            else {
                reject("REPL_CREATE", "Invalid configJson", nil)
                return
            }

            // 2. Look up the database by name
            guard let dbName = config["databaseName"] as? String,
                  let dbPtr = self.databases[dbName]
            else {
                reject("REPL_CREATE", "Database not found in config", nil)
                return
            }

            // 3. Parse endpoint URL
            guard let endpointUrl = config["endpoint"] as? String, !endpointUrl.isEmpty else {
                reject("REPL_CREATE", "Invalid or missing endpoint URL", nil)
                return
            }

            // 4. Parse collections to replicate -- resolve to cached C pointers
            guard let colConfigs = config["collections"] as? [[String: String]] else {
                reject("REPL_CREATE", "Missing 'collections' array in config", nil)
                return
            }

            var collectionHandles: [NSNumber] = []
            for colConfig in colConfigs {
                guard let scopeName = colConfig["scope"],
                      let colName = colConfig["name"] else { continue }
                guard let colPtr = self.resolveCollectionPtr(
                    name: dbName, scopeName: scopeName, collectionName: colName
                ) else {
                    reject("REPL_CREATE", "Collection not found: \(scopeName).\(colName)", nil)
                    return
                }
                collectionHandles.append(NSNumber(value: colPtr))
            }

            if collectionHandles.isEmpty {
                reject("REPL_CREATE", "No valid collections resolved from config", nil)
                return
            }

            // 5. Parse replicator type: "push"=1, "pull"=2, "pushAndPull"=0 (default)
            let replTypeStr = config["replicatorType"] as? String ?? "pushAndPull"
            let replType: Int
            switch replTypeStr {
            case "push": replType = 1
            case "pull": replType = 2
            default:     replType = 0  // pushAndPull
            }

            // 6. Parse continuous mode
            let continuous = config["continuous"] as? Bool ?? false

            // 7. Parse authentication (optional)
            let username = config["username"] as? String
            let password = config["password"] as? String

            // 8. Create the replicator via CbliteBenchmark C wrapper
            let replPtr = self.clib.createReplicator(
                withDatabaseHandle: dbPtr,
                collectionHandles: collectionHandles,
                endpoint: endpointUrl,
                username: username,
                password: password,
                replicatorType: Int32(replType),
                continuous: continuous
            )

            if replPtr == 0 {
                reject("REPL_CREATE", "CBLReplicator_Create failed for endpoint '\(endpointUrl)'", nil)
                return
            }

            // 9. Store by UUID and return
            let replicatorId = UUID().uuidString
            self.replicators[replicatorId] = replPtr
            resolve(["replicatorId": replicatorId])
        }
    }

    /// Starts a replicator.
    /// ObjC selector: replicatorStartWithReplicatorId:resolve:reject:
    public func replicatorStart(
        replicatorId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async {
            guard let replPtr = self.replicators[replicatorId] else {
                reject("REPL_START", "Invalid replicatorId: \(replicatorId)", nil)
                return
            }
            let success = self.clib.startReplicator(withHandle: replPtr, resetCheckpoint: false)
            if success {
                resolve(nil)
            } else {
                reject("REPL_START", "Failed to start replicator", nil)
            }
        }
    }

    /// Stops a replicator.
    /// ObjC selector: replicatorStopWithReplicatorId:resolve:reject:
    public func replicatorStop(
        replicatorId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async {
            guard let replPtr = self.replicators[replicatorId] else {
                reject("REPL_STOP", "Invalid replicatorId: \(replicatorId)", nil)
                return
            }
            self.clib.stopReplicator(withHandle: replPtr)
            resolve(nil)
        }
    }

    /// Returns current replicator status.
    /// Returns the same shape as CblSwiftAdapter:
    /// { activity: number, progress: { completed: number, total: number }, error: string | null }
    /// activity: 0=stopped, 1=offline, 2=connecting, 3=idle, 4=busy
    /// ObjC selector: replicatorGetStatusWithReplicatorId:resolve:reject:
    public func replicatorGetStatus(
        replicatorId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async {
            guard let replPtr = self.replicators[replicatorId] else {
                reject("REPL_STATUS", "Invalid replicatorId: \(replicatorId)", nil)
                return
            }

            guard let statusDict = self.clib.getReplicatorStatus(withHandle: replPtr) as? [String: Any] else {
                reject("REPL_STATUS", "Failed to get replicator status", nil)
                return
            }

            // CbliteBenchmark returns: { activity, complete, documentCount, errorDomain, errorCode, errorMessage }
            // We need to convert to the spec format: { activity, progress: { completed, total }, error }
            let activity = statusDict["activity"] as? Int ?? -1
            let complete = statusDict["complete"] as? Float ?? 0.0
            let documentCount = statusDict["documentCount"] as? UInt64 ?? 0
            let errorCode = statusDict["errorCode"] as? Int ?? 0
            let errorMessage = statusDict["errorMessage"] as? String ?? ""

            // Build error string: null if no error, message string otherwise
            let errorValue: Any = errorCode != 0 ? errorMessage : NSNull()

            // Map C progress fields to spec format:
            // C API: complete (0.0-1.0 fraction), documentCount (number of docs transferred)
            // Spec: completed (number), total (number)
            // We use documentCount for both since the C API provides fractional completion separately
            let result: NSDictionary = [
                "activity": activity,
                "progress": [
                    "completed": documentCount,
                    "total": complete > 0 ? UInt64(Double(documentCount) / Double(complete)) : documentCount,
                ],
                "error": errorValue,
            ]
            resolve(result)
        }
    }

    /// Stops and removes a replicator. Releases the C handle.
    /// ObjC selector: replicatorCleanupWithReplicatorId:resolve:reject:
    public func replicatorCleanup(
        replicatorId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let replPtr = self.replicators[replicatorId] else {
                reject("REPL_CLEANUP", "Invalid replicatorId: \(replicatorId)", nil)
                return
            }
            // Stop + release via CbliteBenchmark
            self.clib.cleanupReplicator(withHandle: replPtr)
            self.replicators.removeValue(forKey: replicatorId)
            resolve(nil)
        }
    }
}
