#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(CblReactnative, RCTEventEmitter)

// MARK: - Collection Functions

RCT_EXTERN_METHOD(collection_CreateCollection:
  (NSString *) collectionName
  fromDatabaseWithName:(NSString *) name
  fromScopeWithName:(NSString *) scopeName
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_CreateIndex:
  (NSString *) indexName
  withIndexData:(NSDictionary *)index
  fromCollectionWithName:(NSString *) collectionName
  fromScopeWithName:(NSString *) scopeName
  fromDatabaseWithName:(NSString *) name
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_DeleteCollection:
  (NSString *) collectionName
  fromDatabaseWithName:(NSString *) name
  fromScopeWithName:(NSString *) scopeName
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_DeleteDocument:
  (NSString *) docId
  fromDatabaseWithName:(NSString *) name
  fromScopeWithName:(NSString *) scopeName
  FromCollectionWithName:(NSString *) collectionName
  withOptionalConcurrencyControl:(nonnull NSNumber *) concurrencyControlValue
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_DeleteIndex:
  (NSString *) indexName
  fromCollectionWithName:(NSString *) collectionName
  fromScopeWithName:(NSString *) scopeName
  fromDatabaseWithName:(NSString *) name
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_GetBlobContent:
  (NSString *) key
  fromDocumentWithId:(NSString *) docId
  fromDatabaseWithName:(NSString *) name
  fromScopeWithName:(NSString *) scopeName
  fromCollectionWithName:(NSString *) collectionName
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_GetDocument:
  (NSString *) docId
  fromDatabaseWithName:(NSString *) name
  fromScopeWithName:(NSString *) scopeName
  fromCollectionWithName:(NSString *) collectionName
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_GetCollection:
  (NSString *)collectionName
  fromDatabaseWithName:(NSString *) name
  fromScopeWithName:(NSString *) scopeName
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_GetCollections:
  (NSString *) name
  fromScopeWithName:(NSString *) scopeName
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_GetCount:
  (NSString *) collectionName
  fromDatabaseWithName:(NSString *) name
  fromScopeWithName:(NSString *) scopeName
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_GetDefault:
  (NSString *)name
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_GetDocument:
  (NSString *) docId
  fromDatabaseWithName:(NSString *) name
  fromScopeWithName:(NSString *) scopeName
  fromCollectionWithName:(NSString *) collectionName
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_GetDocumentExpiration:
  (NSString *) docId
  fromDatabaseWithName:(NSString *) name
  fromScopeWithName:(NSString *) scopeName
  fromCollectionWithName:(NSString *) collectionName
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_GetIndexes:
  (NSString *) collectionName
  fromScopeWithName:(NSString *) scopeName
  fromDatabaseWithName:(NSString *) name
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_PurgeDocument:
  (NSString *) docId
  fromDatabaseWithName:(NSString *) name
  fromScopeWithName:(NSString *) scopeName
  fromCollectionWithName:(NSString *) collectionName
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_Save:
  (NSDictionary *) document
  withDocumentId: (NSString *) docId
  fromDatabaseWithName:(NSString *) name
  fromScopeWithName:(NSString *) scopeName
  fromCollectionWithName:(NSString *) collectionName
  withOptionalConcurrencyControl:(nonnull NSNumber *) concurrencyControlValue
  withResolver:(RCTPromiseResolveBlock) resolve
  withRejecter:(RCTPromiseRejectBlock) reject)

