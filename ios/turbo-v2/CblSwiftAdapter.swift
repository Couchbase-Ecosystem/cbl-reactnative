import Foundation
import UIKit
import CouchbaseLiteSwift

// MARK: - Error Types

enum CblSwiftError: Error, LocalizedError {
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
public class CblSwiftAdapter: NSObject {

    // Thread-safe storage (concurrent reads, barrier writes)
    private let queue = DispatchQueue(label: "com.cbl.swift.adapter", attributes: .concurrent)

    // Keyed by `name` (= databaseUniqueName)
    // Example: ["myDatabase": <Database>, "travel-sample": <Database>]
    private var databases: [String: Database] = [:]

    // Keyed by "name::scopeName::collectionName" -- cached after first resolution
    // Example: ["myDatabase::_default::items": <Collection>, "travel-sample::inventory::hotels": <Collection>]
    private var collections: [String: Collection] = [:]

    // Keyed by replicatorId (UUID string)
    // Example: ["550e8400-e29b-41d4-a716-446655440000": <Replicator>]
    private var replicators: [String: Replicator] = [:]

    // MARK: - Key Helpers

    /// Build collection cache key from the triple that JS always sends
    /// Example: collectionKey("myDB", "_default", "items") → "myDB::_default::items"
    private func collectionKey(name: String, scopeName: String, collectionName: String) -> String {
        return "\(name)::\(scopeName)::\(collectionName)"
    }

    /// Read a database by name.
    /// IMPORTANT: Must be called from within the dispatch queue (queue.async or queue.async(flags: .barrier)).
    private func getDatabase(_ name: String) -> Database? {
        return databases[name]
    }

    /// Resolve-or-cache for a collection.
    /// The caller always sends (name, scopeName, collectionName).
    /// We look up the cached Collection, or resolve it from the Database.
    /// IMPORTANT: Must be called from within the dispatch queue.
    private func resolveCollection(
        name: String, scopeName: String, collectionName: String
    ) -> Collection? {
        let key = collectionKey(name: name, scopeName: scopeName, collectionName: collectionName)

        // Fast path: already cached
        if let cached = collections[key] {
            return cached
        }

        // Slow path: resolve from database
        guard let db = databases[name] else { return nil }
        guard let col = try? db.collection(name: collectionName, scope: scopeName) else {
            return nil
        }

        // Cache it directly (we're already on the queue)
        collections[key] = col
        return col
    }

    /// Read a replicator.
    /// IMPORTANT: Must be called from within the dispatch queue.
    private func getReplicator(_ replicatorId: String) -> Replicator? {
        return replicators[replicatorId]
    }

    // MARK: - Database Operations

    /// Opens (or creates) a database. Returns { databaseUniqueName }.
    /// The `name` parameter IS the databaseUniqueName -- it becomes the key.
    /// Example: databaseOpen(name: "myDatabase", directory: "/path/to/db", encryptionKey: "secret123")
    public func databaseOpen(
        name: String, directory: String?, encryptionKey: String?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        // Disable idle timer (screen auto-lock) whenever a database is opened.
        // This prevents iOS from locking the screen during long benchmark runs.
        // Must be called on main thread (UIKit requirement).
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = true
            NSLog("[CblSwiftAdapter] databaseOpen: isIdleTimerDisabled = true (screen will stay on)")
        }

        queue.async(flags: .barrier) {
            do {
                var config = DatabaseConfiguration()
                if let dir = directory, !dir.isEmpty {
                    config.directory = dir
                }
                if let key = encryptionKey, !key.isEmpty {
                    config.encryptionKey = EncryptionKey.password(key)
                }

                let db = try Database(name: name, config: config)
                self.databases[name] = db
                // Return the same name back -- JS uses it as the key
                resolve(["databaseUniqueName": name])
            } catch {
                reject("DB_OPEN", error.localizedDescription, error)
            }
        }
    }

