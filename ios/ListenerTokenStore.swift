import Foundation
import CouchbaseLiteSwift

struct ChangeListenerRecord {
    let nativeListenerToken: ListenerToken
    let listenerType: ChangeListenerType
}

enum ChangeListenerType: String {
    case collection
    case collectionDocument
    case query
    case replicator
    case replicatorDocument
}

public class ListenerTokenStore {

    public static let shared: ListenerTokenStore = ListenerTokenStore()
    private init() {}

    private let queue = DispatchQueue(
        label: "com.cblite.ListenerTokenStore",
        attributes: .concurrent
    )
    private var store: [String: ChangeListenerRecord] = [:]

    public func add(token: String, record: ChangeListenerRecord) {
        queue.async(flags: .barrier) {
            self.store[token] = record
        }
    }

    public func remove(token: String) -> ChangeListenerRecord? {
        var removed: ChangeListenerRecord?
        queue.sync(flags: .barrier) {
            removed = self.store.removeValue(forKey: token)
        }
        return removed
    }

    public func get(token: String) -> ChangeListenerRecord? {
        queue.sync {
            return self.store[token]
        }
    }
}
