import Foundation

@objc(
    CblReactnative
)
class CblReactnative: NSObject {
    
    // MARK: - Member Properties
    var databaseChangeListeners = [String: Any]()
    
    var collectionChangeListeners = [String: Any]()
    var collectionDocumentChangeListeners = [String: Any]()
    var queryChangeListeners = [String: Any]()
    
    var replicatorChangeListeners = [String: Any]()
    
    var queryCount: Int = 0
    var replicatorCount: Int = 0
    var allResultsChunkSize: Int = 256
    
    // Create a serial DispatchQueue for background tasks
    let backgroundQueue = DispatchQueue(label: "com.cblite.ionic.backgroundQueue")
    
    @objc(database_Open:withDirectory:withEncryptionKey: withResolver:withRejecter:)
    func database_Open(
        name: NSString,
        directory: NSString,
        encryptionKey: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let databaseName = String(name)
                // Check the database name
                let errorMessage = self.checkDatabaseName(name: databaseName)
                if !errorMessage.isEmpty {
                    reject("DATABASE_ERROR", errorMessage, nil)
                    return
                }
                let config: [String: String?] = [
                    "encryptionKey": String(encryptionKey),
                    "directory": String(directory)
                ]
                let hashConfig = AnyHashable(config)
                try DatabaseManager.shared.open(databaseName, databaseConfig: hashConfig as? [AnyHashable : Any])
                resolve(nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }
    
    @objc(database_Close:withResolver:withRejecter:)
    func database_Close(
        name: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let databaseName = String(name)
                // Check the database name
                let errorMessage = self.checkDatabaseName(name: databaseName)
                if !errorMessage.isEmpty {
                    reject("DATABASE_ERROR", errorMessage, nil)
                    return
                }
                try DatabaseManager.shared.close(databaseName)
                resolve(nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }
    
    @objc(database_Delete:withResolver:withRejecter:)
    func database_Delete(
        name: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let databaseName = String(name)
                // Check the database name
                let errorMessage = self.checkDatabaseName(name: databaseName)
                if !errorMessage.isEmpty {
                    reject("DATABASE_ERROR", errorMessage, nil)
                    return
                }
                try DatabaseManager.shared.delete(databaseName)
                resolve(nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }
    
    @objc(file_GetDefaultPath:rejecter:)
    func file_GetDefaultPath(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        let paths = NSSearchPathForDirectoriesInDomains(
            .applicationSupportDirectory,
            .userDomainMask,
            true
        )
        return resolve(
            paths.first ?? ""
        )
    }
    
    func checkDatabaseName(name: String) -> String {
        if (name.isEmpty){
            return "Error:  Database name must be provided"
        } else {
            return ""
        }
    }
    
}
