import Foundation
import CouchbaseLiteSwift
import os
import React

@objc(
  CblReactnative
)
class CblReactnative: RCTEventEmitter {
  
  // MARK: - Member Properties
  private var hasListeners = false
  var databaseChangeListeners = [String: Any]()
  
  var collectionChangeListeners = [String: Any]()
  var collectionDocumentChangeListeners = [String: Any]()
  var queryChangeListeners = [String: Any]()
  
  var replicatorChangeListeners = [String: Any]()
  
  var queryCount: Int = 0
  var replicatorCount: Int = 0
  var allResultsChunkSize: Int = 256
  //create logger
  let logger = Logger(subsystem: Bundle.main.bundleIdentifier!, category: "cblite")

  // Create a serial DispatchQueue for background tasks
  let backgroundQueue = DispatchQueue(label: "com.cblite.reactnative.backgroundQueue")
  

  override init() {
    super.init()
  }
  // MARK: - Setup Notifications
  
  // Required override to specify supported events
  let kCollectionChange = "collectionChange"
  let kCollectionDocumentChange = "collectionDocumentChange"
  let kQueryChange = "queryChange"
  let kReplicatorStatusChange = "replicatorStatusChange"
  let kReplicatorDocumentChange = "replicatorDocumentChange"
  
  override func supportedEvents() -> [String]! {
    return [kCollectionChange,
            kCollectionDocumentChange,
            kQueryChange,
            kReplicatorStatusChange,
            kReplicatorDocumentChange]
    }
  
   @objc override static func moduleName() -> String! {
     return "CblReactnative"
   }
  
   @objc override static func requiresMainQueueSetup() -> Bool {
     return false
   }
  
  // MARK: - Collection Functions
  
  @objc(collection_CreateCollection:fromDatabaseWithName:fromScopeWithName:withResolver:withRejecter:)
  func collection_CreateCollection(
    collectionName: NSString,
    name: NSString,
    scopeName: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
    if isError {
      return
    }
    backgroundQueue.async {
      do {
        if let collection = try DatabaseManager.shared.createCollection(args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName){
          let dict = DataAdapter.shared.adaptCollectionToNSDictionary(collection, databaseName: args.databaseName)
          resolve(dict)
        } else {
          reject("DATABASE_ERROR", "Unable to create collection <\(args.scopeName).\(args.collectionName)> in database <\(args.databaseName)>", nil)
        }
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      }
    }
  }
  
