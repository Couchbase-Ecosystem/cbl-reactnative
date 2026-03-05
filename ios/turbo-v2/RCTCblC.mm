#import "RCTCblC.h"
#import <CouchbaseLiteSpec/CouchbaseLiteSpec.h>
#import <React/RCTBridge+Private.h>

#if __has_include("cbl_reactnative-Swift.h")
#import "cbl_reactnative-Swift.h"
#else
#import <cbl_reactnative/cbl_reactnative-Swift.h>
#endif

@interface RCTCblC () <NativeCblCSpec>
@end

@implementation RCTCblC {
    CblCAdapter *_adapter;
}

RCT_EXPORT_MODULE(CblC)

- (instancetype)init {
    if (self = [super init]) {
        _adapter = [[CblCAdapter alloc] init];
    }
    return self;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeCblCSpecJSI>(params);
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

// Every method below is IDENTICAL to RCTCblSwift.mm except:
//   1. Struct types are JS::NativeCblC::Spec... instead of JS::NativeCblSwift::Spec...
//   2. _adapter is CblCAdapter instead of CblSwiftAdapter
// The method names, field extraction, and adapter calls are the same.

// ── Database ────────────────────────────────────────────────────────────

- (void)database_Open:(JS::NativeCblC::SpecDatabase_OpenArgs &)args
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
    [_adapter databaseOpenWithName:args.name() directory:args.directory() encryptionKey:args.encryptionKey() resolve:resolve reject:reject];
}

- (void)database_Close:(JS::NativeCblC::SpecDatabase_CloseArgs &)args
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
    [_adapter databaseCloseWithName:args.name() resolve:resolve reject:reject];
}

- (void)database_Delete:(JS::NativeCblC::SpecDatabase_DeleteArgs &)args
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    [_adapter databaseDeleteWithName:args.name() resolve:resolve reject:reject];
}

- (void)database_DeleteWithPath:(JS::NativeCblC::SpecDatabase_DeleteWithPathArgs &)args
                        resolve:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject {
    [_adapter databaseDeleteWithPathWithDatabaseName:args.databaseName() directory:args.directory() resolve:resolve reject:reject];
}

- (void)database_GetPath:(JS::NativeCblC::SpecDatabase_GetPathArgs &)args
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
    [_adapter databaseGetPathWithName:args.name() resolve:resolve reject:reject];
}

- (void)database_Exists:(JS::NativeCblC::SpecDatabase_ExistsArgs &)args
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    [_adapter databaseExistsWithDatabaseName:args.databaseName() directory:args.directory() resolve:resolve reject:reject];
}

// ── Collection ──────────────────────────────────────────────────────────

- (void)collection_CreateCollection:(JS::NativeCblC::SpecCollection_CreateCollectionArgs &)args
                            resolve:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionCreateWithCollectionName:args.collectionName() name:args.name() scopeName:args.scopeName() resolve:resolve reject:reject];
}

- (void)collection_DeleteCollection:(JS::NativeCblC::SpecCollection_DeleteCollectionArgs &)args
                            resolve:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionDeleteWithCollectionName:args.collectionName() name:args.name() scopeName:args.scopeName() resolve:resolve reject:reject];
}

- (void)collection_GetCount:(JS::NativeCblC::SpecCollection_GetCountArgs &)args
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionGetCountWithCollectionName:args.collectionName() name:args.name() scopeName:args.scopeName() resolve:resolve reject:reject];
}

// ── Single Document CRUD ────────────────────────────────────────────────

- (void)collection_Save:(JS::NativeCblC::SpecCollection_SaveArgs &)args
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionSaveWithDocument:args.document() blobs:args.blobs() id:args.id_() name:args.name() scopeName:args.scopeName() collectionName:args.collectionName() concurrencyControl:(int)args.concurrencyControl() resolve:resolve reject:reject];
}

- (void)collection_GetDocument:(JS::NativeCblC::SpecCollection_GetDocumentArgs &)args
                       resolve:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionGetDocumentWithDocId:args.docId() name:args.name() scopeName:args.scopeName() collectionName:args.collectionName() resolve:resolve reject:reject];
}

- (void)collection_DeleteDocument:(JS::NativeCblC::SpecCollection_DeleteDocumentArgs &)args
                          resolve:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionDeleteDocumentWithDocId:args.docId() name:args.name() scopeName:args.scopeName() collectionName:args.collectionName() concurrencyControl:(int)args.concurrencyControl() resolve:resolve reject:reject];
}

- (void)collection_PurgeDocument:(JS::NativeCblC::SpecCollection_PurgeDocumentArgs &)args
                         resolve:(RCTPromiseResolveBlock)resolve
                          reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionPurgeDocumentWithDocId:args.docId() name:args.name() scopeName:args.scopeName() collectionName:args.collectionName() resolve:resolve reject:reject];
}

// ── Batch Operations ────────────────────────────────────────────────────

- (void)collection_BatchSave:(JS::NativeCblC::SpecCollection_BatchSaveArgs &)args
                     resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionBatchSaveWithName:args.name() scopeName:args.scopeName() collectionName:args.collectionName() docsJson:args.docsJson() resolve:resolve reject:reject];
}

- (void)collection_BatchGet:(JS::NativeCblC::SpecCollection_BatchGetArgs &)args
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionBatchGetWithName:args.name() scopeName:args.scopeName() collectionName:args.collectionName() docIdsJson:args.docIdsJson() resolve:resolve reject:reject];
}

- (void)collection_BatchDelete:(JS::NativeCblC::SpecCollection_BatchDeleteArgs &)args
                       resolve:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject {
    [_adapter collectionBatchDeleteWithName:args.name() scopeName:args.scopeName() collectionName:args.collectionName() docIdsJson:args.docIdsJson() resolve:resolve reject:reject];
}

// ── Query ───────────────────────────────────────────────────────────────

- (void)query_Execute:(JS::NativeCblC::SpecQuery_ExecuteArgs &)args
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
    NSDictionary *params = (NSDictionary *)args.parameters();
    NSString *paramsJson = nil;
    if (params) {
        NSData *data = [NSJSONSerialization dataWithJSONObject:params options:0 error:nil];
        if (data) paramsJson = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    }
    [_adapter queryExecuteWithQuery:args.query() parametersJson:paramsJson name:args.name() resolve:resolve reject:reject];
}

// ── Replicator ──────────────────────────────────────────────────────────

- (void)replicator_Create:(JS::NativeCblC::SpecReplicator_CreateArgs &)args
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
    [_adapter replicatorCreateWithConfigJson:args.config() resolve:resolve reject:reject];
}

- (void)replicator_Start:(JS::NativeCblC::SpecReplicator_StartArgs &)args
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
    [_adapter replicatorStartWithReplicatorId:args.replicatorId() resolve:resolve reject:reject];
}

- (void)replicator_Stop:(JS::NativeCblC::SpecReplicator_StopArgs &)args
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    [_adapter replicatorStopWithReplicatorId:args.replicatorId() resolve:resolve reject:reject];
}

- (void)replicator_GetStatus:(JS::NativeCblC::SpecReplicator_GetStatusArgs &)args
                     resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject {
    [_adapter replicatorGetStatusWithReplicatorId:args.replicatorId() resolve:resolve reject:reject];
}

- (void)replicator_Cleanup:(JS::NativeCblC::SpecReplicator_CleanupArgs &)args
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
    [_adapter replicatorCleanupWithReplicatorId:args.replicatorId() resolve:resolve reject:reject];
}

@end
