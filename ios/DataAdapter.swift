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
        let args = CollectionArgs()
        
        let scopeArgsResults = self.adaptScopeArgs(name: name, scopeName: scopeName, reject: reject)
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
    
    public func adaptDocumentArgs(docId:NSString,  concurrencyControlValue: NSNumber, reject: @escaping RCTPromiseRejectBlock) -> (Bool, DocumentArgs){
        let isError = false
        let args = DocumentArgs()
        let documentArgs = self.adaptNonEmptyString(value: docId, propertyName: "docId", reject: reject)
        if documentArgs.0 {
            return (documentArgs.0, args)
        }
        if concurrencyControlValue != -9999 {
            if let uint8Value = UInt8(exactly: concurrencyControlValue) {
                args.concurrencyControlValue = ConcurrencyControl(rawValue: uint8Value)
            }
            
        } else {
            args.concurrencyControlValue = nil
        }
        args.documentId = documentArgs.1
        return (isError, args)
    }
    
    public func adaptScopeArgs(name:NSString, scopeName: NSString, reject: @escaping RCTPromiseRejectBlock) -> (Bool, ScopeArgs){
        var isError = false
        let args = ScopeArgs()
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
    
    public func adaptCollectionsToNSDictionaryString(_ collections: [Collection]?, databaseName: NSString) -> NSArray {
        let data = NSMutableArray()
        if let cols = collections {
            for collection in cols {
                let dict = self.adaptCollectionToNSDictionary(collection, databaseName: databaseName)
                data.add(dict)
            }
        }
        let result = data.copy() as! NSArray
        return result
    }
    
    public func adaptScopeToNSDictionary(_ scope: Scope, databaseName: NSString) -> NSDictionary {
        let dict:NSDictionary = [
            "name": scope.name as NSString,
            "databaseName": databaseName
        ]
        return dict
        
    }
    
    public func adaptScopesToNSDictionary(_ scopes: [Scope]?, databaseName: NSString) -> NSArray {
        let data = NSMutableArray()
        if let unwrappedScopes = scopes {
            for scope in unwrappedScopes {
                let dict = self.adaptScopeToNSDictionary(scope, databaseName: databaseName)
                data.add(dict)
            }
        }
        let result = data.copy() as! NSArray
        return result
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