  @objc(collection_CreateIndex:withIndexData:fromCollectionWithName:fromScopeWithName:fromDatabaseWithName:withResolver:withRejecter:)
  func collection_CreateIndex(
    indexName: NSString,
    index: NSDictionary,
    collectionName: NSString,
    scopeName: NSString,
    name: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
    let (isIndexNameError, idxName) = DataAdapter.shared.adaptNonEmptyString(value: indexName, propertyName: "indexName", reject:reject)
    let (isIndexDataError, indexData) = DataAdapter.shared.adaptIndexToArrayAny(dict: index, reject: reject)
    if isError || isIndexNameError || isIndexDataError {
      return
    }
    backgroundQueue.async {
      do {
        try CollectionManager.shared.createIndex(
          idxName,
          indexType: indexData.indexType,
          items: indexData.indexes,
          collectionName: args.collectionName,
          scopeName: args.scopeName,
          databaseName: args.databaseName)
        resolve(nil)
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
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
    let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
    if isError {
      return
    }
    backgroundQueue.async {
      do {
        
        try DatabaseManager.shared.deleteCollection(args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName)
        resolve(nil)
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
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
    let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
    let (isDocumentError, documentArgs) = DataAdapter.shared.adaptDocumentArgs(docId: docId, concurrencyControlValue: concurrencyControlValue, reject: reject)
    if isError || isDocumentError {
      return
    }
    backgroundQueue.async {
      do {
        let result = try CollectionManager.shared.deleteDocument(documentArgs.documentId, concurrencyControl: documentArgs.concurrencyControlValue, collectionName: args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName)
        let dict:NSDictionary = [
          "concurrencyControlResult": result]
        resolve(dict)
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      }
    }
  }
  
  @objc(collection_DeleteIndex:fromCollectionWithName:fromScopeWithName:fromDatabaseWithName:withResolver:withRejecter:)
  func collection_DeleteIndex(
    indexName: NSString,
    collectionName: NSString,
    scopeName: NSString,
    name: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
    let (isIndexNameError, idxName) = DataAdapter.shared.adaptNonEmptyString(value: indexName, propertyName: "indexName", reject:reject)
    
    if isError || isIndexNameError {
      return
    }
    backgroundQueue.async {
      do {
        try CollectionManager.shared.deleteIndex(
          idxName,
          collectionName: args.collectionName,
          scopeName: args.scopeName,
          databaseName: args.databaseName)
        resolve(nil)
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
        
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
    let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
    let (isDocumentError, documentId) = DataAdapter.shared.adaptNonEmptyString(value: docId, propertyName: "docId", reject: reject)
    let (isKeyError, keyValue) = DataAdapter.shared.adaptNonEmptyString(value: key, propertyName: "key", reject: reject)
    
    if isError || isDocumentError || isKeyError {
      return
    }
    backgroundQueue.async {
      do {
        guard let blob = try CollectionManager.shared.getBlobContent(
          keyValue, documentId: documentId, collectionName: args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName)
        else {
          let dict:NSDictionary = [
            "data": []]
          resolve(dict)
          return
        }
        let dict:NSDictionary = [
          "data": blob]
        resolve(dict)
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
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
    let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
    if isError {
      return
    }
    backgroundQueue.async {
      do {
        
        if let collection = try DatabaseManager.shared.collection(args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName){
          let dict = DataAdapter.shared.adaptCollectionToNSDictionary(collection, databaseName: args.databaseName)
          resolve(dict)
        } else {
          reject("DATABASE_ERROR", "Unable to get collection <\(args.scopeName).\(args.collectionName)> in database <\(args.databaseName)>", nil)
        }
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
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
    let (isError, args) = DataAdapter.shared.adaptScopeArgs(name: name, scopeName: scopeName, reject: reject)
    if isError {
      return
    }
    backgroundQueue.async {
      do {
        if let collections = try DatabaseManager.shared.collections(args.scopeName, databaseName: args.databaseName){
          let collectionsArray = DataAdapter.shared.adaptCollectionsToNSDictionaryString(collections, databaseName: args.databaseName)
          let results:NSDictionary = [
            "collections": collectionsArray ]
          resolve(results)
        } else {
          reject("DATABASE_ERROR", "Unable to get collections for scope <\(args.scopeName))> in database <\(args.databaseName)>", nil)
        }
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
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
    logger.debug("::SWIFT DEBUG:: collection_GetCount: called for collection \(collectionName) in database \(name) with scopeName \(scopeName)")
    let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
    if isError {
      logger.error("::SWIFT DEBUG:: collection_GetCount: error parsing aurgments")
      return
    }
    backgroundQueue.async {
      do {
        self.logger.debug("::SWIFT DEBUG:: collection_GetCount: getting count")
        let count = try CollectionManager.shared.documentsCount(
          args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName)
        self.logger.debug("::SWIFT DEBUG:: collection_GetCount: count retreived - equal to \(count)")
        let dict:NSDictionary = ["count": count]
        resolve(dict)
        self.logger.debug("::SWIFT DEBUG:: collection_GetCount: returned \(dict)")
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      }
    }
  }
  
  
  @objc(collection_GetDefault:withResolver:withRejecter:)
  func collection_GetDefault(
    name: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
    if isError {
      return
    }
    backgroundQueue.async {
      do {
        if let collection = try DatabaseManager.shared.defaultCollection(databaseName) {
          let dict = DataAdapter.shared.adaptCollectionToNSDictionary(collection, databaseName: databaseName)
          resolve(dict)
        } else {
          reject("DATABASE_ERROR", "Unable to get default collection for database \(databaseName)", nil)
        }
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
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
    let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
    let (isDocumentError, documentId) = DataAdapter.shared.adaptNonEmptyString(value: docId, propertyName: "docId", reject: reject)
    if isError || isDocumentError {
      return
    }
    backgroundQueue.async {
      do {
        guard let doc = try CollectionManager.shared.document(
          documentId, collectionName: args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName)
        else {
          let dict:NSDictionary = [:]
          resolve(dict)
          return
        }
        //convert document to map using shared library
        var data:[String: Any] = [:]
        let documentMap = MapHelper.documentToMap(doc)
        data["_data"] = documentMap
        data["_id"] = documentId
        data["_sequence"] = doc.sequence
        
        //React Native requires NSDictionary - type cast it and return as NSDictionary instead
        let dict:NSDictionary = data as NSDictionary
        resolve(dict)
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
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
    let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
    let (isDocumentError, documentId) = DataAdapter.shared.adaptNonEmptyString(value: docId, propertyName: "docId", reject: reject)
    if isError || isDocumentError {
      return
    }
    backgroundQueue.async {
      do {
        if let date = try CollectionManager.shared.getDocumentExpiration(
          documentId, collectionName: args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName) {
          let formatter =  ISO8601DateFormatter()
          let dateString = formatter.string(from: date)
          let dict:NSDictionary = [
            "date": dateString]
          resolve(dict)
          return
        }
        resolve(nil)
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      }
    }
  }
  
  @objc(collection_GetIndexes:fromScopeWithName:fromDatabaseWithName:withResolver:withRejecter:)
  func collection_GetIndexes(
    collectionName: NSString,
    scopeName: NSString,
    name: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
    if isError {
      return
    }
    backgroundQueue.async {
      do {
        let indexes = try CollectionManager.shared.indexes(
          args.collectionName,
          scopeName: args.scopeName,
          databaseName: args.databaseName)
        let dict:NSDictionary = [
          "indexes": indexes]
        resolve(dict)
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
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
    let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
    let (isDocumentError, documentId) = DataAdapter.shared.adaptNonEmptyString(value: docId, propertyName: "docId", reject: reject)
    if isError || isDocumentError {
      return
    }
    backgroundQueue.async {
      do {
        try CollectionManager.shared.purgeDocument(
          documentId, collectionName: args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName)
        resolve(nil)
        return
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      }
    }
  }
  
  @objc(collection_Save:withBlobs:withDocumentId:fromDatabaseWithName:fromScopeWithName:fromCollectionWithName:withOptionalConcurrencyControl:withResolver:withRejecter:)
  func collection_Save(
    document: NSString,
    blobs: NSString,
    docId: NSString,
    name: NSString,
    scopeName: NSString,
    collectionName: NSString,
    concurrencyControlValue: NSNumber,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    logger.debug("::SWIFT DEBUG:: collection_Save: called for documentId \(docId) in database \(name) with scopeName \(scopeName) with collectionName \(collectionName) with document: \(document) with blobs: \(blobs) with concurrencyControlValue: \(concurrencyControlValue)")
    let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
    let (isDocumentError, documentArgs) = DataAdapter.shared.adaptDocumentArgs(docId: docId, concurrencyControlValue: concurrencyControlValue, reject: reject)
    if isError || isDocumentError {
      logger.error ("::SWIFT DEBUG:: collection_Save: Error parsing database and document args")
      return
    }
    let (isDocumentBlobError, documentBlobArgs) = DataAdapter.shared.adaptDocumentBlobStrings(document: document, blobs: blobs, reject: reject)
    if (isDocumentBlobError) {
      logger.error ("::SWIFT DEBUG:: collection_Save: Error in parsing blobs args")
      return
    }
    backgroundQueue.async {
      do {
        self.logger.debug("::SWIFT DEBUG:: collection_save: Getting blobs from json string")
        
        let blobs = try CollectionManager.shared.blobsFromJsonString(documentBlobArgs.blobs)
        self.logger.debug ("::SWIFT DEBUG:: collection_save: got blobs \(blobs), calling saveDocument")
        
        let result = try CollectionManager.shared.saveDocument(
          documentArgs.documentId,
          document: documentBlobArgs.document,
          blobs: blobs,
          concurrencyControl: documentArgs.concurrencyControlValue,
          collectionName: args.collectionName,
          scopeName: args.scopeName,
          databaseName: args.databaseName)
        self.logger.debug ("::SWIFT DEBUG:: collection_save: got result, creating dict")
        
        let dict:NSDictionary = [
          "_id": result.id,
          "_revId": result.revId ?? "",
          "_sequence": result.sequence,
          "concurrencyControlResult": result.concurrencyControl as Any]
        self.logger.debug("::SWIFT DEBUG:: collection_save: dict created \(dict) - resolving with dict")
        resolve(dict)
        self.logger.debug("::SWIFT DEBUG:: collection_save: resolve completed")
      } catch let error as NSError {
        self.logger.error("::SWIFT DEBUG:: collection_save: Error \(error)")
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        self.logger.error("::SWIFT DEBUG:: collection_save: Error \(error)")
        reject("DATABASE_ERROR", error.localizedDescription, nil)
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
    let (isError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
    let (isDocumentError, documentId) = DataAdapter.shared.adaptNonEmptyString(value: docId, propertyName: "docId", reject: reject)
    if isError || isDocumentError {
      return
    }
    let strExpiration = String(expiration)
    backgroundQueue.async {
      do {
        let formatter =  ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: strExpiration) {
          try CollectionManager.shared.setDocumentExpiration(
            documentId,
            expiration: date,
            collectionName: args.collectionName,
            scopeName: args.scopeName,
            databaseName: args.databaseName)
          resolve(nil)
          return
        } else {
          reject("DATABASE_ERROR", "Unable to convert date to ISO8601 Date Format.  Check to validate expiration is sent in ISO8601 format.", nil)
          return
        }
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
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
    let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
    if isError {
      return
    }
    let encryptionKey = String(newKey)
    backgroundQueue.async {
      do {
        let errorMessageEncryptionKey = DataAdapter.shared.checkStringValue(value: encryptionKey, propertyName: "Encryption Key")
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
  }
  
  @objc(database_Close:withResolver:withRejecter:)
  func database_Close(
    name: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
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
  
  @objc(database_Copy:withNewName:withDirectory:withEncryptionKey: withResolver:withRejecter:)
  func database_Copy(
    path: NSString,
    newName: NSString,
    directory: NSString,
    encryptionKey: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
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
    backgroundQueue.async {
      do {
        try DatabaseManager.shared.copy(databasePath, newName: databaseName, databaseConfig: hashConfig as? [AnyHashable : Any])
        resolve(nil)
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
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
    let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
    if isError {
      return
    }
    backgroundQueue.async {
      do {
        try DatabaseManager.shared.delete(databaseName)
        resolve(nil)
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      }
      catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
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
    backgroundQueue.async {
      do {
        try DatabaseManager.shared.delete(databasePath, databaseName: databaseName)
        resolve(nil)
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      }
      catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
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
    let (isDatabaseNameError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
    let (isDirectoryError, path) = DataAdapter.shared.adaptNonEmptyString(value: directory, propertyName: "directory", reject: reject)
    if isDatabaseNameError || isDirectoryError {
      return
    }
    backgroundQueue.async {
      let exists = DatabaseManager.shared.exists(databaseName, directoryPath: path)
      resolve(exists)
    }
  }
  
  @objc(database_GetPath:withResolver:withRejecter:)
  func database_GetPath(
    name: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
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
  
  @objc(database_Open:withDirectory:withEncryptionKey: withResolver:withRejecter:)
  func database_Open(
    name: NSString,
    directory: NSString,
    encryptionKey: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
    if isError {
      return
    }
    let config: [String: String?] = [
      "encryptionKey": String(encryptionKey),
      "directory": String(directory)
    ]
    let hashConfig = AnyHashable(config)
    backgroundQueue.async {
      do {
        try DatabaseManager.shared.open(databaseName, databaseConfig: hashConfig as? [AnyHashable : Any])
        resolve(nil)
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      }
    }
  }
  
  @objc(database_PerformMaintenance:forDatabaseWithName:withResolver:withRejecter:)
  func database_PerformMaintenance(maintenanceType: NSNumber, databaseName: NSString, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let intMaintenanceType: Int = maintenanceType.intValue
    let strDatabaseName: String = String(databaseName)
    let mType = DataAdapter.shared.adaptMaintenanceTypeFromInt(intValue: intMaintenanceType)
    logger.debug ("::SWIFT DEBUG:: database_PerformMaintenance: called with arguments maintenanceType: \(intMaintenanceType) for databaseName: \(strDatabaseName)")
    backgroundQueue.async {
      do {
        self.logger.debug ("::SWIFT DEBUG:: database_PerformMaintenance:  calling performane maintainance")
        try DatabaseManager.shared.performMaintenance(strDatabaseName, maintenanceType: mType)
        self.logger.debug ("::SWIFT DEBUG:: database_PerformMaintenance: done, resolving")
        resolve(nil)
        self.logger.debug ("::SWIFT DEBUG:: database_PerformMaintenance: resolve completed")

      } catch let error as NSError {
        self.logger.error ("::SWIFT DEBUG:: database_PerformMaintenance: Error \(error)")
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      }
      catch {
        self.logger.error ("::SWIFT DEBUG:: database_PerformMaintenance: Error \(error)")
        reject("DATABASE_ERROR", error.localizedDescription, nil)
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
      return resolve(
          paths.first ?? ""
        )
    }
  }
  
  // MARK: - Logging Functions
  
  @objc(database_SetFileLoggingConfig:withDirectory:withLogLevel:withMaxSize:withMaxCount:shouldUsePlainText:withResolver:withRejecter:)
  func database_SetFileLoggingConfig(_ name: NSString, directory: NSString, logLevel: NSNumber, maxSize: NSNumber, maxRotateCount: NSNumber, shouldUsePlainText: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let intLogLevel: Int = logLevel.intValue
    var config: [String:Any] = [:]
    config["level"] = intLogLevel
    config["directory"] = String(directory)
    config["maxRotateCount"] = maxRotateCount.intValue
    config["maxSize"] = maxSize.int64Value
    config["usePlainText"] = shouldUsePlainText
    let databaseName = String(name)
    backgroundQueue.async {
      do {
        try LoggingManager.shared.setFileLogging(databaseName, config: config)
        resolve(nil)
        
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      }
      catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      }
    }
  }
  
  @objc(database_SetLogLevel:withLogLevel:withResolver:withRejecter:)
  func database_SetLogLevel(domain: NSString, logLevel: NSNumber, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let intLogLevel: Int = logLevel.intValue
    let strDomain: String = String(domain)
    backgroundQueue.async {
      do {
        try LoggingManager.shared.setLogLevel(strDomain, logLevel: intLogLevel)
        resolve(nil)
        
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      }
      catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      }
    }
  }
  
  // MARK: - SQL++ Query Functions
  @objc(query_Execute:
          withParameters:
          fromDatabaseWithName:
          withResolver:
          withRejecter:)
  func query_Execute(
    query: NSString,
    parameters: NSDictionary,
    name: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock)
  {
    let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
    let (isQueryArgsError, queryArgs) =
    DataAdapter.shared.adaptQueryParameter(query: query, parameters: parameters, reject: reject)
    if isError || isQueryArgsError {
      return
    }
    backgroundQueue.async {
      do {
        var results = ""
        if let queryParams = queryArgs.parameters {
          results = try DatabaseManager.shared.executeQuery(queryArgs.query, parameters: queryParams, databaseName: databaseName)
          
        } else {
          results = try DatabaseManager.shared.executeQuery(queryArgs.query, databaseName: databaseName)
        }
        let dict:NSDictionary = [
          "data": results]
        resolve(dict)
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      }
      
    }
  }
  
  @objc(query_Explain:
          withParameters:
          fromDatabaseWithName:
          withResolver:
          withRejecter:)
  func query_Explain(
    query: NSString,
    parameters: NSDictionary,
    name: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock)
  {
    let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
    let (isQueryArgsError, queryArgs) =
    DataAdapter.shared.adaptQueryParameter(query: query, parameters: parameters, reject: reject)
    if isError || isQueryArgsError {
      return
    }
    backgroundQueue.async {
      do {
        var results = ""
        if let queryParams = queryArgs.parameters {
          results = try DatabaseManager.shared.queryExplain(queryArgs.query, parameters: queryParams, databaseName: databaseName)
          
        } else {
          results = try DatabaseManager.shared.queryExplain(queryArgs.query, databaseName: databaseName)
        }
        let dict:NSDictionary = [
          "data": results]
        resolve(dict)
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      }
      
    }
  }
  
  // MARK: - Replicator Functions
  
  @objc(replicator_AddChangeListener:withReplicatorId:withResolver:
          withRejecter:)
  func replicator_AddChangeListener(
    changeListenerToken: NSString,
    replicatorId: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock)
  {
    var errorMessage = ""
    let replId = String(replicatorId)
    let token = String(changeListenerToken)
    
    backgroundQueue.async {
      guard let replicator = ReplicatorManager.shared.getReplicator(replicatorId: replId) else {
        errorMessage = "No such replicator found for id \(replId)"
        reject("REPLICATOR_ERROR", errorMessage, nil)
        return
      }
      
      let listener = replicator.addChangeListener(withQueue: self.backgroundQueue, { change in
        let statusJson = ReplicatorHelper.generateReplicatorStatusJson(change.status)
        let resultData = NSMutableDictionary()
        resultData.setValue(token, forKey: "token")
        resultData.setValue(statusJson, forKey: "status")
        self.sendEvent(withName: self.kReplicatorStatusChange, body: resultData)
      })
      self.replicatorChangeListeners[token] = listener
      resolve(nil)
    }
  }
  
  @objc(replicator_Cleanup:withResolver:withRejecter:)
  func replicator_Cleanup(
    replicatorId: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock) -> Void {
      let (isError, repId) = DataAdapter.shared.adaptReplicatorId(replicatorId: replicatorId, reject: reject)
      if isError {
        return
      }
      backgroundQueue.async {
        do {
          try ReplicatorManager.shared.cleanUp(repId)
          resolve(nil)
        } catch let error as NSError {
          reject("REPLICATOR_ERROR", error.localizedDescription, nil)
        } catch {
          reject("REPLICATOR_ERROR", error.localizedDescription, nil)
        }
      }
    }
  
  @objc(replicator_Create:withResolver:withRejecter:)
  func replicator_Create(
    config: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock) -> Void {
      guard let collectionConfigJson = config["collectionConfig"] as? String,
            let repConfig = config as? [String: Any]
      else {
        reject("REPLICATOR_ERROR", "couldn't parse replicator config from dictionary", nil)
        return
      }
      backgroundQueue.async {
        do {
          if let data = collectionConfigJson.data(using: .utf8){
            let decoder: JSONDecoder = JSONDecoder()
            let collectionConfig = try decoder.decode([CollectionConfigItem].self, from: data)
            let replicatorId = try ReplicatorManager.shared.replicator(repConfig, collectionConfiguration:collectionConfig)
            let dict:NSDictionary = [
              "replicatorId": replicatorId]
            resolve(dict)
          } else {
            reject("REPLICATOR_ERROR", "couldn't deserialize replicator config, is config proper JSON string formatted?", nil)
          }
        } catch let error as NSError {
          reject("REPLICATOR_ERROR", error.localizedDescription, nil)
        } catch {
          reject("REPLICATOR_ERROR", error.localizedDescription, nil)
        }
      }
    }
  
  @objc(replicator_GetPendingDocumentIds:fromDatabaseWithName:fromScopeWithName:fromCollectionWithName:withResolver:withRejecter:)
  func replicator_GetPendingDocumentIds(
    replicatorId: NSString,
    name: NSString,
    scopeName: NSString,
    collectionName: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock) -> Void {
      let (isError, repId) = DataAdapter.shared.adaptReplicatorId(replicatorId: replicatorId, reject: reject)
      let (isCollectionArgsError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
      if isError || isCollectionArgsError {
        return
      }
      backgroundQueue.async {
        do {
          if let collection = try CollectionManager.shared.getCollection(args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName) {
            let pendingIds = try ReplicatorManager.shared.getPendingDocumentIds(repId, collection: collection)
            let resultDic:NSDictionary = ["pendingDocumentIds": pendingIds]
            resolve(resultDic)
          } else {
            reject("REPLICATOR_ERROR", "Couldn't resolve collection passed in", nil)
          }
        } catch let error as NSError {
          reject("REPLICATOR_ERROR", error.localizedDescription, nil)
        } catch {
          reject("REPLICATOR_ERROR", error.localizedDescription, nil)
        }
      }
    }
  
  @objc(replicator_GetStatus:withResolver:withRejecter:)
  func replicator_GetStatus(
    replicatorId: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock) -> Void {
      let (isError, repId) = DataAdapter.shared.adaptReplicatorId(replicatorId: replicatorId, reject: reject)
      if isError {
        return
      }
      backgroundQueue.async {
        do {
          let status = try ReplicatorManager.shared.getStatus(repId)
          let dict:NSDictionary = NSDictionary(dictionary: status)
          resolve(dict)
        } catch let error as NSError {
          reject("REPLICATOR_ERROR", error.localizedDescription, nil)
        } catch {
          reject("REPLICATOR_ERROR", error.localizedDescription, nil)
        }
      }
    }
  
  @objc(replicator_IsDocumentPending:fromReplicatorWithId:fromDatabaseWithName:fromScopeWithName:fromCollectionWithName:withResolver:withRejecter:)
  func replicator_IsDocumentPending(
    documentId: NSString,
    replicatorId: NSString,
    name: NSString,
    scopeName: NSString,
    collectionName: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock) -> Void {
      let (isError, repId) = DataAdapter.shared.adaptReplicatorId(replicatorId: replicatorId, reject: reject)
      let (isCollectionArgsError, args) = DataAdapter.shared.adaptCollectionArgs(name: name, collectionName: collectionName, scopeName: scopeName, reject: reject)
      let (isDocumentError, docId) = DataAdapter.shared.adaptNonEmptyString(value: documentId, propertyName: "docId", reject: reject)
      if isError || isDocumentError || isCollectionArgsError {
        return
      }
      backgroundQueue.async {
        do {
          if let collection = try CollectionManager.shared.getCollection(args.collectionName, scopeName: args.scopeName, databaseName: args.databaseName) {
            let isPending = try ReplicatorManager.shared.isDocumentPending(repId, documentId: docId, collection: collection)
            let dict:NSDictionary = NSDictionary(dictionary: isPending)
            resolve(dict)
          } else {
            reject("REPLICATOR_ERROR", "Couldn't resolve collection passed in", nil)
          }
        } catch let error as NSError {
          reject("REPLICATOR_ERROR", error.localizedDescription, nil)
        } catch {
          reject("REPLICATOR_ERROR", error.localizedDescription, nil)
        }
      }
      
    }
  
  @objc(replicator_RemoveChangeListener:withReplicatorId:withResolver:withRejecter:)
  func replicator_RemoveChangeListener(
    changeListenerToken: NSString,
    replicatorId: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock) -> Void {
      var errorMessage = ""
      let replId = String(replicatorId)
      let token = String(changeListenerToken)
      guard let replicator = ReplicatorManager.shared.getReplicator(replicatorId: replId) else {
        errorMessage = "No such replicator found for id \(replId)"
        reject("REPLICATOR_ERROR", errorMessage, nil)
        return
      }
      backgroundQueue.async {
        if let listener = self.replicatorChangeListeners[token] as? ListenerToken {
          replicator.removeChangeListener(withToken: listener)
          self.replicatorChangeListeners.removeValue(forKey: token)
          resolve(nil)
          
        } else {
          reject("REPLICATOR_ERROR", "No such replicator listener found with token \(token)", nil)
        }
        
      }
    }
  
  @objc(replicator_ResetCheckpoint:withResolver:withRejecter:)
  func replicator_ResetCheckpoint(
    replicatorId: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock) -> Void {
      let (isError, repId) = DataAdapter.shared.adaptReplicatorId(replicatorId: replicatorId, reject: reject)
      if isError {
        return
      }
      backgroundQueue.async {
        do {
          try ReplicatorManager.shared.resetCheckpoint(repId)
          resolve(nil)
        } catch let error as NSError {
          reject("REPLICATOR_ERROR", error.localizedDescription, nil)
        } catch {
          reject("REPLICATOR_ERROR", error.localizedDescription, nil)
        }
      }
    }
  
  @objc(replicator_Start:withResolver:withRejecter:)
  func replicator_Start(
    replicatorId: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock) -> Void {
      let (isError, repId) = DataAdapter.shared.adaptReplicatorId(replicatorId: replicatorId, reject: reject)
      if isError {
        return
      }
      backgroundQueue.async {
        do {
          try ReplicatorManager.shared.start(repId)
          resolve(nil)
        } catch let error as NSError {
          reject("REPLICATOR_ERROR", error.localizedDescription, nil)
        } catch {
          reject("REPLICATOR_ERROR", error.localizedDescription, nil)
        }
      }
    }
  
  @objc(replicator_Stop:withResolver:withRejecter:)
  func replicator_Stop(
    replicatorId: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock) -> Void {
      let (isError, repId) = DataAdapter.shared.adaptReplicatorId(replicatorId: replicatorId, reject: reject)
      if isError {
        return
      }
      backgroundQueue.async {
        do {
          try ReplicatorManager.shared.stop(repId)
          resolve(nil)
        } catch let error as NSError {
          reject("REPLICATOR_ERROR", error.localizedDescription, nil)
        } catch {
          reject("REPLICATOR_ERROR", error.localizedDescription, nil)
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
    let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
    if isError {
      return
    }
    backgroundQueue.async {
      do {
        if let scope = try DatabaseManager.shared.defaultScope(databaseName) {
          let dict = DataAdapter.shared.adaptScopeToNSDictionary(scope, databaseName: databaseName)
          resolve(dict)
        } else {
          reject("DATABASE_ERROR", "Unable to get default scope in database <\(databaseName)>", nil)
        }
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
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
    let (isError, args) = DataAdapter.shared.adaptScopeArgs(name: name, scopeName: scopeName, reject: reject)
    if isError {
      return
    }
    backgroundQueue.async {
      do {
        if let scope = try DatabaseManager.shared.scope(args.scopeName, databaseName: args.databaseName) {
          let dict = DataAdapter.shared.adaptScopeToNSDictionary(scope, databaseName: args.databaseName)
          resolve(dict)
        } else {
          reject("DATABASE_ERROR", "Unable to get scope <\(args.scopeName)> in database <\(args.databaseName)>", nil)
        }
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      }
    }
  }
  
  @objc(scope_GetScopes:withResolver:withRejecter:)
  func scope_GetScopes(
    name: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(name: name, reject: reject)
    if isError {
      return
    }
    backgroundQueue.async {
      do {
        if let scopes = try DatabaseManager.shared.scopes(databaseName){
          let scopesArray = DataAdapter.shared.adaptScopesToNSDictionary(scopes,  databaseName: databaseName)
          let results:NSDictionary = ["scopes": scopesArray]
          resolve(results)
        } else {
          reject("DATABASE_ERROR", "Unable to get scopes for database \(databaseName)", nil)
        }
        
      } catch let error as NSError {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      } catch {
        reject("DATABASE_ERROR", error.localizedDescription, nil)
      }
    }
  }
}

extension Notification.Name {
  static let collectionChange = Notification.Name("collectionChange")
  static let collectionDocumentChange = Notification.Name("collectionDocumentChange")
  static let queryChange = Notification.Name("queryChange")
  static let replicatorStatusChange = Notification.Name("replicatorStatusChange")
  static let replicatorDocumentChange = Notification.Name("replicatorDocumentChange")
}
