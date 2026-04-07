import Foundation
import CouchbaseLiteSwift

@objcMembers public class CblDocumentModule: NSObject {

    private let backgroundQueue = CblNativeQueue.shared

    public func collection_GetDocument(
        docId: String,
        name: String,
        scopeName: String,
        collectionName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString,
            collectionName: collectionName as NSString,
            scopeName: scopeName as NSString,
            reject: reject
        )
        let (isDocError, documentId) = DataAdapter.shared.adaptNonEmptyString(
            value: docId as NSString, propertyName: "docId", reject: reject
        )
        if isError || isDocError { return }
        backgroundQueue.async {
            do {
                guard let doc = try CollectionManager.shared.document(
                    documentId,
                    collectionName: args.collectionName,
                    scopeName: args.scopeName,
                    databaseName: args.databaseName
                ) else {
                    resolve(NSDictionary())
                    return
                }
                var data: [String: Any] = [:]
                let documentJson = doc.toJSON()
                if !documentJson.isEmpty {
                    guard let jsonData = documentJson.data(using: .utf8),
                          let jsonDict = try JSONSerialization.jsonObject(
                            with: jsonData, options: []
                          ) as? [String: Any] else {
                        reject("DOCUMENT_ERROR", "Failed to parse document JSON", nil)
                        return
                    }
                    data["_data"] = jsonDict
                } else {
                    data["_data"] = [:]
                }
                data["_id"] = documentId
                data["_sequence"] = doc.sequence
                resolve(data as NSDictionary)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func collection_Save(
        document: String,
        blobs: String,
        docId: String,
        name: String,
        scopeName: String,
        collectionName: String,
        concurrencyControlValue: Double,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString,
            collectionName: collectionName as NSString,
            scopeName: scopeName as NSString,
            reject: reject
        )
        let (isDocError, documentArgs) = DataAdapter.shared.adaptDocumentArgs(
            docId: docId as NSString,
            concurrencyControlValue: NSNumber(value: concurrencyControlValue),
            reject: reject
        )
        if isError || isDocError { return }
        let (isBlobError, documentBlobArgs) = DataAdapter.shared.adaptDocumentBlobStrings(
            document: document as NSString, blobs: blobs as NSString, reject: reject
        )
        if isBlobError { return }
        backgroundQueue.async {
            do {
                let blobMap = try CollectionManager.shared.blobsFromJsonString(
                    documentBlobArgs.blobs
                )
                let result = try CollectionManager.shared.saveDocument(
                    documentArgs.documentId,
                    document: documentBlobArgs.document,
                    blobs: blobMap,
                    concurrencyControl: documentArgs.concurrencyControlValue,
                    collectionName: args.collectionName,
                    scopeName: args.scopeName,
                    databaseName: args.databaseName
                )
                resolve([
                    "_id": result.id,
                    "_revId": result.revId ?? "",
                    "_sequence": result.sequence,
                    "concurrencyControlResult": result.concurrencyControl as Any
                ])
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func collection_DeleteDocument(
        docId: String,
        name: String,
        scopeName: String,
        collectionName: String,
        concurrencyControl: Double,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString,
            collectionName: collectionName as NSString,
            scopeName: scopeName as NSString,
            reject: reject
        )
        let (isDocError, documentArgs) = DataAdapter.shared.adaptDocumentArgs(
            docId: docId as NSString,
            concurrencyControlValue: NSNumber(value: concurrencyControl),
            reject: reject
        )
        if isError || isDocError { return }
        backgroundQueue.async {
            do {
                let result = try CollectionManager.shared.deleteDocument(
                    documentArgs.documentId,
                    concurrencyControl: documentArgs.concurrencyControlValue,
                    collectionName: args.collectionName,
                    scopeName: args.scopeName,
                    databaseName: args.databaseName
                )
                resolve(["concurrencyControlResult": result])
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func collection_PurgeDocument(
        docId: String,
        name: String,
        scopeName: String,
        collectionName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString,
            collectionName: collectionName as NSString,
            scopeName: scopeName as NSString,
            reject: reject
        )
        let (isDocError, documentId) = DataAdapter.shared.adaptNonEmptyString(
            value: docId as NSString, propertyName: "docId", reject: reject
        )
        if isError || isDocError { return }
        backgroundQueue.async {
            do {
                try CollectionManager.shared.purgeDocument(
                    documentId,
                    collectionName: args.collectionName,
                    scopeName: args.scopeName,
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

    public func collection_GetDocumentExpiration(
        docId: String,
        name: String,
        scopeName: String,
        collectionName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString,
            collectionName: collectionName as NSString,
            scopeName: scopeName as NSString,
            reject: reject
        )
        let (isDocError, documentId) = DataAdapter.shared.adaptNonEmptyString(
            value: docId as NSString, propertyName: "docId", reject: reject
        )
        if isError || isDocError { return }
        backgroundQueue.async {
            do {
                if let date = try CollectionManager.shared.getDocumentExpiration(
                    documentId,
                    collectionName: args.collectionName,
                    scopeName: args.scopeName,
                    databaseName: args.databaseName
                ) {
                    let formatter = ISO8601DateFormatter()
                    resolve(["date": formatter.string(from: date)])
                } else {
                    resolve(nil)
                }
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func collection_SetDocumentExpiration(
        expiration: String,
        docId: String,
        name: String,
        scopeName: String,
        collectionName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString,
            collectionName: collectionName as NSString,
            scopeName: scopeName as NSString,
            reject: reject
        )
        let (isDocError, documentId) = DataAdapter.shared.adaptNonEmptyString(
            value: docId as NSString, propertyName: "docId", reject: reject
        )
        if isError || isDocError { return }
        backgroundQueue.async {
            do {
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                guard let date = formatter.date(from: expiration) else {
                    reject("DATABASE_ERROR",
                           "Unable to convert date to ISO8601. " +
                           "Validate expiration is in ISO8601 format.", nil)
                    return
                }
                try CollectionManager.shared.setDocumentExpiration(
                    documentId,
                    expiration: date,
                    collectionName: args.collectionName,
                    scopeName: args.scopeName,
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

    public func collection_GetBlobContent(
        key: String,
        documentId: String,
        name: String,
        scopeName: String,
        collectionName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString,
            collectionName: collectionName as NSString,
            scopeName: scopeName as NSString,
            reject: reject
        )
        let (isDocError, docId) = DataAdapter.shared.adaptNonEmptyString(
            value: documentId as NSString, propertyName: "docId", reject: reject
        )
        let (isKeyError, keyValue) = DataAdapter.shared.adaptNonEmptyString(
            value: key as NSString, propertyName: "key", reject: reject
        )
        if isError || isDocError || isKeyError { return }
        backgroundQueue.async {
            do {
                guard let blob = try CollectionManager.shared.getBlobContent(
                    keyValue,
                    documentId: docId,
                    collectionName: args.collectionName,
                    scopeName: args.scopeName,
                    databaseName: args.databaseName
                ) else {
                    resolve(["data": []])
                    return
                }
                resolve(["data": blob])
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }
}
