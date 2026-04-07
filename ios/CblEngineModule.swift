import Foundation
import CouchbaseLiteSwift

@objcMembers public class CblEngineModule: NSObject {

    private let backgroundQueue = CblNativeQueue.shared

    public func file_GetDefaultPath(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        backgroundQueue.async {
            let paths = NSSearchPathForDirectoriesInDomains(
                .applicationSupportDirectory, .userDomainMask, true
            )
            resolve(paths.first ?? "")
        }
    }

    public func listenerToken_Remove(
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
