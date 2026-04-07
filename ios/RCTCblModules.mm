#import "RCTCblModules.h"
#import "cbl_reactnative-Swift.h"

// ============================================================
// MARK: - RCTCblDatabase
// ============================================================

@implementation RCTCblDatabase {
    CblDatabaseModule *_impl;
}

- (id)init {
    if (self = [super init]) {
        _impl = [CblDatabaseModule new];
    }
    return self;
}

+ (NSString *)moduleName { return @"CblDatabase"; }

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeCblDatabaseSpecJSI>(params);
}

- (void)database_Open:(NSString *)name
           directory:(NSString *)directory
       encryptionKey:(NSString *)encryptionKey
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
    [_impl database_OpenWithName:name directory:directory encryptionKey:encryptionKey
                         resolve:resolve reject:reject];
}

- (void)database_Close:(NSString *)name
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
    [_impl database_CloseWithName:name resolve:resolve reject:reject];
}

- (void)database_Delete:(NSString *)name
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    [_impl database_DeleteWithName:name resolve:resolve reject:reject];
}

- (void)database_DeleteWithPath:(NSString *)path
                           name:(NSString *)name
                        resolve:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject {
    [_impl database_DeleteWithPathWithPath:path name:name resolve:resolve reject:reject];
}

- (void)database_Copy:(NSString *)path
              newName:(NSString *)newName
            directory:(NSString *)directory
        encryptionKey:(NSString *)encryptionKey
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
    [_impl database_CopyWithPath:path newName:newName directory:directory
                   encryptionKey:encryptionKey resolve:resolve reject:reject];
}

- (void)database_Exists:(NSString *)name
              directory:(NSString *)directory
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    [_impl database_ExistsWithName:name directory:directory resolve:resolve reject:reject];
}

- (void)database_GetPath:(NSString *)name
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
    [_impl database_GetPathWithName:name resolve:resolve reject:reject];
}

- (void)database_PerformMaintenance:(double)maintenanceType
                       databaseName:(NSString *)databaseName
                            resolve:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject {
    [_impl database_PerformMaintenanceWithMaintenanceType:maintenanceType
                                            databaseName:databaseName
                                                 resolve:resolve reject:reject];
}

- (void)database_ChangeEncryptionKey:(NSString *)newKey
                                name:(NSString *)name
                             resolve:(RCTPromiseResolveBlock)resolve
                              reject:(RCTPromiseRejectBlock)reject {
    [_impl database_ChangeEncryptionKeyWithNewKey:newKey name:name resolve:resolve reject:reject];
}

@end

// ============================================================
// MARK: - RCTCblScope
// ============================================================

@implementation RCTCblScope {
    CblScopeModule *_impl;
}

- (id)init {
    if (self = [super init]) {
        _impl = [CblScopeModule new];
    }
    return self;
}

+ (NSString *)moduleName { return @"CblScope"; }

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeCblScopeSpecJSI>(params);
}

- (void)scope_GetDefault:(NSString *)name
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
    [_impl scope_GetDefaultWithName:name resolve:resolve reject:reject];
}

- (void)scope_GetScope:(NSString *)scopeName
                  name:(NSString *)name
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
    [_impl scope_GetScopeWithScopeName:scopeName name:name resolve:resolve reject:reject];
}

- (void)scope_GetScopes:(NSString *)name
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    [_impl scope_GetScopesWithName:name resolve:resolve reject:reject];
}

@end

// ============================================================
// MARK: - RCTCblDocument
// ============================================================

@implementation RCTCblDocument {
    CblDocumentModule *_impl;
}

- (id)init {
    if (self = [super init]) {
        _impl = [CblDocumentModule new];
    }
    return self;
}

+ (NSString *)moduleName { return @"CblDocument"; }

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeCblDocumentSpecJSI>(params);
}

- (void)collection_GetDocument:(NSString *)docId
                          name:(NSString *)name
                     scopeName:(NSString *)scopeName
                collectionName:(NSString *)collectionName
                       resolve:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_GetDocumentWithDocId:docId name:name scopeName:scopeName
                            collectionName:collectionName resolve:resolve reject:reject];
}