RCT_EXTERN_METHOD(collection_SetDocumentExpiration:
  (NSString *) expiration
  forDocumentWithId:(NSString *) docId
  fromDatabaseWithName:(NSString *) name
  fromScopeWithName:(NSString *) scopeName
  fromCollectionWithName:(NSString *) collectionName
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

// MARK: - Database Functions

RCT_EXTERN_METHOD(database_ChangeEncryptionKey:
  (NSString *)newKey
  withDatabaseName:(NSString *)name
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(database_Close:(NSString *)name
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(database_Copy:(NSString)path
  withNewName:(NSString *)newName
  withDirectory:(NSString *)directory
  withEncryptionKey:(NSString *)encryptionKey
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(database_Delete:(NSString *)name 
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(database_DeleteWithPath:(NSString *)path
    fromDatabaseWithName:(NSString *)name
    withResolver:(RCTPromiseResolveBlock)resolve
    withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(database_Exists:(NSString *)name
    withDirectory:(NSString *)directory
    withResolver:(RCTPromiseResolveBlock)resolve
    withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(database_GetPath:(NSString *)name
    withResolver:(RCTPromiseResolveBlock)resolve
    withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(database_Open:(NSString *)name
    withDirectory:(NSString *)directory 
    withEncryptionKey:(NSString *)encryptionKey 
    withResolver:(RCTPromiseResolveBlock)resolve
    withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(database_PerformMaintenance:
    (nonnull NSNumber *)maintenanceType
    forDatabaseWithName:(NSString *)databaseName
    withResolver:(RCTPromiseResolveBlock)resolve
    withRejecter:(RCTPromiseRejectBlock)reject)

// MARK: - File System Functions

RCT_EXTERN_METHOD(file_GetDefaultPath:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

// MARK: - Logging Functions

RCT_EXTERN_METHOD(database_SetFileLoggingConfig:
    (NSString *)databaseName
    withDirectory:(NSString *)directory
    withLogLevel:(nonnull NSNumber *)logLevel
    withMaxSize:(nonnull NSNumber *)maxSize
    withMaxCount:(nonnull NSNumber *)maxRotateCount
    shouldUsePlainText:(BOOL)usePlainText
    withResolver:(RCTPromiseResolveBlock)resolve
    withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(database_SetLogLevel:(NSString *)domain
    withLogLevel:(nonnull NSNumber *)logLevel
    withResolver:(RCTPromiseResolveBlock)resolve
    withRejecter:(RCTPromiseRejectBlock)reject)

// MARK: - SQL++ Query Functions

RCT_EXTERN_METHOD(query_Execute:
  (NSString *)query
  withParameters: (NSDictionary *)parameters
  fromDatabaseWithName:(NSString *)name
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(query_Explain:
  (NSString *)query
  withParameters: (NSDictionary *)parameters
  fromDatabaseWithName:(NSString *)name
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

// MARK: - Replicator Functions

RCT_EXTERN_METHOD(replicator_AddChangeListener:
  (NSString *)changeListenerToken
  withReplicatorId:(NSString *)replicatorId
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(replicator_Cleanup:
  (NSString *)replicatorId
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(replicator_Create:
  (NSDictionary *)config
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(replicator_GetPendingDocumentIds:
                  (NSString *)replicatorId
                  fromDatabaseWithName:(NSString *) name
                  fromScopeWithName:(NSString *) scopeName
                  fromCollectionWithName:(NSString *) collectionName
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(replicator_GetStatus:
  (NSString *)replicatorId
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(replicator_IsDocumentPending:
  (NSString *)documentId
  fromReplicatorWithId:(NSString *) replicatorId
  fromDatabaseWithName:(NSString *) name
  fromScopeWithName:(NSString *) scopeName
  fromCollectionWithName:(NSString *) collectionName
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(replicator_ResetCheckpoint:
                  (NSString *)replicatorId
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(replicator_RemoveChangeListener:
                  (NSString *)changeListenerToken
                  withReplicatorId:(NSString *)replicatorId
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(replicator_Start:
                  (NSString *)replicatorId
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(replicator_Stop:
                  (NSString *)replicatorId
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

// MARK: - Scope Functions
RCT_EXTERN_METHOD(scope_GetDefault:
  (NSString *)name
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(scope_GetScope:
  (NSString *)scopeName
  fromDatabaseWithName:(NSString *)name
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)


RCT_EXTERN_METHOD(scope_GetScopes:(NSString *)name
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

@end
