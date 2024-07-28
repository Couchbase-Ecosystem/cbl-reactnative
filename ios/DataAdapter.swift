//
//  DataAdapter.swift
//  cbl-reactnative
//
//  Created by Aaron LaBeau on 7/24/24.
//

import Foundation
import CouchbaseLiteSwift


public class DataAdapter {
    
    // MARK: - Singleton
    public static let shared = DataAdapter()
    
    // MARK: - Private initializer to prevent external instantiation
    private init() {
        // Initialization code here
    }
    
    public func adaptMaintenanceTypeFromInt(intValue: Int) -> MaintenanceType {
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
    
    public func adaptCollectionArgs(name:NSString, collectionName: NSString, scopeName: NSString, reject: @escaping RCTPromiseRejectBlock) -> (Bool, CollectionArgs){
        var isError = false
        var args = CollectionArgs()
        
        var scopeArgsResults = self.adaptScopeArgs(name: name, scopeName: scopeName, reject: reject)
        if (scopeArgsResults.0) {
            return (true, args)
        }
        args.databaseName = scopeArgsResults.1.databaseName
        args.scopeName = scopeArgsResults.1.scopeName
        args.collectionName = String(collectionName)
        
        //check the collection name
        let errorCollectionName = self.checkStringValue(value: args.collectionName, propertyName: "Collection Name")
        if !errorCollectionName.isEmpty {
            isError = true
            reject("DATABASE_ERROR", errorCollectionName, nil)
        }
        return (isError, args)
    }
    
    public func adaptScopeArgs(name:NSString, scopeName: NSString, reject: @escaping RCTPromiseRejectBlock) -> (Bool, ScopeArgs){
        var isError = false
        var args = ScopeArgs()
        args.databaseName = String(name)
        args.scopeName = String(scopeName)
        // Check the database name
        let errorMessageDatabaseName = self.checkStringValue(value: args.databaseName, propertyName: "Database Name")
        if !errorMessageDatabaseName.isEmpty {
            isError = true
            reject("DATABASE_ERROR", errorMessageDatabaseName, nil)
        }
        //check the scope name
        let errorScopeName = self.checkStringValue(value: args.scopeName, propertyName: "Scope Name")
        if !errorScopeName.isEmpty {
            isError = true
            reject("DATABASE_ERROR", errorScopeName, nil)
        }
        return (isError, args)
    }
    
    public func adaptCollectionToNSDictionary(_ collection: Collection, databaseName: NSString) -> NSDictionary {
        let dict:NSDictionary = [
            "name": collection.name as NSString,
            "scope": [
                "name": collection.scope.name as NSString,
                "databaseName": databaseName
            ]
        ]
        return dict
    }
    
    public func adaptCollectionsToNSDictionaryString(_ collections: [Collection]?, databaseName: NSString) -> NSDictionary {
        var data = NSMutableDictionary()
        if let cols = collections {
            for collection in cols {
                let dict = self.adaptCollectionToNSDictionary(collection, databaseName: databaseName)
                dict.forEach{ key, value in
                    data[key] = value
                }
            }
        }
        let result = data.copy() as! NSDictionary
        return  result
    }
    
    public func adaptScopeToNSDictionary(_ scope: Scope, databaseName: NSString) -> NSDictionary {
        let dict:NSDictionary = [
            "name": scope.name as NSString,
            "databaseName": databaseName
        ]
        return dict
        
    }
    
    public func adaptScopesToNSDictionary(_ scopes: [Scope]?, databaseName: NSString) -> NSDictionary {
        var data = NSMutableDictionary()
        if let uwScopes = scopes {
            for scope in uwScopes {
                let dict = self.adaptScopeToNSDictionary(scope, databaseName: databaseName)
                dict.forEach{ key, value in
                    data[key] = value
                }
            }
        }
        let result = data.copy() as! NSDictionary
        return  result
    }
    
    public func adaptDatabaseName(name:NSString, reject: @escaping RCTPromiseRejectBlock) -> (Bool,String){
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
    
    public func adaptNonEmptyString(value: NSString, propertyName: String, reject: @escaping RCTPromiseRejectBlock) -> (Bool, String) {
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
    
    public func checkStringValue(value: String, propertyName: String) -> String {
        if (value.isEmpty){
            return "Error:  \(propertyName) must be provided"
        } else {
            return ""
        }
    }
}