- (void)collection_Save:(NSString *)document
                  blobs:(NSString *)blobs
                  docId:(NSString *)docId
                   name:(NSString *)name
              scopeName:(NSString *)scopeName
         collectionName:(NSString *)collectionName
concurrencyControlValue:(double)concurrencyControlValue
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_SaveWithDocument:document blobs:blobs docId:docId name:name
                             scopeName:scopeName collectionName:collectionName
               concurrencyControlValue:concurrencyControlValue resolve:resolve reject:reject];
}

- (void)collection_DeleteDocument:(NSString *)docId
                             name:(NSString *)name
                        scopeName:(NSString *)scopeName
                   collectionName:(NSString *)collectionName
               concurrencyControl:(double)concurrencyControl
                          resolve:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_DeleteDocumentWithDocId:docId name:name scopeName:scopeName
                               collectionName:collectionName
                           concurrencyControl:concurrencyControl
                                      resolve:resolve reject:reject];
}

- (void)collection_PurgeDocument:(NSString *)docId
                            name:(NSString *)name
                       scopeName:(NSString *)scopeName
                  collectionName:(NSString *)collectionName
                         resolve:(RCTPromiseResolveBlock)resolve
                          reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_PurgeDocumentWithDocId:docId name:name scopeName:scopeName
                              collectionName:collectionName resolve:resolve reject:reject];
}

- (void)collection_GetDocumentExpiration:(NSString *)docId
                                    name:(NSString *)name
                               scopeName:(NSString *)scopeName
                          collectionName:(NSString *)collectionName
                                 resolve:(RCTPromiseResolveBlock)resolve
                                  reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_GetDocumentExpirationWithDocId:docId name:name scopeName:scopeName
                                     collectionName:collectionName resolve:resolve reject:reject];
}

- (void)collection_SetDocumentExpiration:(NSString *)expiration
                                   docId:(NSString *)docId
                                    name:(NSString *)name
                               scopeName:(NSString *)scopeName
                          collectionName:(NSString *)collectionName
                                 resolve:(RCTPromiseResolveBlock)resolve
                                  reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_SetDocumentExpirationWithExpiration:expiration docId:docId name:name
                                               scopeName:scopeName collectionName:collectionName
                                                 resolve:resolve reject:reject];
}

- (void)collection_GetBlobContent:(NSString *)key
                       documentId:(NSString *)documentId
                             name:(NSString *)name
                        scopeName:(NSString *)scopeName
                   collectionName:(NSString *)collectionName
                          resolve:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_GetBlobContentWithKey:key documentId:documentId name:name
                                  scopeName:scopeName collectionName:collectionName
                                    resolve:resolve reject:reject];
}

@end

// ============================================================
// MARK: - RCTCblEngine
// ============================================================

@implementation RCTCblEngine {
    CblEngineModule *_impl;
}

- (id)init {
    if (self = [super init]) {
        _impl = [CblEngineModule new];
    }
    return self;
}

+ (NSString *)moduleName { return @"CblEngine"; }

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeCblEngineSpecJSI>(params);
}

- (void)file_GetDefaultPath:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
    [_impl file_GetDefaultPathWithResolve:resolve reject:reject];
}

- (void)listenerToken_Remove:(NSString *)changeListenerToken
                     resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject {
    [_impl listenerToken_RemoveWithChangeListenerToken:changeListenerToken
                                              resolve:resolve reject:reject];
}

@end

// ============================================================
// MARK: - RCTCblCollection
// ============================================================

@implementation RCTCblCollection {
    CblCollectionModule *_impl;
}

- (id)init {
    if (self = [super init]) {
        __weak typeof(self) weakSelf = self;
        _impl = [[CblCollectionModule alloc] initWithSendEvent:^(NSString *name, id body) {
            [weakSelf sendEventWithName:name body:body];
        }];
    }
    return self;
}

+ (NSString *)moduleName { return @"CblCollection"; }

- (NSArray<NSString *> *)supportedEvents {
    return @[@"collectionChange", @"collectionDocumentChange"];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeCblCollectionSpecJSI>(params);
}

