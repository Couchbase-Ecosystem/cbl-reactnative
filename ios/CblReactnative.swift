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
    let backgroundQueue = DispatchQueue(label: "com.cblite.reactnative.backgroundQueue")
    
    // MARK: - Collection Functions
    
    @objc(collection_CreateCollection:fromDatabaseWithName:fromScopeWithName:withResolver:withRejecter:)
    func collection_CreateCollection(
        collectionName: NSString,
        name: NSString,
        scopeName: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
                if isError {
                    return
                }
                if let collection = try DatabaseManager.shared.createCollection(args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName){
                    let dict = DataAdapter.shared.adaptCollectionToNSDictionary(collection, databaseName: name)
                    DispatchQueue.main.async {
                        resolve(dict)
                    }
                } else {
                    DispatchQueue.main.async {
                        reject("DATABASE_ERROR", "Unable to create collection <\(scopeName).\(collectionName)> in database <\(name)>", nil)
                    }
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(collection_DeleteCollection:fromDatabaseWithName:fromScopeWithName:withResolver:withRejecter:)
    func collection_DeleteCollection(
        collectionName: NSString,
        name: NSString,
        scopeName: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
                if isError {
                    return
                }
                try DatabaseManager.shared.deleteCollection(args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName)
                
                DispatchQueue.main.async {
                    resolve(nil)
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(collection_DeleteDocument:fromDatabaseWithName:fromScopeWithName:FromCollectionWithName:withOptionalConcurrencyControl:withResolver:withRejecter:)
    func collection_DeleteDocument(
        docId: NSString,
        name: NSString,
        scopeName: NSString,
        collectionName: NSString,
        concurrencyControlValue: NSNumber,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
                let (isDocumentError, documentArgs) = DataAdapter.shared.adaptDocumentArgs(docId: docId, concurrencyControlValue: concurrencyControlValue, reject: reject)
                if isError || isDocumentError {
                    return
                }
                
                let result = try CollectionManager.shared.deleteDocument(documentArgs.documentId, concurrencyControl: documentArgs.concurrencyControlValue, collectionName: args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName)
                let dict:NSDictionary = [
                    "concurrencyControlResult": result]
                DispatchQueue.main.async {
                    resolve(dict)
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(collection_GetBlobContent:fromDocumentWithId:fromDatabaseWithName:fromScopeWithName:fromCollectionWithName:withResolver:withRejecter:)
    func collection_GetBlobContent(
        key: NSString,
        docId: NSString,
        name: NSString,
        scopeName: NSString,
        collectionName: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
                let (isDocumentError, documentId) = DataAdapter.shared.adaptNonEmptyString(value: docId, propertyName: "docId", reject: reject)
                let (isKeyError, keyValue) = DataAdapter.shared.adaptNonEmptyString(value: key, propertyName: "key", reject: reject)
                
                if isError || isDocumentError || isKeyError {
                    return
                }
                
                guard let blob = try CollectionManager.shared.getBlobContent(
                    keyValue, documentId: documentId, collectionName: args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName)
                else {
                    let dict:NSDictionary = [
                        "data": []]
                    DispatchQueue.main.async {
                        resolve(dict)
                    }
                    return
                }
                let dict:NSDictionary = [
                    "data": blob]
                DispatchQueue.main.async {
                    resolve(dict)
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(collection_GetCollection:fromDatabaseWithName:fromScopeWithName:withResolver:withRejecter:)
    func collection_GetCollection(
        collectionName: NSString,
        name: NSString,
        scopeName: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
                if isError {
                    return
                }
                if let collection = try DatabaseManager.shared.collection(args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName){
                    let dict = DataAdapter.shared.adaptCollectionToNSDictionary(collection, databaseName: name)
                    DispatchQueue.main.async {
                        resolve(dict)
                    }
                } else {
                    DispatchQueue.main.async {
                        reject("DATABASE_ERROR", "Unable to get collection <\(scopeName).\(collectionName)> in database <\(name)>", nil)
                    }
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(collection_GetCollections:fromScopeWithName:withResolver:withRejecter:)
    func collection_GetCollections(
        name: NSString,
        scopeName: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, args) = DataAdapter.shared.adaptScopeArgs(name: name, scopeName: scopeName, reject: reject)
                if isError {
                    return
                }
                if let collections = try DatabaseManager.shared.collections(args.scopeName, databaseName: args.databaseName){
                    let collectionsArray = DataAdapter.shared.adaptCollectionsToNSDictionaryString(collections, databaseName: name)
                    let results:NSDictionary = [
                        "collections": collectionsArray ]
                    DispatchQueue.main.async {
                        resolve(results)
                    }
                } else {
                    DispatchQueue.main.async {
                        reject("DATABASE_ERROR", "Unable to get collections for scope <\(scopeName))> in database <\(name)>", nil)
                    }
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(collection_GetCount:fromDatabaseWithName:fromScopeWithName:withResolver:withRejecter:)
    func collection_GetCount(
        collectionName: NSString,
        name: NSString,
        scopeName: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
                if isError {
                    return
                }
                let count = try CollectionManager.shared.documentsCount(
                    args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName)
                let dict:NSDictionary = ["count": count]
                DispatchQueue.main.async {
                    resolve(dict)
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(collection_GetDefault:withResolver:withRejecter:)
    func collection_GetDefault(
        name: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
                if isError {
                    return
                }
                if let collection = try DatabaseManager.shared.defaultCollection(databaseName) {
                    
                    let dict = DataAdapter.shared.adaptCollectionToNSDictionary(collection, databaseName: name)
                    DispatchQueue.main.async {
                        resolve(dict)
                    }
                } else {
                    DispatchQueue.main.async {
                        reject("DATABASE_ERROR", "Unable to get default collection for database \(name)", nil)
                    }
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(collection_GetDocument:fromDatabaseWithName:fromScopeWithName:fromCollectionWithName:withResolver:withRejecter:)
    func collection_GetDocument(
        docId: NSString,
        name: NSString,
        scopeName: NSString,
        collectionName: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
                let (isDocumentError, documentId) = DataAdapter.shared.adaptNonEmptyString(value: docId, propertyName: "docId", reject: reject)
                if isError || isDocumentError {
                    return
                }
                
                guard let doc = try CollectionManager.shared.document(
                    documentId, collectionName: args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName)
                else {
                    let dict:NSDictionary = [:]
                    DispatchQueue.main.async {
                        resolve(dict)
                    }
                    return
                }
                //convert document to map using shared library
                var data:[String: Any] = [:]
                let documentMap = MapHelper.documentToMap(doc)
                data["_data"] = documentMap
                data["_id"] = docId
                data["_sequence"] = doc.sequence
                
                //React Native requires NSDictionary - type cast it and return as NSDictionary instead
                let dict:NSDictionary = data as NSDictionary
                DispatchQueue.main.async {
                    resolve(dict)
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(collection_GetDocumentExpiration:fromDatabaseWithName:fromScopeWithName:fromCollectionWithName:withResolver:withRejecter:)
    func collection_GetDocumentExpiration(
        docId: NSString,
        name: NSString,
        scopeName: NSString,
        collectionName: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
                let (isDocumentError, documentId) = DataAdapter.shared.adaptNonEmptyString(value: docId, propertyName: "docId", reject: reject)
                if isError || isDocumentError {
                    return
                }
                if let date = try CollectionManager.shared.getDocumentExpiration(
                    documentId, collectionName: args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName) {
                    let formatter =  ISO8601DateFormatter()
                    let dateString = formatter.string(from: date)
                    let dict:NSDictionary = [
                        "date": dateString]
                    DispatchQueue.main.async {
                        resolve(dict)
                    }
                    return
                }
                DispatchQueue.main.async {
                    resolve(nil)
                }
                return
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(collection_PurgeDocument:fromDatabaseWithName:fromScopeWithName:fromCollectionWithName:withResolver:withRejecter:)
    func collection_PurgeDocument(
        docId: NSString,
        name: NSString,
        scopeName: NSString,
        collectionName: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
                let (isDocumentError, documentId) = DataAdapter.shared.adaptNonEmptyString(value: docId, propertyName: "docId", reject: reject)
                if isError || isDocumentError {
                    return
                }
                
                try CollectionManager.shared.purgeDocument(
                    documentId, collectionName: args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName)
                DispatchQueue.main.async {
                    resolve(nil)
                }
                return
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(collection_Save:withDocumentId:fromDatabaseWithName:fromScopeWithName:fromCollectionWithName:withOptionalConcurrencyControl:withResolver:withRejecter:)
    func collection_Save(
        document: NSDictionary,
        docId: NSString,
        name: NSString,
        scopeName: NSString,
        collectionName: NSString,
        concurrencyControlValue: NSNumber,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
                let (isDocumentError, documentArgs) = DataAdapter.shared.adaptDocumentArgs(docId: docId, concurrencyControlValue: concurrencyControlValue, reject: reject)
                if isError || isDocumentError {
                    return
                }
                let (documentId, concurrencyControlResult) = try CollectionManager.shared.saveDocument(
                    documentArgs.documentId,
                    document: (document as? [String: Any])!,
                    concurrencyControl: documentArgs.concurrencyControlValue,
                    collectionName: args.collectionName,
                    scopeName: args.scopeName,
                    databaseName: args.databaseName)
                let dict:NSDictionary = [
                    "_id": documentId,
                    "concurrencyControlResult": concurrencyControlResult as Any]
                DispatchQueue.main.async {
                    resolve(dict)
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(collection_SetDocumentExpiration:forDocumentWithId:fromDatabaseWithName:fromScopeWithName:fromCollectionWithName:withResolver:withRejecter:)
    func collection_SetDocumentExpiration(
        expiration: NSString,
        docId: NSString,
        name: NSString,
        scopeName: NSString,
        collectionName: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
                let (isDocumentError, documentId) = DataAdapter.shared.adaptNonEmptyString(value: docId, propertyName: "docId", reject: reject)
                if isError || isDocumentError {
                    return
                }
                let strExpiration = String(expiration)
                let formatter =  ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                if let date = formatter.date(from: strExpiration) {
                    try CollectionManager.shared.setDocumentExpiration(
                        documentId,
                        expiration: date,
                        collectionName: args.collectionName,
                        scopeName: args.scopeName,
                        databaseName: args.databaseName)
                    
                    DispatchQueue.main.async {
                        resolve(nil)
                        return
                    }
                } else {
                    reject("DATABASE_ERROR", "Unable to convert date to ISO8601 Date Format.  Check to validate expiration is sent in ISO8601 format.", nil)
                    return
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    // MARK: - Database Functions
    
    @objc(database_ChangeEncryptionKey:withDatabaseName:withResolver:withRejecter:)
    func database_ChangeEncryptionKey(
        newKey: NSString,
        name: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
                if isError {
                    return
                }
                
                let encryptionKey = String(newKey)
                let errorMessageEncryptionKey = DataAdapter.shared.checkStringValue(value: encryptionKey, propertyName: "Encryption Key")
                if !errorMessageEncryptionKey.isEmpty {
                    reject("DATABASE_ERROR", errorMessageEncryptionKey, nil)
                }
                
                try DatabaseManager.shared.changeEncryptionKey(databaseName, newKey: encryptionKey)
                
                DispatchQueue.main.async {
                    resolve(nil)
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
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
                let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
                if isError {
                    return
                }
                try DatabaseManager.shared.close(databaseName)
                
                DispatchQueue.main.async {
                    resolve(nil)
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
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
        backgroundQueue.async {
            do {
                //get databaseName parsed
                let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: newName, reject: reject)
                if isError {
                    return
                }
                
                //get path parsed
                let (isErrorPath, databasePath) =
                DataAdapter.shared.adaptNonEmptyString(value: path, propertyName: "path", reject: reject)
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
                
                DispatchQueue.main.async {
                    resolve(nil)
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
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
                let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
                if isError {
                    return
                }
                try DatabaseManager.shared.delete(databaseName)
                
                DispatchQueue.main.async {
                    resolve(nil)
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
            catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(database_DeleteWithPath:fromDatabaseWithName:withResolver:withRejecter:)
    func database_DeleteWithPath(
        path: NSString,
        name: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                //get path parsed
                let (isErrorPath, databasePath) =
                DataAdapter.shared.adaptNonEmptyString(value: path, propertyName: "path", reject: reject)
                if isErrorPath {
                    return
                }
                let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
                if isError {
                    return
                }
                try DatabaseManager.shared.delete(databasePath, databaseName: databaseName)
                
                DispatchQueue.main.async {
                    resolve(nil)
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
            catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(database_Exists:withDirectory:withResolver:withRejecter:)
    func database_Exists(
        name: NSString,
        directory: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            let (isDatabaseNameError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
            let (isDirectoryError, path) = DataAdapter.shared.adaptNonEmptyString(value: directory, propertyName: "directory", reject: reject)
            if isDatabaseNameError || isDirectoryError {
                return
            }
            let exists = DatabaseManager.shared.exists(databaseName, directoryPath: path)
            DispatchQueue.main.async {
                resolve(exists)
            }
        }
    }
    
    @objc(database_GetPath:withResolver:withRejecter:)
    func database_GetPath(
        name: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
                if isError {
                    return
                }
                let path = try DatabaseManager.shared.getPath(databaseName)
                
                if let result = path as? NSString {
                    DispatchQueue.main.async {
                        resolve(result)
                    }
                } else {
                    reject("DATABASE_ERROR", "Unable to get path for database \(name)", nil)
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
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
        backgroundQueue.async {
            do {
                let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
                if isError {
                    return
                }
                let config: [String: String?] = [
                    "encryptionKey": String(encryptionKey),
                    "directory": String(directory)
                ]
                let hashConfig = AnyHashable(config)
                try DatabaseManager.shared.open(databaseName, databaseConfig: hashConfig as? [AnyHashable : Any])
                
                DispatchQueue.main.async {
                    resolve(nil)
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(database_PerformMaintenance:forDatabaseWithName:withResolver:withRejecter:)
    func database_PerformMaintenance(maintenanceType: NSNumber, databaseName: NSString, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        backgroundQueue.async {
            do {
                let intMaintenanceType: Int = maintenanceType.intValue
                let strDatabaseName: String = String(databaseName)
                let mType = DataAdapter.shared.adaptMaintenanceTypeFromInt(intValue: intMaintenanceType)
                try DatabaseManager.shared.performMaintenance(strDatabaseName, maintenanceType: mType)
                
                DispatchQueue.main.async {
                    resolve(nil)
                }
                
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
            catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    // MARK: - File System Functions
    
    @objc(file_GetDefaultPath:rejecter:)
    func file_GetDefaultPath(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            let paths = NSSearchPathForDirectoriesInDomains(
                .applicationSupportDirectory,
                .userDomainMask,
                true
            )
            DispatchQueue.main.async {
                return resolve(
                    paths.first ?? ""
                )
            }
        }
    }
    
    // MARK: - Logging Functions
    
    @objc(database_SetFileLoggingConfig:withDirectory:withLogLevel:withMaxSize:withMaxCount:shouldUsePlainText:withResolver:withRejecter:)
    func database_SetFileLoggingConfig(_ name: NSString, directory: NSString, logLevel: NSNumber, maxSize: NSNumber, maxRotateCount: NSNumber, shouldUsePlainText: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        backgroundQueue.async {
            do {
                let intLogLevel: Int = logLevel.intValue
                var config: [String:Any] = [:]
                config["level"] = intLogLevel
                config["directory"] = String(directory)
                config["maxRotateCount"] = maxRotateCount.intValue
                config["maxSize"] = maxSize.int64Value
                config["usePlainText"] = shouldUsePlainText
                try LoggingManager.shared.setFileLogging( String(name), config: config)
                
                DispatchQueue.main.async {
                    resolve(nil)
                }
                
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
            catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(database_SetLogLevel:withLogLevel:withResolver:withRejecter:)
    func database_SetLogLevel(domain: NSString, logLevel: NSNumber, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        backgroundQueue.async {
            do {
                let intLogLevel: Int = logLevel.intValue
                let strDomain: String = String(domain)
                try LoggingManager.shared.setLogLevel(strDomain, logLevel: intLogLevel)
                DispatchQueue.main.async {
                    resolve(nil)
                }
                
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
            catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    // MARK: - Scope Functions
    
    @objc(scope_GetDefault:withResolver:withRejecter:)
    func scope_GetDefault(
        name: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, args) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
                if isError {
                    return
                }
                if let scope = try DatabaseManager.shared.defaultScope(args) {
                    let dict = DataAdapter.shared.adaptScopeToNSDictionary(scope, databaseName: name)
                    DispatchQueue.main.async {
                        resolve(dict)
                    }
                } else {
                    DispatchQueue.main.async {
                        reject("DATABASE_ERROR", "Unable to get default scope in database <\(name)>", nil)
                    }
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(scope_GetScope:fromDatabaseWithName:withResolver:withRejecter:)
    func scope_GetScope(
        scopeName: NSString,
        name: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, args) = DataAdapter.shared.adaptScopeArgs(name: name, scopeName: scopeName, reject: reject)
                if isError {
                    return
                }
                if let scope = try DatabaseManager.shared.scope(args.scopeName, databaseName:args.databaseName) {
                    let dict = DataAdapter.shared.adaptScopeToNSDictionary(scope, databaseName: name)
                    DispatchQueue.main.async {
                        resolve(dict)
                    }
                } else {
                    DispatchQueue.main.async {
                        reject("DATABASE_ERROR", "Unable to get scope <\(scopeName)> in database <\(name)>", nil)
                    }
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(scope_GetScopes:withResolver:withRejecter:)
    func scope_GetScopes(
        name: NSString,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        backgroundQueue.async {
            do {
                let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
                if isError {
                    return
                }
                if let scopes = try DatabaseManager.shared.scopes(databaseName){
                    let scopesArray = DataAdapter.shared.adaptScopesToNSDictionary(scopes,  databaseName: name)
                    let results:NSDictionary = ["scopes": scopesArray]
                    DispatchQueue.main.async {
                        resolve(results)
                    }
                } else {
                    DispatchQueue.main.async {
                        reject("DATABASE_ERROR", "Unable to get scopes for database \(name)", nil)
                    }
                }
                
            } catch let error as NSError {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("DATABASE_ERROR", error.localizedDescription, nil)
                }
            }
        }
    }
}
