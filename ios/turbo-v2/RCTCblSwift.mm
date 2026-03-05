#import "RCTCblSwift.h"
#import <CouchbaseLiteSpec/CouchbaseLiteSpec.h>
#import <React/RCTBridge+Private.h>

// Import the auto-generated Swift header (exposes CblSwiftAdapter to ObjC)
#if __has_include("cbl_reactnative-Swift.h")
#import "cbl_reactnative-Swift.h"
#else
#import <cbl_reactnative/cbl_reactnative-Swift.h>
#endif

@interface RCTCblSwift () <NativeCblSwiftSpec>
@end

@implementation RCTCblSwift {
    CblSwiftAdapter *_adapter;
}

RCT_EXPORT_MODULE(CblSwift)

- (instancetype)init {
    if (self = [super init]) {
        _adapter = [[CblSwiftAdapter alloc] init];
    }
    return self;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeCblSwiftSpecJSI>(params);
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

// ── Database ────────────────────────────────────────────────────────────
// Each method receives a Codegen-generated struct for the `args` object.
// Extract fields via typed accessors, then forward to the Swift adapter.

- (void)database_Open:(JS::NativeCblSwift::SpecDatabase_OpenArgs &)args
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
    NSString *name = args.name();
    NSString *directory = args.directory();
    NSString *encryptionKey = args.encryptionKey();
    [_adapter databaseOpenWithName:name directory:directory encryptionKey:encryptionKey resolve:resolve reject:reject];
}

- (void)database_Close:(JS::NativeCblSwift::SpecDatabase_CloseArgs &)args
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
    [_adapter databaseCloseWithName:args.name() resolve:resolve reject:reject];
}

- (void)database_Delete:(JS::NativeCblSwift::SpecDatabase_DeleteArgs &)args
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    [_adapter databaseDeleteWithName:args.name() resolve:resolve reject:reject];
}

- (void)database_DeleteWithPath:(JS::NativeCblSwift::SpecDatabase_DeleteWithPathArgs &)args
                        resolve:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject {
    [_adapter databaseDeleteWithPathWithDatabaseName:args.databaseName() directory:args.directory() resolve:resolve reject:reject];
}

- (void)database_GetPath:(JS::NativeCblSwift::SpecDatabase_GetPathArgs &)args
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
    [_adapter databaseGetPathWithName:args.name() resolve:resolve reject:reject];
}

- (void)database_Exists:(JS::NativeCblSwift::SpecDatabase_ExistsArgs &)args
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    [_adapter databaseExistsWithDatabaseName:args.databaseName() directory:args.directory() resolve:resolve reject:reject];
}

// ── Collection ──────────────────────────────────────────────────────────

- (void)collection_CreateCollection:(JS::NativeCblSwift::SpecCollection_CreateCollectionArgs &)args
                            resolve:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionCreateWithCollectionName:args.collectionName()
                                            name:args.name()
                                       scopeName:args.scopeName()
                                         resolve:resolve reject:reject];
}

- (void)collection_DeleteCollection:(JS::NativeCblSwift::SpecCollection_DeleteCollectionArgs &)args
                            resolve:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionDeleteWithCollectionName:args.collectionName()
                                            name:args.name()
                                       scopeName:args.scopeName()
                                         resolve:resolve reject:reject];
}

- (void)collection_GetCount:(JS::NativeCblSwift::SpecCollection_GetCountArgs &)args
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionGetCountWithCollectionName:args.collectionName()
                                              name:args.name()
                                         scopeName:args.scopeName()
                                           resolve:resolve reject:reject];
}

// ── Single Document CRUD ────────────────────────────────────────────────

- (void)collection_Save:(JS::NativeCblSwift::SpecCollection_SaveArgs &)args
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionSaveWithDocument:args.document()
                                   blobs:args.blobs()
                                      id:args.id_()
                                    name:args.name()
                               scopeName:args.scopeName()
                          collectionName:args.collectionName()
                      concurrencyControl:(int)args.concurrencyControl()
                                 resolve:resolve reject:reject];
}

- (void)collection_GetDocument:(JS::NativeCblSwift::SpecCollection_GetDocumentArgs &)args
                       resolve:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionGetDocumentWithDocId:args.docId()
                                        name:args.name()
                                   scopeName:args.scopeName()
                              collectionName:args.collectionName()
                                     resolve:resolve reject:reject];
}