    /// Closes a database by name.
    public func databaseClose(
        name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let db = self.databases[name] else {
                reject("DB_CLOSE", "Database not found: \(name)", nil)
                return
            }
            do {
                try db.close()
                self.databases.removeValue(forKey: name)
                // Purge cached collections for this database
                self.collections = self.collections.filter { !$0.key.hasPrefix("\(name)::") }

                // Re-enable idle timer if no databases are left open
                if self.databases.isEmpty {
                    DispatchQueue.main.async {
                        UIApplication.shared.isIdleTimerDisabled = false
                        NSLog("[CblSwiftAdapter] databaseClose: All databases closed, isIdleTimerDisabled = false")
                    }
                }

                resolve(nil)
            } catch {
                reject("DB_CLOSE", error.localizedDescription, error)
            }
        }
    }

    /// Deletes an open database by name. Mirrors database_Delete(args: DatabaseArgs).
    /// Looks up the database by name, calls db.delete(), and removes from cache.
    public func databaseDelete(
        name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let db = self.databases[name] else {
                reject("DB_DELETE", "Database not found: \(name)", nil)
                return
            }
            do {
                try db.delete()
                self.databases.removeValue(forKey: name)
                // Purge cached collections for this database
                self.collections = self.collections.filter { !$0.key.hasPrefix("\(name)::") }
                resolve(nil)
            } catch {
                reject("DB_DELETE", error.localizedDescription, error)
            }
        }
    }

    /// Deletes a database file by path (static, db must be closed).
    /// Mirrors database_DeleteWithPath(args: DatabaseExistsArgs = { databaseName, directory }).
    public func databaseDeleteWithPath(
        databaseName: String, directory: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            do {
                try Database.delete(withName: databaseName, inDirectory: directory)
                resolve(nil)
            } catch {
                reject("DB_DELETE_PATH", error.localizedDescription, error)
            }
        }
    }

    /// Returns filesystem path of an open database.
    /// Mirrors database_GetPath(args: DatabaseArgs) -> { path: string }.
    public func databaseGetPath(
        name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async {
            guard let db = self.databases[name] else {
                reject("DB_PATH", "Database not found: \(name)", nil)
                return
            }
            resolve(["path": db.path ?? ""])
        }
    }

    /// Checks if a database file exists at the given path.
    /// Mirrors database_Exists(args: DatabaseExistsArgs = { databaseName, directory }).
    public func databaseExists(
        databaseName: String, directory: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async {
            let exists = Database.exists(withName: databaseName, inDirectory: directory)
            resolve(["exists": exists])
        }
    }

    // MARK: - Collection Operations

    /// Creates (or returns existing) a collection.
    /// Mirrors CollectionArgs: { name, scopeName, collectionName }.
    public func collectionCreate(
        collectionName: String, name: String, scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let db = self.databases[name] else {
                reject("COL_CREATE", "Database not found: \(name)", nil)
                return
            }
            do {
                let collection = try db.createCollection(
                    name: collectionName, scope: scopeName
                )
                // Cache it
                let key = self.collectionKey(name: name, scopeName: scopeName, collectionName: collectionName)
                self.collections[key] = collection
                resolve([
                    "name": collectionName,
                    "scopeName": scopeName,
                    "databaseName": name,
                ])
            } catch {
                reject("COL_CREATE", error.localizedDescription, error)
            }
        }
    }

    /// Deletes a collection. Mirrors CollectionArgs.
    public func collectionDelete(
        collectionName: String, name: String, scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let db = self.databases[name] else {
                reject("COL_DELETE", "Database not found: \(name)", nil)
                return
            }
            do {
                try db.deleteCollection(name: collectionName, scope: scopeName)
                // Remove from cache
                let key = self.collectionKey(name: name, scopeName: scopeName, collectionName: collectionName)
                self.collections.removeValue(forKey: key)
                resolve(nil)
            } catch {
                reject("COL_DELETE", error.localizedDescription, error)
            }
        }
    }

    /// Document count for a collection. Async to match Promise<> spec.
    public func collectionGetCount(
        collectionName: String, name: String, scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let col = self.resolveCollection(
                name: name, scopeName: scopeName, collectionName: collectionName
            ) else {
                reject("COL_COUNT", "Collection not found", nil)
                return
            }
            resolve(["count": col.count])
        }
    }

    // MARK: - Single Document CRUD

    /// Saves a document. Returns { _id, _revId, _sequence }.
    /// Params match CollectionSaveStringArgs: document, blobs, id, name, scopeName, collectionName, concurrencyControl
    /// Example: collectionSave(document: "{\"name\":\"John\",\"age\":30}", blobs: "", id: "user::123", 
    ///                          name: "myDB", scopeName: "_default", collectionName: "users", concurrencyControl: 0)
    public func collectionSave(
        document: String, blobs: String, id: String,
        name: String, scopeName: String, collectionName: String,
        concurrencyControl: Int,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let col = self.resolveCollection(
                name: name, scopeName: scopeName, collectionName: collectionName
            ) else {
                reject("DOC_SAVE", "Collection not found", nil)
                return
            }
            do {
                let mutableDoc: MutableDocument
                if id.isEmpty {
                    mutableDoc = try MutableDocument(json: document)
                } else {
                    mutableDoc = try MutableDocument(id: id, json: document)
                }

                // TODO: handle blobs if needed (for perf tests, blobs is typically "")

                // Concurrency Control:
                // -9999 = No CC specified (default behavior)
                // 0 = Last Write Wins (.lastWriteWins)
                // 1 = Fail On Conflict (.failOnConflict)
                if concurrencyControl == -9999 {
                    // No concurrency control specified
                    try col.save(document: mutableDoc)
                } else {
                    let cc: ConcurrencyControl = concurrencyControl == 0
                        ? .lastWriteWins : .failOnConflict
                    _ = try col.save(document: mutableDoc, concurrencyControl: cc)
                }

                // Return format matches CollectionDocumentSaveResult
                // Example: { _id: "user::123", _revId: "1-abc123def456", _sequence: 42 }
                let result: NSDictionary = [
                    "_id": mutableDoc.id,
                    "_revId": mutableDoc.revisionID ?? "",
                    "_sequence": mutableDoc.sequence,
                ]
                resolve(result)
            } catch {
                reject("DOC_SAVE", error.localizedDescription, error)
            }
        }
    }

    /// Gets a document. Returns { _id, _data, _sequence, _revId } or null.
    /// Key name `_revId` matches existing Collection.ts line 857: `docJson._revId`
    public func collectionGetDocument(
        docId: String, name: String, scopeName: String, collectionName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let col = self.resolveCollection(
                name: name, scopeName: scopeName, collectionName: collectionName
            ) else {
                reject("DOC_GET", "Collection not found", nil)
                return
            }
            do {
                guard let doc = try col.document(id: docId) else {
                    resolve(nil)  // Document not found
                    return
                }
                // Example result: { _id: "user::123", _data: "{\"name\":\"John\",\"age\":30}", 
                //                   _sequence: 42, _revId: "1-abc123" }
                let result: NSDictionary = [
                    "_id": doc.id,
                    "_data": doc.toJSON(),
                    "_sequence": doc.sequence,
                    "_revId": doc.revisionID ?? "",
                ]
                resolve(result)
            } catch {
                reject("DOC_GET", error.localizedDescription, error)
            }
        }
    }

    /// Deletes a document.
    public func collectionDeleteDocument(
        docId: String, name: String, scopeName: String, collectionName: String,
        concurrencyControl: Int,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let col = self.resolveCollection(
                name: name, scopeName: scopeName, collectionName: collectionName
            ) else {
                reject("DOC_DEL", "Collection not found", nil)
                return
            }
            do {
                guard let doc = try col.document(id: docId) else {
                    reject("DOC_DEL", "Document not found: \(docId)", nil)
                    return
                }
                // Concurrency Control:
                // -9999 = No CC specified (default behavior)
                // 0 = Last Write Wins (.lastWriteWins)
                // 1 = Fail On Conflict (.failOnConflict)
                if concurrencyControl == -9999 {
                    try col.delete(document: doc)
                } else {
                    let cc: ConcurrencyControl = concurrencyControl == 0
                        ? .lastWriteWins : .failOnConflict
                    _ = try col.delete(document: doc, concurrencyControl: cc)
                }
                resolve(nil)
            } catch {
                reject("DOC_DEL", error.localizedDescription, error)
            }
        }
    }

    /// Purges a document.
    /// Matches CollectionManager.purgeDocument(_ documentId:, collectionName:, scopeName:, databaseName:)
    public func collectionPurgeDocument(
        docId: String, name: String, scopeName: String, collectionName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let col = self.resolveCollection(
                name: name, scopeName: scopeName, collectionName: collectionName
            ) else {
                reject("DOC_PURGE", "Collection not found", nil)
                return
            }
            do {
                guard let doc = try col.document(id: docId) else {
                    reject("DOC_PURGE", "Document not found: \(docId)", nil)
                    return
                }
                try col.purge(document: doc)
                resolve(nil)
            } catch {
                reject("DOC_PURGE", error.localizedDescription, error)
            }
        }
    }

    // MARK: - Batch Operations

    /// Batch save using database.inBatch(using:) for optimal write performance.
    /// Receives ALL documents in ONE call as a JSON array, iterates natively.
    /// Takes the standard triple (name, scopeName, collectionName) -- NOT a handle.
    /// Example docsJson: "[{\"id\":\"doc1\",\"data\":\"{\\\"name\\\":\\\"Alice\\\"}\"},{\"id\":\"doc2\",\"data\":\"{\\\"name\\\":\\\"Bob\\\"}\"}]"
    public func collectionBatchSave(
        name: String, scopeName: String, collectionName: String, docsJson: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let col = self.resolveCollection(
                name: name, scopeName: scopeName, collectionName: collectionName
            ) else {
                reject("BATCH_SAVE", "Collection not found", nil)
                return
            }
            guard let db = self.databases[name] else {
                reject("BATCH_SAVE", "Database not found: \(name)", nil)
                return
            }

            // Parse the JSON array of documents
            // Expected format: [{"id": "doc1", "data": "{\"field\":\"value\"}"}, {"id": "doc2", "data": "..."}]
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

            do {
                // inBatch: all writes share a single SQLite transaction
                try db.inBatch {
                    for docEntry in docsArray {
                        guard let docId = docEntry["id"],
                              let docData = docEntry["data"] else {
                            failed += 1
                            errors.append("Missing id or data field")
                            continue
                        }
                        do {
                            let mutableDoc = try MutableDocument(id: docId, json: docData)
                            try col.save(document: mutableDoc)
                            saved += 1
                        } catch {
                            failed += 1
                            errors.append("\(docId): \(error.localizedDescription)")
                        }
                    }
                }
            } catch {
                reject("BATCH_SAVE", "inBatch failed: \(error.localizedDescription)", error)
                return
            }

            let timeMs = (CFAbsoluteTimeGetCurrent() - startTime) * 1000.0
            // Example result: { saved: 99850, failed: 150, timeMs: 2345.67, errors: "doc5: conflict; doc23: invalid json" }
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
    /// Example docIdsJson: "[\"doc1\", \"doc2\", \"doc3\"]"
    /// Returns: "[{\"_id\":\"doc1\",\"_data\":{\"name\":\"Alice\"},\"_revId\":\"1-abc\",\"_sequence\":1}, ...]"
    public func collectionBatchGet(
        name: String, scopeName: String, collectionName: String, docIdsJson: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let col = self.resolveCollection(
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
                do {
                    if let doc = try col.document(id: docId) {
                        results.append([
                            "_id": doc.id,
                            "_data": doc.toJSON(),
                            "_revId": doc.revisionID ?? "",
                            "_sequence": doc.sequence,
                        ])
                    }
                } catch {
                    // Skip failed reads
                }
            }

            do {
                let resultData = try JSONSerialization.data(withJSONObject: results)
                let resultString = String(data: resultData, encoding: .utf8) ?? "[]"
                resolve(resultString)
            } catch {
                reject("BATCH_GET", "JSON serialization failed", error)
            }
        }
    }

    /// Batch delete using inBatch.
    /// Example docIdsJson: "[\"doc1\", \"doc2\", \"doc3\", \"doc4\", \"doc5\"]"
    /// Returns: { deleted: 4, failed: 1, timeMs: 125.5 }
    public func collectionBatchDelete(
        name: String, scopeName: String, collectionName: String, docIdsJson: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let col = self.resolveCollection(
                name: name, scopeName: scopeName, collectionName: collectionName
            ) else {
                reject("BATCH_DEL", "Collection not found", nil)
                return
            }
            guard let db = self.databases[name] else {
                reject("BATCH_DEL", "Database not found: \(name)", nil)
                return
            }
            guard let jsonData = docIdsJson.data(using: .utf8),
                  let docIds = try? JSONSerialization.jsonObject(with: jsonData) as? [String]
            else {
                reject("BATCH_DEL", "Invalid docIdsJson format", nil)
                return
            }

            var deleted = 0
            var failed = 0
            let startTime = CFAbsoluteTimeGetCurrent()

            do {
                try db.inBatch {
                    for docId in docIds {
                        do {
                            if let doc = try col.document(id: docId) {
                                try col.delete(document: doc)
                                deleted += 1
                            } else {
                                failed += 1
                            }
                        } catch {
                            failed += 1
                        }
                    }
                }
            } catch {
                reject("BATCH_DEL", "inBatch failed: \(error.localizedDescription)", error)
                return
            }

            let timeMs = (CFAbsoluteTimeGetCurrent() - startTime) * 1000.0
            let result: NSDictionary = [
                "deleted": deleted,
                "failed": failed,
                "timeMs": timeMs,
            ]
            resolve(result)
        }
    }

    // MARK: - Query

    /// Executes a SQL++ query. Takes (query, parametersJson, name) matching QueryExecuteArgs.
    /// Example queryString: "SELECT * FROM items WHERE price > $minPrice"
    /// Example parametersJson: "{\"minPrice\": 100}"
    /// Returns: "[{\"id\":\"item1\",\"price\":150}, {\"id\":\"item2\",\"price\":200}]"
    public func queryExecute(
        query queryString: String, parametersJson: String?, name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async {
            guard let db = self.databases[name] else {
                reject("QUERY", "Database not found: \(name)", nil)
                return
            }
            do {
                let query = try db.createQuery(queryString)

                // Parse parameters if provided
                if let paramsJson = parametersJson, !paramsJson.isEmpty,
                   let paramsData = paramsJson.data(using: .utf8),
                   let paramsDict = try? JSONSerialization.jsonObject(with: paramsData) as? [String: Any]
                {
                    let params = Parameters()
                    for (key, value) in paramsDict {
                        params.setValue(value, forName: key)
                    }
                    query.parameters = params
                }

                let results = try query.execute()
                let resultJSONs = results.map { $0.toJSON() }
                let jsonArray = "[" + resultJSONs.joined(separator: ",") + "]"
                resolve(jsonArray)
            } catch {
                reject("QUERY", error.localizedDescription, error)
            }
        }
    }

    // MARK: - Replicator

    /// Creates a replicator. configJson includes: endpoint, username, password,
    /// replicatorType, continuous, collections [{scope, name}], and databaseName.
    /// Returns { replicatorId }.
    /// Example configJson: 
    /// "{\"databaseName\":\"myDB\",\"endpoint\":\"wss://sync.example.com/mydb\",
    ///   \"username\":\"user@example.com\",\"password\":\"secret\",
    ///   \"replicatorType\":\"pushAndPull\",\"continuous\":true,
    ///   \"collections\":[{\"scope\":\"_default\",\"name\":\"items\"}]}"
    public func replicatorCreate(
        configJson: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let jsonData = configJson.data(using: .utf8),
                  let config = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any]
            else {
                reject("REPL_CREATE", "Invalid configJson", nil)
                return
            }

            // The databaseName is in the config (matches existing pattern)
            guard let dbName = config["databaseName"] as? String,
                  let db = self.databases[dbName]
            else {
                reject("REPL_CREATE", "Database not found in config", nil)
                return
            }

            // Parse endpoint
            guard let endpointUrl = config["endpoint"] as? String,
                  let url = URL(string: endpointUrl),
                  let endpoint = URLEndpoint(url: url) as URLEndpoint?
            else {
                reject("REPL_CREATE", "Invalid endpoint URL", nil)
                return
            }

            // Parse collections to replicate
            guard let colConfigs = config["collections"] as? [[String: String]] else {
                reject("REPL_CREATE", "Missing 'collections' array", nil)
                return
            }

            var collectionsToSync: [Collection] = []
            for colConfig in colConfigs {
                guard let scopeName = colConfig["scope"],
                      let colName = colConfig["name"] else { continue }
                do {
                    if let col = try db.collection(name: colName, scope: scopeName) {
                        collectionsToSync.append(col)
                    }
                } catch {
                    reject("REPL_CREATE", "Collection not found: \(colName)", error)
                    return
                }
            }

            // Build replicator config
            var replConfig = ReplicatorConfiguration(target: endpoint)
            let colConfig = CollectionConfiguration()
            replConfig.addCollections(collectionsToSync, config: colConfig)

            // Replicator type: "push", "pull", or "pushAndPull" (default)
            let replTypeStr = config["replicatorType"] as? String ?? "pushAndPull"
            switch replTypeStr {
            case "push": replConfig.replicatorType = .push        // Upload only
            case "pull": replConfig.replicatorType = .pull        // Download only
            default: replConfig.replicatorType = .pushAndPull     // Bidirectional sync
            }

            // Continuous
            replConfig.continuous = config["continuous"] as? Bool ?? false

            // Authentication
            if let username = config["username"] as? String,
               let password = config["password"] as? String
            {
                replConfig.authenticator = BasicAuthenticator(
                    username: username, password: password
                )
            }

            let replicator = Replicator(config: replConfig)
            let replicatorId = UUID().uuidString  // Example: "550e8400-e29b-41d4-a716-446655440000"
            self.replicators[replicatorId] = replicator
            resolve(["replicatorId": replicatorId])
        }
    }

    /// Starts a replicator.
    public func replicatorStart(
        replicatorId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async {
            guard let repl = self.replicators[replicatorId] else {
                reject("REPL_START", "Invalid replicatorId: \(replicatorId)", nil)
                return
            }
            repl.start()
            resolve(nil)
        }
    }

    /// Stops a replicator.
    public func replicatorStop(
        replicatorId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async {
            guard let repl = self.replicators[replicatorId] else {
                reject("REPL_STOP", "Invalid replicatorId: \(replicatorId)", nil)
                return
            }
            repl.stop()
            resolve(nil)
        }
    }

    /// Returns current replicator status. Async Promise<>.
    public func replicatorGetStatus(
        replicatorId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async {
            guard let repl = self.replicators[replicatorId] else {
                reject("REPL_STATUS", "Invalid replicatorId: \(replicatorId)", nil)
                return
            }
            let status = repl.status
            let errorMsg: String? = status.error?.localizedDescription
            // Example result: { activity: 2, progress: { completed: 450, total: 1000 }, error: null }
            // activity: 0=stopped, 1=offline, 2=connecting, 3=idle, 4=busy
            let result: NSDictionary = [
                "activity": status.activity.rawValue,
                "progress": [
                    "completed": status.progress.completed,
                    "total": status.progress.total,
                ],
                "error": errorMsg ?? NSNull(),
            ]
            resolve(result)
        }
    }

    /// Stops and removes a replicator.
    public func replicatorCleanup(
        replicatorId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async(flags: .barrier) {
            guard let repl = self.replicators[replicatorId] else {
                reject("REPL_CLEANUP", "Invalid replicatorId: \(replicatorId)", nil)
                return
            }
            repl.stop()
            self.replicators.removeValue(forKey: replicatorId)
            resolve(nil)
        }
    }

    // MARK: - Screen / Idle Timer Control

    /// Disables the iOS idle timer to prevent the screen from locking.
    /// Must be called on the main thread (UIKit requirement).
    /// Call with enabled=true to keep screen awake, enabled=false to restore auto-lock.
    public func setKeepScreenAwake(
        enabled: Bool,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = enabled
            let state = UIApplication.shared.isIdleTimerDisabled
            NSLog("[CblSwiftAdapter] isIdleTimerDisabled set to %@, confirmed: %@",
                  enabled ? "true" : "false",
                  state ? "true" : "false")
            resolve(["keepAwake": state])
        }
    }
}