- (void)collection_CreateCollection:(NSString *)collectionName name:(NSString *)name
                          scopeName:(NSString *)scopeName resolve:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_CreateCollectionWithCollectionName:collectionName name:name
                                              scopeName:scopeName resolve:resolve reject:reject];
}

- (void)collection_DeleteCollection:(NSString *)collectionName name:(NSString *)name
                          scopeName:(NSString *)scopeName resolve:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_DeleteCollectionWithCollectionName:collectionName name:name
                                              scopeName:scopeName resolve:resolve reject:reject];
}

- (void)collection_GetCollection:(NSString *)collectionName name:(NSString *)name
                       scopeName:(NSString *)scopeName resolve:(RCTPromiseResolveBlock)resolve
                          reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_GetCollectionWithCollectionName:collectionName name:name
                                           scopeName:scopeName resolve:resolve reject:reject];
}

- (void)collection_GetCollections:(NSString *)name scopeName:(NSString *)scopeName
                          resolve:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_GetCollectionsWithName:name scopeName:scopeName
                                     resolve:resolve reject:reject];
}

- (void)collection_GetDefault:(NSString *)name resolve:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_GetDefaultWithName:name resolve:resolve reject:reject];
}

- (void)collection_GetCount:(NSString *)collectionName name:(NSString *)name
                  scopeName:(NSString *)scopeName resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_GetCountWithCollectionName:collectionName name:name
                                      scopeName:scopeName resolve:resolve reject:reject];
}

- (void)collection_GetFullName:(NSString *)collectionName name:(NSString *)name
                     scopeName:(NSString *)scopeName resolve:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_GetFullNameWithCollectionName:collectionName name:name
                                         scopeName:scopeName resolve:resolve reject:reject];
}

- (void)collection_CreateIndex:(NSString *)indexName index:(id)index
                collectionName:(NSString *)collectionName scopeName:(NSString *)scopeName
                          name:(NSString *)name resolve:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_CreateIndexWithIndexName:indexName index:index
                                collectionName:collectionName scopeName:scopeName
                                          name:name resolve:resolve reject:reject];
}

- (void)collection_DeleteIndex:(NSString *)indexName collectionName:(NSString *)collectionName
                     scopeName:(NSString *)scopeName name:(NSString *)name
                       resolve:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_DeleteIndexWithIndexName:indexName collectionName:collectionName
                                     scopeName:scopeName name:name resolve:resolve reject:reject];
}

- (void)collection_GetIndexes:(NSString *)collectionName scopeName:(NSString *)scopeName
                         name:(NSString *)name resolve:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_GetIndexesWithCollectionName:collectionName scopeName:scopeName
                                              name:name resolve:resolve reject:reject];
}

- (void)collection_AddChangeListener:(NSString *)changeListenerToken
                      collectionName:(NSString *)collectionName name:(NSString *)name
                           scopeName:(NSString *)scopeName resolve:(RCTPromiseResolveBlock)resolve
                              reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_AddChangeListenerWithChangeListenerToken:changeListenerToken
                                               collectionName:collectionName name:name
                                                    scopeName:scopeName
                                                      resolve:resolve reject:reject];
}

- (void)collection_AddDocumentChangeListener:(NSString *)changeListenerToken
                                  documentId:(NSString *)documentId
                              collectionName:(NSString *)collectionName
                                        name:(NSString *)name scopeName:(NSString *)scopeName
                                     resolve:(RCTPromiseResolveBlock)resolve
                                      reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_AddDocumentChangeListenerWithChangeListenerToken:changeListenerToken
                                                           documentId:documentId
                                                       collectionName:collectionName
                                                                 name:name scopeName:scopeName
                                                              resolve:resolve reject:reject];
}

- (void)collection_RemoveChangeListener:(NSString *)changeListenerToken
                                resolve:(RCTPromiseResolveBlock)resolve
                                 reject:(RCTPromiseRejectBlock)reject {
    [_impl collection_RemoveChangeListenerWithChangeListenerToken:changeListenerToken
                                                         resolve:resolve reject:reject];
}

@end

// ============================================================
// MARK: - RCTCblQuery
// ============================================================