- (void)collection_DeleteDocument:(JS::NativeCblSwift::SpecCollection_DeleteDocumentArgs &)args
                          resolve:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionDeleteDocumentWithDocId:args.docId()
                                           name:args.name()
                                      scopeName:args.scopeName()
                                 collectionName:args.collectionName()
                             concurrencyControl:(int)args.concurrencyControl()
                                        resolve:resolve reject:reject];
}

- (void)collection_PurgeDocument:(JS::NativeCblSwift::SpecCollection_PurgeDocumentArgs &)args
                         resolve:(RCTPromiseResolveBlock)resolve
                          reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionPurgeDocumentWithDocId:args.docId()
                                          name:args.name()
                                     scopeName:args.scopeName()
                                collectionName:args.collectionName()
                                       resolve:resolve reject:reject];
}

// ── Batch Operations ────────────────────────────────────────────────────

- (void)collection_BatchSave:(JS::NativeCblSwift::SpecCollection_BatchSaveArgs &)args
                     resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionBatchSaveWithName:args.name()
                                scopeName:args.scopeName()
                           collectionName:args.collectionName()
                                 docsJson:args.docsJson()
                                  resolve:resolve reject:reject];
}

- (void)collection_BatchGet:(JS::NativeCblSwift::SpecCollection_BatchGetArgs &)args
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionBatchGetWithName:args.name()
                               scopeName:args.scopeName()
                          collectionName:args.collectionName()
                              docIdsJson:args.docIdsJson()
                                 resolve:resolve reject:reject];
}

- (void)collection_BatchDelete:(JS::NativeCblSwift::SpecCollection_BatchDeleteArgs &)args
                       resolve:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionBatchDeleteWithName:args.name()
                                 scopeName:args.scopeName()
                            collectionName:args.collectionName()
                                docIdsJson:args.docIdsJson()
                                   resolve:resolve reject:reject];
}

// ── Query ───────────────────────────────────────────────────────────────

- (void)query_Execute:(JS::NativeCblSwift::SpecQuery_ExecuteArgs &)args
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
    // parameters comes as NSDictionary* (from Object type in spec); convert to JSON string for adapter
    NSDictionary *params = (NSDictionary *)args.parameters();
    NSString *paramsJson = nil;
    if (params) {
        NSData *data = [NSJSONSerialization dataWithJSONObject:params options:0 error:nil];
        if (data) paramsJson = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    }
    [_adapter queryExecuteWithQuery:args.query() parametersJson:paramsJson name:args.name() resolve:resolve reject:reject];
}

// ── Replicator ──────────────────────────────────────────────────────────

- (void)replicator_Create:(JS::NativeCblSwift::SpecReplicator_CreateArgs &)args
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
    [_adapter replicatorCreateWithConfigJson:args.config() resolve:resolve reject:reject];
}

- (void)replicator_Start:(JS::NativeCblSwift::SpecReplicator_StartArgs &)args
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
    [_adapter replicatorStartWithReplicatorId:args.replicatorId() resolve:resolve reject:reject];
}

- (void)replicator_Stop:(JS::NativeCblSwift::SpecReplicator_StopArgs &)args
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    [_adapter replicatorStopWithReplicatorId:args.replicatorId() resolve:resolve reject:reject];
}

- (void)replicator_GetStatus:(JS::NativeCblSwift::SpecReplicator_GetStatusArgs &)args
                     resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject {
    [_adapter replicatorGetStatusWithReplicatorId:args.replicatorId() resolve:resolve reject:reject];
}

- (void)replicator_Cleanup:(JS::NativeCblSwift::SpecReplicator_CleanupArgs &)args
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
    [_adapter replicatorCleanupWithReplicatorId:args.replicatorId() resolve:resolve reject:reject];
}

// ── Screen / Utility ───────────────────────────────────────────────────

- (void)setKeepScreenAwake:(JS::NativeCblSwift::SpecSetKeepScreenAwakeArgs &)args
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
    [_adapter setKeepScreenAwakeWithEnabled:args.enabled() resolve:resolve reject:reject];
}

@end
