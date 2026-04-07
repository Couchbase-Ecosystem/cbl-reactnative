import Foundation
import CouchbaseLiteSwift

@objcMembers public class CblDatabaseModule: NSObject {

    private let backgroundQueue = CblNativeQueue.shared

    public func database_Open(
        name: String,
        directory: String?,
        encryptionKey: String?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(
            name: name as NSString, reject: reject
        )
        if isError { return }

        var config: [AnyHashable: Any] = [:]
        if let dir = directory, !dir.isEmpty, dir != "null", dir != "undefined" {
            config["directory"] = dir
        }
        if let key = encryptionKey, !key.isEmpty, key != "null", key != "undefined" {
            config["encryptionKey"] = key
        }

        backgroundQueue.async {
            do {
                let uniqueName = try DatabaseManager.shared.open(
                    databaseName, databaseConfig: config
                )
                resolve(["databaseUniqueName": uniqueName])
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func database_Close(
        name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(
            name: name as NSString, reject: reject
        )
        if isError { return }
        backgroundQueue.async {
            do {
                try DatabaseManager.shared.close(databaseName)
                resolve(nil)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func database_Delete(
        name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(
            name: name as NSString, reject: reject
        )
        if isError { return }
        backgroundQueue.async {
            do {
                try DatabaseManager.shared.delete(databaseName)
                resolve(nil)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func database_DeleteWithPath(
        path: String,
        name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isPathError, databasePath) = DataAdapter.shared.adaptNonEmptyString(
            value: path as NSString, propertyName: "path", reject: reject
        )
        let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(
            name: name as NSString, reject: reject
        )
        if isPathError || isError { return }
        backgroundQueue.async {
            do {
                try DatabaseManager.shared.delete(databasePath, databaseName: databaseName)
                resolve(nil)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func database_Copy(
        path: String,
        newName: String,
        directory: String?,
        encryptionKey: String?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(
            name: newName as NSString, reject: reject
        )
        let (isPathError, databasePath) = DataAdapter.shared.adaptNonEmptyString(
            value: path as NSString, propertyName: "path", reject: reject
        )
        if isError || isPathError { return }

        var config: [AnyHashable: Any] = [:]
        if let dir = directory, !dir.isEmpty, dir != "null", dir != "undefined" {
            config["directory"] = dir
        }
        if let key = encryptionKey, !key.isEmpty, key != "null", key != "undefined" {
            config["encryptionKey"] = key
        }

        backgroundQueue.async {
            do {
                try DatabaseManager.shared.copy(
                    databasePath, newName: databaseName, databaseConfig: config
                )
                resolve(nil)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func database_Exists(
        name: String,
        directory: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isNameError, databaseName) = DataAdapter.shared.adaptDatabaseName(
            name: name as NSString, reject: reject
        )
        let (isDirError, path) = DataAdapter.shared.adaptNonEmptyString(
            value: directory as NSString, propertyName: "directory", reject: reject
        )
        if isNameError || isDirError { return }
        backgroundQueue.async {
            let exists = DatabaseManager.shared.exists(databaseName, directoryPath: path)
            resolve(exists)
        }
    }

    public func database_GetPath(
        name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(
            name: name as NSString, reject: reject
        )
        if isError { return }
        backgroundQueue.async {
            do {
                guard let path = try DatabaseManager.shared.getPath(databaseName) else {
                    reject("DATABASE_ERROR",
                           "Unable to get path for database \(databaseName)", nil)
                    return
                }
                resolve(path)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func database_PerformMaintenance(
        maintenanceType: Double,
        databaseName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let mType = DataAdapter.shared.adaptMaintenanceTypeFromInt(intValue: Int(maintenanceType))
        backgroundQueue.async {
            do {
                try DatabaseManager.shared.performMaintenance(
                    databaseName, maintenanceType: mType
                )
                resolve(nil)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func database_ChangeEncryptionKey(
        newKey: String,
        name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(
            name: name as NSString, reject: reject
        )
        if isError { return }
        let keyToUse = newKey.isEmpty ? nil : newKey
        backgroundQueue.async {
            do {
                try DatabaseManager.shared.changeEncryptionKey(databaseName, newKey: keyToUse)
                resolve(nil)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }
}
