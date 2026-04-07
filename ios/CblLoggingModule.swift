import Foundation
import CouchbaseLiteSwift

@objcMembers public class CblLoggingModule: NSObject {

    private let backgroundQueue = CblNativeQueue.shared
    private let sendEventClosure: (String, Any?) -> Void

    @objc public init(sendEvent: @escaping (String, Any?) -> Void) {
        self.sendEventClosure = sendEvent
        super.init()
    }

    public func database_SetLogLevel(
        domain: String, logLevel: Double,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        backgroundQueue.async {
            do {
                try LoggingManager.shared.setLogLevel(domain, logLevel: Int(logLevel))
                resolve(nil)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func database_SetFileLoggingConfig(
        name: String, directory: String, logLevel: Double,
        maxSize: Double, maxRotateCount: Double, shouldUsePlainText: Bool,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        var config: [String: Any] = [:]
        config["level"] = Int(logLevel)
        config["directory"] = directory
        config["maxRotateCount"] = Int(maxRotateCount)
        config["maxSize"] = Int64(maxSize)
        config["usePlainText"] = shouldUsePlainText
        backgroundQueue.async {
            do {
                try LoggingManager.shared.setFileLogging(name, config: config)
                resolve(nil)
            } catch let error as NSError {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            } catch {
                reject("DATABASE_ERROR", error.localizedDescription, nil)
            }
        }
    }

    // With Turbo Modules, codegen enforces `double` and `[String]` — the JS layer
    // sends -1 for "disable" and an empty array for "all domains". The legacy code used
    // Any? and NSNumber? which allowed nil, but Turbo Modules never send nil for non-optional params.
    public func logsinks_SetConsole(
        level: Double, domains: [String],
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        backgroundQueue.async {
            do {
                let intLevel = Int(level) == -1 ? nil : Int(level)
                let domainsArray: [String]? = domains.isEmpty ? nil : domains
                try LogSinksManager.shared.setConsoleSink(level: intLevel, domains: domainsArray)
                resolve(nil)
            } catch let error as NSError {
                reject("LOGSINKS_ERROR", error.localizedDescription, error)
            } catch {
                reject("LOGSINKS_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func logsinks_SetFile(
        level: Double, config: Any,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        backgroundQueue.async {
            do {
                let intLevel = Int(level) == -1 ? nil : Int(level)
                let configDict = config as? [String: Any]
                try LogSinksManager.shared.setFileSink(level: intLevel, config: configDict)
                resolve(nil)
            } catch let error as NSError {
                reject("LOGSINKS_ERROR", error.localizedDescription, error)
            } catch {
                reject("LOGSINKS_ERROR", error.localizedDescription, nil)
            }
        }
    }

    public func logsinks_SetCustom(
        level: Double, domains: [String], token: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        backgroundQueue.async {
            do {
                let intLevel = Int(level) == -1 ? nil : Int(level)
                let domainsArray = domains.isEmpty ? nil : domains
                let tokenValue = token.isEmpty ? nil : token
                let callback: ((LogLevel, LogDomain, String) -> Void)? =
                    (intLevel != nil && tokenValue != nil) ?
                    { [weak self] logLevel, logDomain, message in
                        guard let self = self else { return }
                        let eventData: [String: Any] = [
                            "token": tokenValue!,
                            "level": logLevel.rawValue,
                            "domain": self.logDomainToString(logDomain),
                            "message": message
                        ]
                        self.sendEventClosure("customLogMessage", eventData)
                    } : nil
                try LogSinksManager.shared.setCustomSink(
                    level: intLevel, domains: domainsArray, callback: callback
                )
                resolve(nil)
            } catch let error as NSError {
                reject("LOGSINKS_ERROR", error.localizedDescription, error)
            } catch {
                reject("LOGSINKS_ERROR", error.localizedDescription, nil)
            }
        }
    }

    private func logDomainToString(_ domain: LogDomain) -> String {
        switch domain {
        case .database:   return "DATABASE"
        case .query:      return "QUERY"
        case .replicator: return "REPLICATOR"
        case .network:    return "NETWORK"
        case .listener:   return "LISTENER"
        default:          return "UNKNOWN"
        }
    }
}