@implementation RCTCblQuery {
    CblQueryModule *_impl;
}

- (id)init {
    if (self = [super init]) {
        __weak typeof(self) weakSelf = self;
        _impl = [[CblQueryModule alloc] initWithSendEvent:^(NSString *name, id body) {
            [weakSelf sendEventWithName:name body:body];
        }];
    }
    return self;
}

+ (NSString *)moduleName { return @"CblQuery"; }

- (NSArray<NSString *> *)supportedEvents { return @[@"queryChange"]; }

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeCblQuerySpecJSI>(params);
}

- (void)query_Execute:(NSString *)query parameters:(id)parameters name:(NSString *)name
              resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [_impl query_ExecuteWithQuery:query parameters:parameters name:name
                          resolve:resolve reject:reject];
}

- (void)query_Explain:(NSString *)query parameters:(id)parameters name:(NSString *)name
              resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [_impl query_ExplainWithQuery:query parameters:parameters name:name
                          resolve:resolve reject:reject];
}

- (void)query_AddChangeListener:(NSString *)changeListenerToken query:(NSString *)query
                     parameters:(id)parameters name:(NSString *)name
                        resolve:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject {
    [_impl query_AddChangeListenerWithChangeListenerToken:changeListenerToken query:query
                                              parameters:parameters name:name
                                                 resolve:resolve reject:reject];
}

- (void)query_RemoveChangeListener:(NSString *)changeListenerToken
                           resolve:(RCTPromiseResolveBlock)resolve
                            reject:(RCTPromiseRejectBlock)reject {
    [_impl query_RemoveChangeListenerWithChangeListenerToken:changeListenerToken
                                                    resolve:resolve reject:reject];
}

@end

// ============================================================
// MARK: - RCTCblLogging
// ============================================================

@implementation RCTCblLogging {
    CblLoggingModule *_impl;
}

- (id)init {
    if (self = [super init]) {
        __weak typeof(self) weakSelf = self;
        _impl = [[CblLoggingModule alloc] initWithSendEvent:^(NSString *name, id body) {
            [weakSelf sendEventWithName:name body:body];
        }];
    }
    return self;
}

+ (NSString *)moduleName { return @"CblLogging"; }

- (NSArray<NSString *> *)supportedEvents { return @[@"customLogMessage"]; }

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeCblLoggingSpecJSI>(params);
}

- (void)database_SetLogLevel:(NSString *)domain logLevel:(double)logLevel
                     resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject {
    [_impl database_SetLogLevelWithDomain:domain logLevel:logLevel
                                  resolve:resolve reject:reject];
}

- (void)database_SetFileLoggingConfig:(NSString *)name directory:(NSString *)directory
                             logLevel:(double)logLevel maxSize:(double)maxSize
                       maxRotateCount:(double)maxRotateCount
                    shouldUsePlainText:(BOOL)shouldUsePlainText
                               resolve:(RCTPromiseResolveBlock)resolve
                                reject:(RCTPromiseRejectBlock)reject {
    [_impl database_SetFileLoggingConfigWithName:name directory:directory logLevel:logLevel
                                        maxSize:maxSize maxRotateCount:maxRotateCount
                              shouldUsePlainText:shouldUsePlainText
                                        resolve:resolve reject:reject];
}

- (void)logsinks_SetConsole:(double)level domains:(NSArray<NSString *> *)domains
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
    [_impl logsinks_SetConsoleWithLevel:level domains:domains resolve:resolve reject:reject];
}

- (void)logsinks_SetFile:(double)level config:(id)config
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
    [_impl logsinks_SetFileWithLevel:level config:config resolve:resolve reject:reject];
}

- (void)logsinks_SetCustom:(double)level domains:(NSArray<NSString *> *)domains
                     token:(NSString *)token resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
    [_impl logsinks_SetCustomWithLevel:level domains:domains token:token
                               resolve:resolve reject:reject];
}

@end

// ============================================================
// MARK: - RCTCblReplicator
// ============================================================

@implementation RCTCblReplicator {
    CblReplicatorModule *_impl;
}

