import Foundation

enum CblNativeQueue {
    static let shared = DispatchQueue(
        label: "com.cblite.reactnative.backgroundQueue",
        qos: .userInitiated
    )
}
