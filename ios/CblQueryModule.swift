import Foundation
import CouchbaseLiteSwift

@objcMembers public class CblQueryModule: NSObject {

    private let backgroundQueue = CblNativeQueue.shared
    private let sendEventClosure: (String, Any?) -> Void

    @objc public init(sendEvent: @escaping (String, Any?) -> Void) {
        self.sendEventClosure = sendEvent
        super.init()
    }

    public func query_Execute(
        query: String, parameters: Any, name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(
            name: name as NSString, reject: reject
        )
        let parametersDict = parameters as? NSDictionary ?? NSDictionary()
        let (isQueryError, queryArgs) = DataAdapter.shared.adaptQueryParameter(
            query: query as NSString, parameters: parametersDict, reject: reject
        )
        if isError || isQueryError { return }
        backgroundQueue.async {
            do {
                let results: String
                if let params = queryArgs.parameters {
                    results = try DatabaseManager.shared.executeQuery(
                        queryArgs.query, parameters: params, databaseName: databaseName
                    )
                } else {
                    results = try DatabaseManager.shared.executeQuery(
                        queryArgs.query, databaseName: databaseName
                    )
                }
                resolve(["data": results])
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func query_Explain(
        query: String, parameters: Any, name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(
            name: name as NSString, reject: reject
        )
        let parametersDict = parameters as? NSDictionary ?? NSDictionary()
        let (isQueryError, queryArgs) = DataAdapter.shared.adaptQueryParameter(
            query: query as NSString, parameters: parametersDict, reject: reject
        )
        if isError || isQueryError { return }
        backgroundQueue.async {
            do {
                let results: String
                if let params = queryArgs.parameters {
                    results = try DatabaseManager.shared.queryExplain(
                        queryArgs.query, parameters: params, databaseName: databaseName
                    )
                } else {
                    results = try DatabaseManager.shared.queryExplain(
                        queryArgs.query, databaseName: databaseName
                    )
                }
                resolve(["data": results])
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func query_AddChangeListener(
        changeListenerToken: String, query: String, parameters: Any, name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, databaseName) = DataAdapter.shared.adaptDatabaseName(
            name: name as NSString, reject: reject
        )
        let (isTokenError, uuidToken) = DataAdapter.shared.adaptNonEmptyString(
            value: changeListenerToken as NSString,
            propertyName: "changeListenerToken", reject: reject
        )
        let (isQueryError, queryString) = DataAdapter.shared.adaptNonEmptyString(
            value: query as NSString, propertyName: "query", reject: reject
        )
        if isError || isTokenError || isQueryError { return }
        backgroundQueue.async {
            do {
                guard let database = DatabaseManager.shared.getDatabase(databaseName) else {
                    reject("DATABASE_ERROR",
                           "Could not find database with name \(databaseName)", nil)
                    return
                }
                let q = try database.createQuery(queryString)
                let parametersDict = parameters as? [String: Any] ?? [:]
                if !parametersDict.isEmpty {
                    let params = try QueryHelper.getParamatersFromJson(parametersDict)
                    q.parameters = params
                }
                let listener = q.addChangeListener(
                    withQueue: self.backgroundQueue
                ) { [weak self] change in
                    guard let self = self else { return }
                    let resultData = NSMutableDictionary()
                    resultData["token"] = uuidToken
                    if let results = change.results {
                        let jsonArray = "[" +
                            results.map { $0.toJSON() }.joined(separator: ",") + "]"
                        resultData["data"] = jsonArray
                    }
                    if let error = change.error {
                        resultData["error"] = error.localizedDescription
                    }
                    self.sendEventClosure("queryChange", resultData)
                }
                ListenerTokenStore.shared.add(
                    token: uuidToken,
                    record: ChangeListenerRecord(
                        nativeListenerToken: listener, listenerType: .query
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

    public func query_RemoveChangeListener(
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
