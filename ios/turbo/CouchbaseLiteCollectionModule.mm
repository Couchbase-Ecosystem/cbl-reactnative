#import <React/RCTBridgeModule.h>

/**
 * Objective-C++ bridge for CouchbaseLiteCollection Turbo Module
 * 
 * This file exposes the Swift implementation to React Native's Turbo Module system.
 * Using .mm extension enables C++ features needed for JSI/Turbo Modules.
 */

@interface RCT_EXTERN_MODULE(CouchbaseLiteCollection, NSObject)

RCT_EXTERN_METHOD(collection_Save:(NSString *)document
                  blobs:(NSString *)blobs
                  id:(NSString *)id
                  databaseName:(NSString *)databaseName
                  scopeName:(NSString *)scopeName
                  collectionName:(NSString *)collectionName
                  concurrencyControlValue:(nonnull NSNumber *)concurrencyControlValue
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_GetDocument:(NSString *)docId
                  databaseName:(NSString *)databaseName
                  scopeName:(NSString *)scopeName
                  collectionName:(NSString *)collectionName
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_GetCollection:(NSString *)collectionName
                  databaseName:(NSString *)databaseName
                  scopeName:(NSString *)scopeName
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_CreateCollection:(NSString *)collectionName
                  databaseName:(NSString *)databaseName
                  scopeName:(NSString *)scopeName
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_Echo:(NSString *)data
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// TRUE SYNCHRONOUS - no Promise, direct return!
// Uses isBlockingSynchronousMethod = true equivalent
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(collection_EchoSync:(NSString *)data)

RCT_EXTERN_METHOD(collection_PerformanceCheckTurbo:(double)iterations
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// TRUE SYNCHRONOUS - no Promise, direct return!
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(collection_PerformanceCheckTurboSync:(double)iterations)

// Batch echo sync
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(collection_BatchEchoSync:(double)count)

RCT_EXTERN_METHOD(collection_GetCount:(NSString *)collectionName
                  databaseName:(NSString *)databaseName
                  scopeName:(NSString *)scopeName
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_GetIndexes:(NSString *)collectionName
                  scopeName:(NSString *)scopeName
                  databaseName:(NSString *)databaseName
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(collection_GetCollections:(NSString *)databaseName
                  scopeName:(NSString *)scopeName
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// =============================================================================
// C Library Benchmark Methods - TRUE SYNCHRONOUS (for SDK vs C comparison)
// =============================================================================

// Database operations
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(clib_OpenDatabase:(NSString *)name directory:(NSString *)directory)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(clib_CloseDatabase:(double)handle)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(clib_DeleteDatabase:(NSString *)name directory:(NSString *)directory)

// Collection operations
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(clib_GetDefaultCollection:(double)dbHandle)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(clib_CreateCollection:(double)dbHandle name:(NSString *)name scopeName:(NSString *)scopeName)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(clib_GetDocumentCount:(double)collectionHandle)

// Document operations
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(clib_SaveDocument:(double)collectionHandle docId:(NSString *)docId jsonData:(NSString *)jsonData)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(clib_GetDocument:(double)collectionHandle docId:(NSString *)docId)

// Transaction operations
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(clib_BeginTransaction:(double)dbHandle)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(clib_EndTransaction:(double)dbHandle commit:(BOOL)commit)

// Echo for pure overhead measurement
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(clib_Echo:(NSString *)data)

// Legacy benchmark method (kept for compatibility)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(benchmarkCLibraryOpenClose:(NSString *)name directory:(NSString *)directory)

// =============================================================================
// SYNC vs ASYNC COMPARISON TEST METHODS
// =============================================================================

// Swift SDK Sync Save (TRUE SYNCHRONOUS - no Promise, direct return)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(collection_SaveSync:(NSString *)document
                                        blobs:(NSString *)blobs
                                        id:(NSString *)id
                                        databaseName:(NSString *)databaseName
                                        scopeName:(NSString *)scopeName
                                        collectionName:(NSString *)collectionName
                                        concurrencyControlValue:(nonnull NSNumber *)concurrencyControlValue)

// C Library Async Methods (with Promise - for fair sync vs async comparison)
RCT_EXTERN_METHOD(clib_OpenDatabaseAsync:(NSString *)name
                  directory:(NSString *)directory
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clib_GetDefaultCollectionAsync:(double)dbHandle
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clib_SaveDocumentAsync:(double)collectionHandle
                  docId:(NSString *)docId
                  jsonData:(NSString *)jsonData
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clib_CloseDatabaseAsync:(double)handle
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clib_DeleteDatabaseAsync:(NSString *)name
                  directory:(NSString *)directory
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// =============================================================================
// MINIMAL SWIFT METHODS (Collection Handle Approach - Fair C Comparison)
// =============================================================================
// These methods mirror the C library approach: cache collection once, use handle

// Get collection handle (cache collection for subsequent operations)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(swift_GetCollectionHandle:(NSString *)databaseName
                                        scopeName:(NSString *)scopeName
                                        collectionName:(NSString *)collectionName)

// Minimal save using cached collection - SYNC (no lookup, no blobs, no concurrency control)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(swift_SaveDocumentMinimalSync:(double)collectionHandle
                                        docId:(NSString *)docId
                                        jsonData:(NSString *)jsonData)

// Minimal save using cached collection - ASYNC (same as sync but with Promise)
RCT_EXTERN_METHOD(swift_SaveDocumentMinimalAsync:(double)collectionHandle
                  docId:(NSString *)docId
                  jsonData:(NSString *)jsonData
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Release cached collection handle
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(swift_ReleaseCollectionHandle:(double)handle)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
