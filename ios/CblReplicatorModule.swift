import Foundation
import CouchbaseLiteSwift

@objcMembers public class CblReplicatorModule: NSObject {

    private let backgroundQueue = CblNativeQueue.shared
    private let sendEventClosure: (String, Any?) -> Void

    @objc public init(sendEvent: @escaping (String, Any?) -> Void) {
        self.sendEventClosure = sendEvent
        super.init()
    }

    public func replicator_Create(
        config: Any,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let repConfig = config as? [String: Any],
              let collectionConfigJson = repConfig["collectionConfig"] as? String else {
            reject("REPLICATOR_ERROR", "Couldn't parse replicator config from dictionary", nil)
            return
        }
        backgroundQueue.async {
            do {
                let replicatorId = try ReplicatorManager.shared.replicator(
                    repConfig, collectionConfigJson: collectionConfigJson
                )
                resolve(["replicatorId": replicatorId])
            } catch let error as NSError {
                reject("REPLICATOR_ERROR", error.localizedDescription, nil)
            } catch {
                reject("REPLICATOR_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func replicator_Start(
        replicatorId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, repId) = DataAdapter.shared.adaptReplicatorId(
            replicatorId: replicatorId as NSString, reject: reject
        )
        if isError { return }
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

    public func replicator_Stop(
        replicatorId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, repId) = DataAdapter.shared.adaptReplicatorId(
            replicatorId: replicatorId as NSString, reject: reject
        )
        if isError { return }
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

    public func replicator_Cleanup(
        replicatorId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, repId) = DataAdapter.shared.adaptReplicatorId(
            replicatorId: replicatorId as NSString, reject: reject
        )
        if isError { return }
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

    public func replicator_GetStatus(
        replicatorId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, repId) = DataAdapter.shared.adaptReplicatorId(
            replicatorId: replicatorId as NSString, reject: reject
        )
        if isError { return }
        backgroundQueue.async {
            do {
                let status = try ReplicatorManager.shared.getStatus(repId)
                resolve(NSDictionary(dictionary: status))
            } catch let error as NSError {
                reject("REPLICATOR_ERROR", error.localizedDescription, nil)
            } catch {
                reject("REPLICATOR_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func replicator_ResetCheckpoint(
        replicatorId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, repId) = DataAdapter.shared.adaptReplicatorId(
            replicatorId: replicatorId as NSString, reject: reject
        )
        if isError { return }
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

    public func replicator_GetPendingDocumentIds(
        replicatorId: String, name: String, scopeName: String, collectionName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, repId) = DataAdapter.shared.adaptReplicatorId(
            replicatorId: replicatorId as NSString, reject: reject
        )
        let (isCollError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString, collectionName: collectionName as NSString,
            scopeName: scopeName as NSString, reject: reject
        )
        if isError || isCollError { return }
        backgroundQueue.async {
            do {
                guard let collection = try CollectionManager.shared.getCollection(
                    args.collectionName, scopeName: args.scopeName,
                    databaseName: args.databaseName
                ) else {
                    reject("REPLICATOR_ERROR", "Couldn't resolve collection passed in", nil)
                    return
                }
                let pendingIds = try ReplicatorManager.shared.getPendingDocumentIds(
                    repId, collection: collection
                )
                resolve(["pendingDocumentIds": pendingIds])
            } catch let error as NSError {
                reject("REPLICATOR_ERROR", error.localizedDescription, nil)
            } catch {
                reject("REPLICATOR_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func replicator_IsDocumentPending(
        documentId: String, replicatorId: String,
        name: String, scopeName: String, collectionName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, repId) = DataAdapter.shared.adaptReplicatorId(
            replicatorId: replicatorId as NSString, reject: reject
        )
        let (isCollError, args) = DataAdapter.shared.adaptCollectionArgs(
            name: name as NSString, collectionName: collectionName as NSString,
            scopeName: scopeName as NSString, reject: reject
        )
        let (isDocError, docId) = DataAdapter.shared.adaptNonEmptyString(
            value: documentId as NSString, propertyName: "docId", reject: reject
        )
        if isError || isCollError || isDocError { return }
        backgroundQueue.async {
            do {
                guard let collection = try CollectionManager.shared.getCollection(
                    args.collectionName, scopeName: args.scopeName,
                    databaseName: args.databaseName
                ) else {
                    reject("REPLICATOR_ERROR", "Couldn't resolve collection passed in", nil)
                    return
                }
                let isPending = try ReplicatorManager.shared.isDocumentPending(
                    repId, documentId: docId, collection: collection
                )
                resolve(NSDictionary(dictionary: isPending))
            } catch let error as NSError {
                reject("REPLICATOR_ERROR", error.localizedDescription, nil)
            } catch {
                reject("REPLICATOR_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func replicator_AddChangeListener(
        changeListenerToken: String, replicatorId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let replId = replicatorId
        let uuidToken = changeListenerToken
        backgroundQueue.async {
            guard let replicator = ReplicatorManager.shared.getReplicator(replicatorId: replId)
            else {
                reject("REPLICATOR_ERROR",
                       "No such replicator found for id \(replId)", nil)
                return
            }
            let listener = replicator.addChangeListener(
                withQueue: self.backgroundQueue
            ) { [weak self] change in
                guard let self = self else { return }
                let statusJson = ReplicatorHelper.generateReplicatorStatusJson(change.status)
                let resultData = NSMutableDictionary()
                resultData["token"] = uuidToken
                resultData["status"] = statusJson
                self.sendEventClosure("replicatorStatusChange", resultData)
            }
            ListenerTokenStore.shared.add(
                token: uuidToken,
                record: ChangeListenerRecord(
                    nativeListenerToken: listener, listenerType: .replicator
                )
            )
            resolve(nil)
        }
    }

    public func replicator_AddDocumentChangeListener(
        changeListenerToken: String, replicatorId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let replId = replicatorId
        let uuidToken = changeListenerToken
        backgroundQueue.async {
            guard let replicator = ReplicatorManager.shared.getReplicator(replicatorId: replId)
            else {
                reject("REPLICATOR_ERROR",
                       "No such replicator found for id \(replId)", nil)
                return
            }
            let listener = replicator.addDocumentReplicationListener(
                withQueue: self.backgroundQueue
            ) { [weak self] change in
                guard let self = self else { return }
                let documentJson = ReplicatorHelper.generateReplicationJson(
                    change.documents, isPush: change.isPush
                )
                let resultData = NSMutableDictionary()
                resultData["token"] = uuidToken
                resultData["documents"] = documentJson
                self.sendEventClosure("replicatorDocumentChange", resultData)
            }
            ListenerTokenStore.shared.add(
                token: uuidToken,
                record: ChangeListenerRecord(
                    nativeListenerToken: listener, listenerType: .replicatorDocument
                )
            )
            resolve(nil)
        }
    }

    // replicatorId is present in the TypeScript spec but intentionally unused —
    // matches legacy behaviour at CblReactnative.swift line 1622
    public func replicator_RemoveChangeListener(
        changeListenerToken: String,
        replicatorId: String,
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
