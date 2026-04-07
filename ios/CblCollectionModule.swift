import Foundation
import CouchbaseLiteSwift

@objcMembers public class CblCollectionModule: NSObject {

    private let backgroundQueue = CblNativeQueue.shared
    private let sendEventClosure: (String, Any?) -> Void

    @objc public init(sendEvent: @escaping (String, Any?) -> Void) {
        self.sendEventClosure = sendEvent
        super.init()
    }

    public func collection_CreateCollection(
        collectionName: String, name: String, scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString, collectionName: collectionName as NSString,
            scopeName: scopeName as NSString, reject: reject
        )
        if isError { return }
        backgroundQueue.async {
            do {
                guard let collection = try DatabaseManager.shared.createCollection(
                    args.collectionName, scopeName: args.scopeName,
                    databaseName: args.databaseName
                ) else {
                    reject("DATABASE_ERROR",
                           "Unable to create collection <\(args.scopeName)." +
                           "\(args.collectionName)> in database <\(args.databaseName)>", nil)
                    return
                }
                let dict = DataAdapter.shared.adaptCollectionToNSDictionary(
                    collection, databaseName: args.databaseName
                )
                resolve(dict)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func collection_DeleteCollection(
        collectionName: String, name: String, scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString, collectionName: collectionName as NSString,
            scopeName: scopeName as NSString, reject: reject
        )
        if isError { return }
        backgroundQueue.async {
            do {
                try DatabaseManager.shared.deleteCollection(
                    args.collectionName, scopeName: args.scopeName,
                    databaseName: args.databaseName
                )
                resolve(nil)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func collection_GetCollection(
        collectionName: String, name: String, scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString, collectionName: collectionName as NSString,
            scopeName: scopeName as NSString, reject: reject
        )
        if isError { return }
        backgroundQueue.async {
            do {
                guard let collection = try DatabaseManager.shared.collection(
                    args.collectionName, scopeName: args.scopeName,
                    databaseName: args.databaseName
                ) else {
                    reject("DATABASE_ERROR",
                           "Unable to get collection <\(args.scopeName)." +
                           "\(args.collectionName)> in database <\(args.databaseName)>", nil)
                    return
                }
                let dict = DataAdapter.shared.adaptCollectionToNSDictionary(
                    collection, databaseName: args.databaseName
                )
                resolve(dict)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func collection_GetCollections(
        name: String, scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptScopeArgs(
            name: name as NSString, scopeName: scopeName as NSString, reject: reject
        )
        if isError { return }
        backgroundQueue.async {
            do {
                if let collections = try DatabaseManager.shared.collections(
                    args.scopeName, databaseName: args.databaseName
                ) {
                    let collectionsArray = DataAdapter.shared.adaptCollectionsToNSDictionaryString(
                        collections, databaseName: args.databaseName
                    )
                    resolve(["collections": collectionsArray])
                } else {
                    reject("DATABASE_ERROR",
                           "Unable to get collections for scope <\(args.scopeName)> " +
                           "in database <\(args.databaseName)>", nil)
                    return
                }
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func collection_GetDefault(
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
                guard let collection = try DatabaseManager.shared.defaultCollection(databaseName)
                else {
                    reject("DATABASE_ERROR",
                           "Unable to get default collection for database \(databaseName)", nil)
                    return
                }
                let dict = DataAdapter.shared.adaptCollectionToNSDictionary(
                    collection, databaseName: databaseName
                )
                resolve(dict)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func collection_GetCount(
        collectionName: String, name: String, scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString, collectionName: collectionName as NSString,
            scopeName: scopeName as NSString, reject: reject
        )
        if isError { return }
        backgroundQueue.async {
            do {
                let count = try CollectionManager.shared.documentsCount(
                    args.collectionName, scopeName: args.scopeName,
                    databaseName: args.databaseName
                )
                resolve(["count": count])
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func collection_GetFullName(
        collectionName: String, name: String, scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString, collectionName: collectionName as NSString,
            scopeName: scopeName as NSString, reject: reject
        )
        if isError { return }
        backgroundQueue.async {
            do {
                let fullName = try CollectionManager.shared.fullName(
                    args.collectionName, scopeName: args.scopeName,
                    databaseName: args.databaseName
                )
                resolve(["fullName": fullName])
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func collection_CreateIndex(
        indexName: String, index: Any, collectionName: String,
        scopeName: String, name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString, collectionName: collectionName as NSString,
            scopeName: scopeName as NSString, reject: reject
        )
        let (isIdxNameError, idxName) = DataAdapter.shared.adaptNonEmptyString(
            value: indexName as NSString, propertyName: "indexName", reject: reject
        )
        let indexDict = index as? NSDictionary ?? NSDictionary()
        let (isIdxError, indexData) = DataAdapter.shared.adaptIndexToArrayAny(
            dict: indexDict, reject: reject
        )
        if isError || isIdxNameError || isIdxError { return }
        backgroundQueue.async {
            do {
                try CollectionManager.shared.createIndex(
                    idxName, indexType: indexData.indexType, items: indexData.indexes,
                    collectionName: args.collectionName, scopeName: args.scopeName,
                    databaseName: args.databaseName
                )
                resolve(nil)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func collection_DeleteIndex(
        indexName: String, collectionName: String, scopeName: String, name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString, collectionName: collectionName as NSString,
            scopeName: scopeName as NSString, reject: reject
        )
        let (isIdxNameError, idxName) = DataAdapter.shared.adaptNonEmptyString(
            value: indexName as NSString, propertyName: "indexName", reject: reject
        )
        if isError || isIdxNameError { return }
        backgroundQueue.async {
            do {
                try CollectionManager.shared.deleteIndex(
                    idxName, collectionName: args.collectionName,
                    scopeName: args.scopeName, databaseName: args.databaseName
                )
                resolve(nil)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func collection_GetIndexes(
        collectionName: String, scopeName: String, name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString, collectionName: collectionName as NSString,
            scopeName: scopeName as NSString, reject: reject
        )
        if isError { return }
        backgroundQueue.async {
            do {
                let indexes = try CollectionManager.shared.indexes(
                    args.collectionName, scopeName: args.scopeName,
                    databaseName: args.databaseName
                )
                resolve(["indexes": indexes])
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func collection_AddChangeListener(
        changeListenerToken: String, collectionName: String,
        name: String, scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString, collectionName: collectionName as NSString,
            scopeName: scopeName as NSString, reject: reject
        )
        let (isTokenError, uuidToken) = DataAdapter.shared.adaptNonEmptyString(
            value: changeListenerToken as NSString,
            propertyName: "changeListenerToken", reject: reject
        )
        if isError || isTokenError { return }
        backgroundQueue.async {
            do {
                guard let collection = try CollectionManager.shared.getCollection(
                    args.collectionName, scopeName: args.scopeName,
                    databaseName: args.databaseName
                ) else {
                    reject("DATABASE_ERROR", "Could not find collection", nil)
                    return
                }
                let listener = collection.addChangeListener(
                    queue: self.backgroundQueue
                ) { [weak self] change in
                    guard let self = self else { return }
                    let resultData = NSMutableDictionary()
                    resultData["token"] = uuidToken
                    resultData["documentIDs"] = change.documentIDs
                    resultData["collection"] = DataAdapter.shared.adaptCollectionToNSDictionary(
                        collection, databaseName: args.databaseName
                    )
                    self.sendEventClosure("collectionChange", resultData)
                }
                ListenerTokenStore.shared.add(
                    token: uuidToken,
                    record: ChangeListenerRecord(
                        nativeListenerToken: listener, listenerType: .collection
                    )
                )
                resolve(nil)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func collection_AddDocumentChangeListener(
        changeListenerToken: String, documentId: String, collectionName: String,
        name: String, scopeName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString, collectionName: collectionName as NSString,
            scopeName: scopeName as NSString, reject: reject
        )
        let (isTokenError, uuidToken) = DataAdapter.shared.adaptNonEmptyString(
            value: changeListenerToken as NSString,
            propertyName: "changeListenerToken", reject: reject
        )
        let (isDocError, docId) = DataAdapter.shared.adaptNonEmptyString(
            value: documentId as NSString, propertyName: "documentId", reject: reject
        )
        if isError || isTokenError || isDocError { return }
        backgroundQueue.async {
            do {
                guard let collection = try CollectionManager.shared.getCollection(
                    args.collectionName, scopeName: args.scopeName,
                    databaseName: args.databaseName
                ) else {
                    reject("DATABASE_ERROR", "Could not find collection", nil)
                    return
                }
                let listener = collection.addDocumentChangeListener(
                    id: docId, queue: self.backgroundQueue
                ) { [weak self] change in
                    guard let self = self else { return }
                    let resultData = NSMutableDictionary()
                    resultData["token"] = uuidToken
                    resultData["documentId"] = change.documentID
                    resultData["database"] = change.database.name
                    resultData["collection"] = DataAdapter.shared.adaptCollectionToNSDictionary(
                        collection, databaseName: args.databaseName
                    )
                    self.sendEventClosure("collectionDocumentChange", resultData)
                }
                ListenerTokenStore.shared.add(
                    token: uuidToken,
                    record: ChangeListenerRecord(
                        nativeListenerToken: listener, listenerType: .collectionDocument
                    )
                )
                resolve(nil)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func collection_RemoveChangeListener(
        changeListenerToken: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        backgroundQueue.async {
            guard let record = ListenerTokenStore.shared.remove(token: changeListenerToken) else {
                reject("LISTENER_ERROR",
                       "No listener found for token \(changeListenerToken)", nil)
                return
            }
            record.nativeListenerToken.remove()
            resolve(nil)
        }
    }
}
