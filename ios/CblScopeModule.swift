import Foundation
import CouchbaseLiteSwift

@objcMembers public class CblScopeModule: NSObject {

    private let backgroundQueue = CblNativeQueue.shared

    public func scope_GetDefault(
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
                guard let scope = try DatabaseManager.shared.defaultScope(databaseName) else {
                    reject("DATABASE_ERROR",
                           "Unable to get default scope in database <\(databaseName)>", nil)
                    return
                }
                let dict = DataAdapter.shared.adaptScopeToNSDictionary(
                    scope, databaseName: databaseName
                )
                resolve(dict)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func scope_GetScope(
        scopeName: String,
        name: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let (isError, args) = DataAdapter.shared.adaptScopeArgs(
            name: name as NSString, scopeName: scopeName as NSString, reject: reject
        )
        if isError { return }
        backgroundQueue.async {
            do {
                guard let scope = try DatabaseManager.shared.scope(
                    args.scopeName, databaseName: args.databaseName
                ) else {
                    reject("DATABASE_ERROR",
                           "Unable to get scope <\(args.scopeName)> in database " +
                           "<\(args.databaseName)>", nil)
                    return
                }
                let dict = DataAdapter.shared.adaptScopeToNSDictionary(
                    scope, databaseName: args.databaseName
                )
                resolve(dict)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func scope_GetScopes(
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
                guard let scopes = try DatabaseManager.shared.scopes(databaseName) else {
                    reject("DATABASE_ERROR",
                           "Unable to get scopes for database \(databaseName)", nil)
                    return
                }
                let scopesArray = DataAdapter.shared.adaptScopesToNSDictionary(
                    scopes, databaseName: databaseName
                )
                resolve(["scopes": scopesArray])
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }
}