- (id)init {
    if (self = [super init]) {
        __weak typeof(self) weakSelf = self;
        _impl = [[CblReplicatorModule alloc] initWithSendEvent:^(NSString *name, id body) {
            [weakSelf sendEventWithName:name body:body];
        }];
    }
    return self;
}

+ (NSString *)moduleName { return @"CblReplicator"; }

- (NSArray<NSString *> *)supportedEvents {
    return @[@"replicatorStatusChange", @"replicatorDocumentChange"];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeCblReplicatorSpecJSI>(params);
}

- (void)replicator_Create:(id)config resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
    [_impl replicator_CreateWithConfig:config resolve:resolve reject:reject];
}

- (void)replicator_Start:(NSString *)replicatorId resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
    [_impl replicator_StartWithReplicatorId:replicatorId resolve:resolve reject:reject];
}

- (void)replicator_Stop:(NSString *)replicatorId resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    [_impl replicator_StopWithReplicatorId:replicatorId resolve:resolve reject:reject];
}

- (void)replicator_Cleanup:(NSString *)replicatorId resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
    [_impl replicator_CleanupWithReplicatorId:replicatorId resolve:resolve reject:reject];
}

- (void)replicator_GetStatus:(NSString *)replicatorId resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject {
    [_impl replicator_GetStatusWithReplicatorId:replicatorId resolve:resolve reject:reject];
}

- (void)replicator_ResetCheckpoint:(NSString *)replicatorId
                           resolve:(RCTPromiseResolveBlock)resolve
                            reject:(RCTPromiseRejectBlock)reject {
    [_impl replicator_ResetCheckpointWithReplicatorId:replicatorId resolve:resolve reject:reject];
}

- (void)replicator_GetPendingDocumentIds:(NSString *)replicatorId name:(NSString *)name
                               scopeName:(NSString *)scopeName
                          collectionName:(NSString *)collectionName
                                 resolve:(RCTPromiseResolveBlock)resolve
                                  reject:(RCTPromiseRejectBlock)reject {
    [_impl replicator_GetPendingDocumentIdsWithReplicatorId:replicatorId name:name
                                                 scopeName:scopeName
                                            collectionName:collectionName
                                                   resolve:resolve reject:reject];
}

- (void)replicator_IsDocumentPending:(NSString *)documentId
                         replicatorId:(NSString *)replicatorId name:(NSString *)name
                            scopeName:(NSString *)scopeName
                       collectionName:(NSString *)collectionName
                              resolve:(RCTPromiseResolveBlock)resolve
                               reject:(RCTPromiseRejectBlock)reject {
    [_impl replicator_IsDocumentPendingWithDocumentId:documentId replicatorId:replicatorId
                                                name:name scopeName:scopeName
                                      collectionName:collectionName
                                             resolve:resolve reject:reject];
}

- (void)replicator_AddChangeListener:(NSString *)changeListenerToken
                         replicatorId:(NSString *)replicatorId
                              resolve:(RCTPromiseResolveBlock)resolve
                               reject:(RCTPromiseRejectBlock)reject {
    [_impl replicator_AddChangeListenerWithChangeListenerToken:changeListenerToken
                                                 replicatorId:replicatorId
                                                      resolve:resolve reject:reject];
}

- (void)replicator_AddDocumentChangeListener:(NSString *)changeListenerToken
                                 replicatorId:(NSString *)replicatorId
                                      resolve:(RCTPromiseResolveBlock)resolve
                                       reject:(RCTPromiseRejectBlock)reject {
    [_impl replicator_AddDocumentChangeListenerWithChangeListenerToken:changeListenerToken
                                                         replicatorId:replicatorId
                                                              resolve:resolve reject:reject];
}

- (void)replicator_RemoveChangeListener:(NSString *)changeListenerToken
                            replicatorId:(NSString *)replicatorId
                                 resolve:(RCTPromiseResolveBlock)resolve
                                  reject:(RCTPromiseRejectBlock)reject {
    [_impl replicator_RemoveChangeListenerWithChangeListenerToken:changeListenerToken
                                                    replicatorId:replicatorId
                                                         resolve:resolve reject:reject];
}

@end
