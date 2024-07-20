import Foundation
import CouchbaseLiteSwift

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
    
    // MARK: - Database Functions
    
    @objc(database_ChangeEncryptionKey:withNewKey:withResolver:withRejecter:)
    func database_ChangeEncryptionKey(
        name: NSString,
        newKey: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        do {
            let (isError, databaseName) = self.parseDatabaseName(name: name, reject: reject)
            if isError {
                return
            }
            
            let encryptionKey = String(newKey)
            let errorMessageEncryptionKey = self.checkStringValue(value: encryptionKey, propertyName: "Encryption Key")
            if !errorMessageEncryptionKey.isEmpty {
                reject("DATABASE_ERROR", errorMessageEncryptionKey, nil)
            }
            
            try DatabaseManager.shared.changeEncryptionKey(databaseName, newKey: encryptionKey)
            resolve(nil)
        } catch let error as NSError {
            reject("DATABASE_ERROR", error.localizedDescription, nil)
        } catch {
            reject("DATABASE_ERROR", error.localizedDescription, nil)
        }
    }
    
    @objc(database_Copy:withNewName:withDirectory:withEncryptionKey: withResolver:withRejecter:)
    func database_Copy(
        path: NSString,
        newName: NSString,
        directory: NSString,
        encryptionKey: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        do {
            //get databaseName parsed
            let (isError, databaseName) = self.parseDatabaseName(name: newName, reject: reject)
            if isError {
                return
            }
            
            //get path parsed
            let (isErrorPath, databasePath) =
            self.parseNonEmptyString(value: path, propertyName: "path", reject: reject)
            if isErrorPath {
                return
            }
            
            //create config to pass in
            let config: [String: String?] = [
                "encryptionKey": String(encryptionKey),
                "directory": String(directory)
            ]
            let hashConfig = AnyHashable(config)
            
            try DatabaseManager.shared.copy(databasePath, newName: databaseName, databaseConfig: hashConfig as? [AnyHashable : Any])
            resolve(nil)
        } catch let error as NSError {
            reject("DATABASE_ERROR", error.localizedDescription, nil)
        } catch {
            reject("DATABASE_ERROR", error.localizedDescription, nil)
        }
    }
    
    @objc(database_Close:withResolver:withRejecter:)
    func database_Close(
        name: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        do {
            let (isError, databaseName) = self.parseDatabaseName(name: name, reject: reject)
            if isError {
                return
            }
            try DatabaseManager.shared.close(databaseName)
            resolve(nil)
        } catch let error as NSError {
            reject("DATABASE_ERROR", error.localizedDescription, nil)
        } catch {
            reject("DATABASE_ERROR", error.localizedDescription, nil)
        }
    }
    
    @objc(database_Delete:withResolver:withRejecter:)
    func database_Delete(
        name: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        do {
            let (isError, databaseName) = self.parseDatabaseName(name: name, reject: reject)
            if isError {
                return
            }
            try DatabaseManager.shared.delete(databaseName)
            resolve(nil)
        } catch let error as NSError {
            reject("DATABASE_ERROR", error.localizedDescription, nil)
        }
        catch {
            reject("DATABASE_ERROR", error.localizedDescription, nil)
        }
    }
    
    @objc(database_DeleteWithPath:withName:withResolver:withRejecter:)
    func database_DeleteWithpath(
        path: NSString,
        name: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        do {
            //get path parsed
            let (isErrorPath, databasePath) =
            self.parseNonEmptyString(value: path, propertyName: "path", reject: reject)
            if isErrorPath {
                return
            }
            let (isError, databaseName) = self.parseDatabaseName(name: name, reject: reject)
            if isError {
                return
            }
            try DatabaseManager.shared.delete(databaseName)
            resolve(nil)
        } catch let error as NSError {
            reject("DATABASE_ERROR", error.localizedDescription, nil)
        }
        catch {
            reject("DATABASE_ERROR", error.localizedDescription, nil)
        }
    }
    
    @objc(database_Open:withDirectory:withEncryptionKey: withResolver:withRejecter:)
    func database_Open(
        name: NSString,
        directory: NSString,
        encryptionKey: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        do {
            let (isError, databaseName) = self.parseDatabaseName(name: name, reject: reject)
            if isError {
                return
            }
            let config: [String: String?] = [
                "encryptionKey": String(encryptionKey),
                "directory": String(directory)
            ]
            let hashConfig = AnyHashable(config)
            try DatabaseManager.shared.open(databaseName, databaseConfig: hashConfig as? [AnyHashable : Any])
            resolve(nil)
        } catch let error as NSError {
            reject("DATABASE_ERROR", error.localizedDescription, nil)
        } catch {
            reject("DATABASE_ERROR", error.localizedDescription, nil)
        }
    }
    
    @objc(database_PerformMaintenance:forDatabase:withResolver:withRejecter:)
    func database_PerformMaintenance(maintenanceType: NSNumber, databaseName: NSString, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            let intMaintenanceType: Int = maintenanceType.intValue
            let strDatabaseName: String = String(databaseName)
            let mType = getMaintenanceTypeFromInt(intValue: intMaintenanceType)
            try DatabaseManager.shared.performMaintenance(strDatabaseName, maintenanceType: mType)
            resolve(nil)
            
        } catch let error as NSError {
            reject("DATABASE_ERROR", error.localizedDescription, nil)
        }
        catch {
            reject("DATABASE_ERROR", error.localizedDescription, nil)
        }
    }
    
    @objc(database_SetLogLevel:withLogLevel:withResolver:withRejecter:)
    func database_SetLogLevel(domain: NSString, logLevel: NSNumber, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            let intLogLevel: Int = logLevel.intValue
            let strDomain: String = String(domain)
            try LoggingManager.shared.setLogLevel(strDomain, logLevel: intLogLevel)
            resolve(nil)
            
        } catch let error as NSError {
            reject("DATABASE_ERROR", error.localizedDescription, nil)
        }
        catch {
            reject("DATABASE_ERROR", error.localizedDescription, nil)
        }
    }
    
    // MARK: - File System Functions
    
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
    
    // MARK: - Helper Functions
    
    func getMaintenanceTypeFromInt(intValue: Int) -> MaintenanceType {
        switch intValue {
            case 0:
                return .compact
            case 1:
                return .reindex
            case 2:
                return .integrityCheck
            case 3:
                return .optimize
            case 4:
                return .fullOptimize
            default:
                return .fullOptimize
        }
        
    }
    
    func parseDatabaseName(name:NSString, reject: @escaping RCTPromiseRejectBlock) -> (Bool,String){
        var isError = false
        let databaseName = String(name)
        // Check the database name
        let errorMessageDatabaseName = self.checkStringValue(value: databaseName, propertyName: "Database Name")
        if !errorMessageDatabaseName.isEmpty {
            isError = true
            reject("DATABASE_ERROR", errorMessageDatabaseName, nil)
        }
        return (isError, databaseName)
    }
    
    func parseNonEmptyString(value: NSString, propertyName: String, reject: @escaping RCTPromiseRejectBlock) -> (Bool, String) {
        var isError = false
        let strValue = String(value)
        // Check the value to make sure it's not empty
        let errorMessage = self.checkStringValue(value: strValue, propertyName: propertyName)
        if !errorMessage.isEmpty {
            isError = true
            reject("ERROR", errorMessage, nil)
        }
        return (isError, strValue)
    }
    
    func checkStringValue(value: String, propertyName: String) -> String {
        if (value.isEmpty){
            return "Error:  \(propertyName) must be provided"
        } else {
            return ""
        }
    }
    
}
