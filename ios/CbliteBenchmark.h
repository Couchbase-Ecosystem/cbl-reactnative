#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface CbliteBenchmark : NSObject

// Database operations
- (int64_t)openDatabaseWithName:(NSString *)name directory:(NSString *)directory
    NS_SWIFT_NAME(openDatabase(withName:directory:));
- (BOOL)closeDatabaseWithHandle:(int64_t)handle
    NS_SWIFT_NAME(closeDatabase(withHandle:));
- (BOOL)deleteDatabaseWithName:(NSString *)name directory:(NSString *)directory
    NS_SWIFT_NAME(deleteDatabase(withName:directory:));

// Transaction operations (for batch benchmarks)
- (BOOL)beginTransactionWithHandle:(int64_t)handle
    NS_SWIFT_NAME(beginTransaction(withHandle:));
- (BOOL)endTransactionWithHandle:(int64_t)handle commit:(BOOL)commit
    NS_SWIFT_NAME(endTransaction(withHandle:commit:));

// Collection operations
- (int64_t)getDefaultCollectionWithHandle:(int64_t)dbHandle
    NS_SWIFT_NAME(getDefaultCollection(withHandle:));
- (int64_t)createCollectionWithHandle:(int64_t)dbHandle name:(NSString *)name scopeName:(NSString *)scopeName
    NS_SWIFT_NAME(createCollection(withHandle:name:scopeName:));
- (uint64_t)getDocumentCountWithCollectionHandle:(int64_t)collectionHandle
    NS_SWIFT_NAME(getDocumentCount(withCollectionHandle:));

// Document operations
// Returns dict with _id, _revId, _sequence on success; nil on failure
- (nullable NSDictionary *)saveDocumentWithCollectionHandle:(int64_t)collectionHandle documentId:(NSString *)docId jsonData:(NSString *)json
    NS_SWIFT_NAME(saveDocument(withCollectionHandle:documentId:jsonData:));
// Returns dict with _id, _data, _revId, _sequence on success; nil if not found
- (nullable NSDictionary *)getDocumentWithCollectionHandle:(int64_t)collectionHandle documentId:(NSString *)docId
    NS_SWIFT_NAME(getDocument(withCollectionHandle:documentId:));
- (BOOL)deleteDocumentWithCollectionHandle:(int64_t)collectionHandle documentId:(NSString *)docId
    NS_SWIFT_NAME(deleteDocument(withCollectionHandle:documentId:));
- (BOOL)purgeDocumentWithCollectionHandle:(int64_t)collectionHandle documentId:(NSString *)docId
    NS_SWIFT_NAME(purgeDocument(withCollectionHandle:documentId:));

// Query operations
- (nullable NSString *)executeQueryWithDatabaseHandle:(int64_t)dbHandle query:(NSString *)queryString parametersJson:(nullable NSString *)parametersJson
    NS_SWIFT_NAME(executeQuery(withDatabaseHandle:query:parametersJson:));

// Replicator operations
// Creates a replicator. Returns replicator handle (int64_t pointer) or 0 on failure.
// replicatorType: 0 = pushAndPull, 1 = push, 2 = pull (maps to CBLReplicatorType enum)
// collectionHandles: NSArray of NSNumber-wrapped int64_t collection pointers
- (int64_t)createReplicatorWithDatabaseHandle:(int64_t)dbHandle
                           collectionHandles:(NSArray<NSNumber *> *)collectionHandles
                                    endpoint:(NSString *)endpointUrl
                                    username:(nullable NSString *)username
                                    password:(nullable NSString *)password
                              replicatorType:(int)replicatorType
                                  continuous:(BOOL)continuous
    NS_SWIFT_NAME(createReplicator(withDatabaseHandle:collectionHandles:endpoint:username:password:replicatorType:continuous:));

// Starts the replicator. resetCheckpoint discards saved state and re-scans all documents.
- (BOOL)startReplicatorWithHandle:(int64_t)handle resetCheckpoint:(BOOL)resetCheckpoint
    NS_SWIFT_NAME(startReplicator(withHandle:resetCheckpoint:));

// Stops a running replicator.
- (void)stopReplicatorWithHandle:(int64_t)handle
    NS_SWIFT_NAME(stopReplicator(withHandle:));

// Returns current replicator status as a dictionary:
// { activity: int, complete: float, documentCount: uint64, errorDomain: int, errorCode: int, errorMessage: string }
// activity: 0=stopped, 1=offline, 2=connecting, 3=idle, 4=busy
- (nullable NSDictionary *)getReplicatorStatusWithHandle:(int64_t)handle
    NS_SWIFT_NAME(getReplicatorStatus(withHandle:));

// Stops and releases the replicator. Handle must not be used after this call.
- (void)cleanupReplicatorWithHandle:(int64_t)handle
    NS_SWIFT_NAME(cleanupReplicator(withHandle:));

// Echo operation for pure overhead measurement
- (NSString *)echoWithData:(NSString *)data
    NS_SWIFT_NAME(echo(withData:));

@end

NS_ASSUME_NONNULL_END