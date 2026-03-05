import Foundation
import CouchbaseLiteSwift
import React

/**
 * Turbo Module implementation for Couchbase Lite Database operations
 * 
 * This module handles:
 * - Opening databases with encryption
 * - Closing databases
 * - Getting database paths
 * 
 * IMPORTANT: This class conforms to RCTTurboModule to enable JSI-based
 * communication for better performance compared to the legacy bridge.
 */
@objc(CouchbaseLiteDatabase)
class CouchbaseLiteDatabase: NSObject {
    
    private let backgroundQueue = DispatchQueue(label: "com.cblite.database.turbo")
    
    /**
     * Opens a database with optional directory and encryption
     */
    @objc
    func database_Open(
        _ name: String,
        directory: String?,
        encryptionKey: String?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name as NSString, reject: reject)
        if isError {
            return
        }
        
        backgroundQueue.async {
            do {
                var config: [AnyHashable: Any] = [:]
                
                if let dir = directory, !dir.isEmpty {
                    config["directory"] = dir
                }
                
                if let key = encryptionKey, !key.isEmpty {
                    config["encryptionKey"] = key
                }
                
                let databaseUniqueName = try DatabaseManager.shared.open(databaseName, databaseConfig: config)
                
                let resultDict: [String: Any] = ["databaseUniqueName": databaseUniqueName]
                resolve(resultDict)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }
    
    /**
     * Closes an open database
     */
    @objc
    func database_Close(
        _ name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name as NSString, reject: reject)
        if isError {
            return
        }
        
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
    
    /**
     * Gets the file path of a database
     */
    @objc
    func database_GetPath(
        _ name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name as NSString, reject: reject)
        if isError {
            return
        }
        
        backgroundQueue.async {
            do {
                let path = try DatabaseManager.shared.getPath(databaseName)
                
                if let result = path as? NSString {
                    resolve(result)
                } else {
                    reject("DATABASE_ERROR", "Unable to get path for database \(databaseName)", nil)
                }
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }
    
    /**
     * Checks if a database exists at the given path
     */
    @objc
    func database_Exists(
        _ databaseName: String,
        directory: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isDatabaseNameError, dbName) = DataAdapter.shared.adaptDatabaseName(
            name: databaseName as NSString,
            reject: reject
        )
        let (isDirectoryError, path) = DataAdapter.shared.adaptNonEmptyString(
            value: directory as NSString,
            propertyName: "directory",
            reject: reject
        )
        if isDatabaseNameError || isDirectoryError {
            return
        }
        
        backgroundQueue.async {
            let exists = DatabaseManager.shared.exists(dbName, directoryPath: path)
            resolve(exists)
        }
    }
    
    /**
     * Gets all scopes in a database
     */
    @objc
    func scope_GetScopes(
        _ databaseName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, dbName) = DataAdapter.shared.adaptDatabaseName(
            name: databaseName as NSString,
            reject: reject
        )
        if isError {
            return
        }
        
        backgroundQueue.async {
            do {
                if let scopes = try DatabaseManager.shared.scopes(dbName) {
                    let scopesArray = DataAdapter.shared.adaptScopesToNSDictionary(
                        scopes,
                        databaseName: dbName
                    )
                    let results: NSDictionary = ["scopes": scopesArray]
                    resolve(results)
                } else {
                    reject("DATABASE_ERROR", "Unable to get scopes for database", nil)
                }
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }
    
    /**
     * Deletes a database at the specified directory
     */
    @objc
    func database_Delete(
        _ name: String,
        directory: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isErrorPath, databasePath) = DataAdapter.shared.adaptNonEmptyString(
            value: directory as NSString,
            propertyName: "directory",
            reject: reject
        )
        if isErrorPath {
            return
        }
        let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(
            name: name as NSString,
            reject: reject
        )
        if isError {
            return
        }
        
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
}