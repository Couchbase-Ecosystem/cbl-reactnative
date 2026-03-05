#import <Foundation/Foundation.h>
#import "CbliteBenchmark.h"
#include <cbl/CouchbaseLite.h>  // C API from libcblite-4.0.0/include/

@implementation CbliteBenchmark

#pragma mark - Database Operations

- (int64_t)openDatabaseWithName:(NSString *)name directory:(NSString *)directory {
    NSLog(@"[CbliteBenchmark] Opening database: name='%@' directory='%@'", name, directory);
    
    // Validate inputs
    if (!name || name.length == 0) {
        NSLog(@"[CbliteBenchmark] ❌ Invalid name parameter");
        return 0;
    }
    if (!directory || directory.length == 0) {
        NSLog(@"[CbliteBenchmark] ❌ Invalid directory parameter");
        return 0;
    }
    
    // Get UTF8 C strings - these are valid for the duration of this method
    const char* nameCStr = [name UTF8String];
    const char* dirCStr = [directory UTF8String];
    
    if (!nameCStr || !dirCStr) {
        NSLog(@"[CbliteBenchmark] ❌ Failed to get UTF8 strings");
        return 0;
    }
    
    size_t nameLen = strlen(nameCStr);
    size_t dirLen = strlen(dirCStr);
    
    NSLog(@"[CbliteBenchmark] UTF8 strings: name len=%zu, dir len=%zu", nameLen, dirLen);
    
    // Ensure directory exists (C library may not create it automatically)
    NSFileManager *fileManager = [NSFileManager defaultManager];
    if (![fileManager fileExistsAtPath:directory]) {
        NSError *dirError = nil;
        if (![fileManager createDirectoryAtPath:directory withIntermediateDirectories:YES attributes:nil error:&dirError]) {
            NSLog(@"[CbliteBenchmark] ❌ Failed to create directory: %@", dirError.localizedDescription);
            return 0;
        }
        NSLog(@"[CbliteBenchmark] Created directory: %@", directory);
    }
    
    NSLog(@"[CbliteBenchmark] Directory exists, proceeding...");
    
    // Use FLStr() helper which handles strlen automatically - consistent with other methods
    NSLog(@"[CbliteBenchmark] Calling CBLDatabaseConfiguration_Default()...");
    CBLDatabaseConfiguration config = CBLDatabaseConfiguration_Default();
    
    // Set directory using FLStr helper (same approach as deleteDatabaseWithName:)
    config.directory = FLStr(dirCStr);
    NSLog(@"[CbliteBenchmark] Config set with directory, calling CBLDatabase_Open...");
    
    CBLError error = {};
    CBLDatabase* db = CBLDatabase_Open(FLStr(nameCStr), &config, &error);
    
    if (!db) {
        // Get detailed error message
        FLSliceResult errorMsg = CBLError_Message(&error);
        NSString* errorStr = nil;
        if (errorMsg.buf && errorMsg.size > 0) {
            errorStr = [[NSString alloc] initWithBytes:errorMsg.buf 
                                                length:errorMsg.size 
                                              encoding:NSUTF8StringEncoding];
        }
        FLSliceResult_Release(errorMsg);
        
        NSLog(@"[CbliteBenchmark] ❌ Open FAILED - domain=%d code=%d msg='%@'", 
              error.domain, error.code, errorStr ?: @"(no message)");
        return 0;
    }
    
    NSLog(@"[CbliteBenchmark] ✅ Database opened successfully, handle=%lld", (int64_t)db);
    return (int64_t)db;
}

- (BOOL)closeDatabaseWithHandle:(int64_t)handle {
    if (handle == 0) return NO;
    CBLDatabase* db = (CBLDatabase*)handle;
    CBLError error = {};
    BOOL success = CBLDatabase_Close(db, &error);
    CBLDatabase_Release(db);
    return success;
}

- (BOOL)deleteDatabaseWithName:(NSString *)name directory:(NSString *)directory {
    CBLError error = {};
    BOOL success = CBL_DeleteDatabase(FLStr([name UTF8String]), FLStr([directory UTF8String]), &error);
    if (!success && error.code != 0) {
        NSLog(@"[CbliteBenchmark] Delete error: domain=%d code=%d", error.domain, error.code);
    }
    return success;
}

#pragma mark - Transaction Operations

- (BOOL)beginTransactionWithHandle:(int64_t)handle {
    if (handle == 0) return NO;
    CBLDatabase* db = (CBLDatabase*)handle;
    CBLError error = {};
    return CBLDatabase_BeginTransaction(db, &error);
}

- (BOOL)endTransactionWithHandle:(int64_t)handle commit:(BOOL)commit {
    if (handle == 0) return NO;
    CBLDatabase* db = (CBLDatabase*)handle;
    CBLError error = {};
    return CBLDatabase_EndTransaction(db, commit, &error);
}

#pragma mark - Collection Operations

- (int64_t)getDefaultCollectionWithHandle:(int64_t)dbHandle {
    if (dbHandle == 0) return 0;
    CBLDatabase* db = (CBLDatabase*)dbHandle;
    CBLError error = {};
    CBLCollection* collection = CBLDatabase_DefaultCollection(db, &error);
    if (!collection) {
        NSLog(@"[CbliteBenchmark] GetDefaultCollection error: domain=%d code=%d", error.domain, error.code);
        return 0;
    }
    return (int64_t)collection;
}

- (int64_t)createCollectionWithHandle:(int64_t)dbHandle name:(NSString *)name scopeName:(NSString *)scopeName {
    if (dbHandle == 0) return 0;
    CBLDatabase* db = (CBLDatabase*)dbHandle;
    CBLError error = {};
    CBLCollection* collection = CBLDatabase_CreateCollection(db, FLStr([name UTF8String]), FLStr([scopeName UTF8String]), &error);
    if (!collection) {
        NSLog(@"[CbliteBenchmark] CreateCollection error: domain=%d code=%d", error.domain, error.code);
        return 0;
    }
    return (int64_t)collection;
}

- (uint64_t)getDocumentCountWithCollectionHandle:(int64_t)collectionHandle {
    if (collectionHandle == 0) return 0;
    CBLCollection* collection = (CBLCollection*)collectionHandle;
    return CBLCollection_Count(collection);
}

#pragma mark - Document Operations

- (NSDictionary * _Nullable)saveDocumentWithCollectionHandle:(int64_t)collectionHandle documentId:(NSString *)docId jsonData:(NSString *)json {
    if (collectionHandle == 0) return nil;
    CBLCollection* collection = (CBLCollection*)collectionHandle;
    
    // Create a mutable document with the given ID
    CBLDocument* doc = CBLDocument_CreateWithID(FLStr([docId UTF8String]));
    if (!doc) {
        NSLog(@"[CbliteBenchmark] Failed to create document");
        return nil;
    }
    
    // Set the document's JSON content
    CBLError error = {};
    if (!CBLDocument_SetJSON(doc, FLStr([json UTF8String]), &error)) {
        NSLog(@"[CbliteBenchmark] SetJSON error: domain=%d code=%d", error.domain, error.code);
        CBLDocument_Release(doc);
        return nil;
    }
    
    // Save the document to the collection
    if (!CBLCollection_SaveDocument(collection, doc, &error)) {
        NSLog(@"[CbliteBenchmark] SaveDocument error: domain=%d code=%d", error.domain, error.code);
        CBLDocument_Release(doc);
        return nil;
    }
    
    // Read back metadata (same work the Swift SDK does)
    FLString docId_ = CBLDocument_ID(doc);
    FLString revId = CBLDocument_RevisionID(doc);
    uint64_t sequence = CBLDocument_Sequence(doc);
    
    NSString* idStr = docId_.buf ? [[NSString alloc] initWithBytes:docId_.buf length:docId_.size encoding:NSUTF8StringEncoding] : docId;
    NSString* revStr = revId.buf ? [[NSString alloc] initWithBytes:revId.buf length:revId.size encoding:NSUTF8StringEncoding] : @"";
    
    CBLDocument_Release(doc);
    
    return @{
        @"_id": idStr,
        @"_revId": revStr,
        @"_sequence": @(sequence),
    };
}

- (NSDictionary * _Nullable)getDocumentWithCollectionHandle:(int64_t)collectionHandle documentId:(NSString *)docId {
    if (collectionHandle == 0) return nil;
    CBLCollection* collection = (CBLCollection*)collectionHandle;
    
    CBLError error = {};
    const CBLDocument* doc = CBLCollection_GetDocument(collection, FLStr([docId UTF8String]), &error);
    
    if (!doc) {
        // Document not found is not an error (error.code will be 0)
        if (error.code != 0) {
            NSLog(@"[CbliteBenchmark] GetDocument error: domain=%d code=%d", error.domain, error.code);
        }
        return nil;
    }
    
    // Get the document's JSON content
    FLSliceResult jsonResult = CBLDocument_CreateJSON(doc);
    NSString* jsonString = @"";
    
    if (jsonResult.buf && jsonResult.size > 0) {
        jsonString = [[NSString alloc] initWithBytes:jsonResult.buf
                                              length:jsonResult.size
                                            encoding:NSUTF8StringEncoding];
    }
    FLSliceResult_Release(jsonResult);
    
    // Read metadata (same work the Swift SDK does)
    FLString docId_ = CBLDocument_ID(doc);
    FLString revId = CBLDocument_RevisionID(doc);
    uint64_t sequence = CBLDocument_Sequence(doc);
    
    NSString* idStr = docId_.buf ? [[NSString alloc] initWithBytes:docId_.buf length:docId_.size encoding:NSUTF8StringEncoding] : docId;
    NSString* revStr = revId.buf ? [[NSString alloc] initWithBytes:revId.buf length:revId.size encoding:NSUTF8StringEncoding] : @"";
    
    CBLDocument_Release(doc);
    
    return @{
        @"_id": idStr,
        @"_data": jsonString,
        @"_revId": revStr,
        @"_sequence": @(sequence),
    };
}

- (BOOL)deleteDocumentWithCollectionHandle:(int64_t)collectionHandle documentId:(NSString *)docId {
    if (collectionHandle == 0) return NO;
    CBLCollection* collection = (CBLCollection*)collectionHandle;
    
    CBLError error = {};
    const CBLDocument* doc = CBLCollection_GetDocument(collection, FLStr([docId UTF8String]), &error);
    if (!doc) {
        return NO;
    }
    
    BOOL success = CBLCollection_DeleteDocument(collection, doc, &error);
    CBLDocument_Release(doc);
    return success;
}

- (BOOL)purgeDocumentWithCollectionHandle:(int64_t)collectionHandle documentId:(NSString *)docId {
    if (collectionHandle == 0) return NO;
    CBLCollection* collection = (CBLCollection*)collectionHandle;
    
    CBLError error = {};
    return CBLCollection_PurgeDocumentByID(collection, FLStr([docId UTF8String]), &error);
}

#pragma mark - Query Operations

- (NSString * _Nullable)executeQueryWithDatabaseHandle:(int64_t)dbHandle query:(NSString *)queryString parametersJson:(NSString * _Nullable)parametersJson {
    if (dbHandle == 0) return nil;
    CBLDatabase* db = (CBLDatabase*)dbHandle;
    
    CBLError error = {};
    int errPos = 0;
    CBLQuery* query = CBLDatabase_CreateQuery(db, kCBLN1QLLanguage, FLStr([queryString UTF8String]), &errPos, &error);
    if (!query) {
        NSLog(@"[CbliteBenchmark] CreateQuery error at pos %d: domain=%d code=%d", errPos, error.domain, error.code);
        return nil;
    }
    
    // Set parameters if provided
    if (parametersJson && parametersJson.length > 0) {
        FLError flErr = {};
        FLDoc paramsDoc = FLDoc_FromJSON(FLStr([parametersJson UTF8String]), &flErr);
        if (paramsDoc) {
            FLDict params = FLValue_AsDict(FLDoc_GetRoot(paramsDoc));
            if (params) {
                CBLQuery_SetParameters(query, params);
            }
            FLDoc_Release(paramsDoc);
        }
    }
    
    CBLResultSet* results = CBLQuery_Execute(query, &error);
    if (!results) {
        NSLog(@"[CbliteBenchmark] Query execute error: domain=%d code=%d", error.domain, error.code);
        CBLQuery_Release(query);
        return nil;
    }
    
    // Collect results into a JSON array
    NSMutableArray* resultArray = [NSMutableArray array];
    while (CBLResultSet_Next(results)) {
        FLDict row = CBLResultSet_ResultDict(results);
        if (row) {
            FLStringResult rowJson = FLValue_ToJSON((FLValue)row);
            if (rowJson.buf && rowJson.size > 0) {
                NSString* rowStr = [[NSString alloc] initWithBytes:rowJson.buf
                                                           length:rowJson.size
                                                         encoding:NSUTF8StringEncoding];
                if (rowStr) {
                    [resultArray addObject:rowStr];
                }
            }
            FLSliceResult_Release(rowJson);
        }
    }
    
    CBLResultSet_Release(results);
    CBLQuery_Release(query);
    
    // Return JSON array string: "[{...}, {...}, ...]"
    NSString* joined = [resultArray componentsJoinedByString:@","];
    return [NSString stringWithFormat:@"[%@]", joined];
}

#pragma mark - Replicator Operations

- (int64_t)createReplicatorWithDatabaseHandle:(int64_t)dbHandle
                           collectionHandles:(NSArray<NSNumber *> *)collectionHandles
                                    endpoint:(NSString *)endpointUrl
                                    username:(NSString *)username
                                    password:(NSString *)password
                              replicatorType:(int)replicatorType
                                  continuous:(BOOL)continuous {
    if (dbHandle == 0) {
        NSLog(@"[CbliteBenchmark] createReplicator: invalid dbHandle");
        return 0;
    }
    if (!collectionHandles || collectionHandles.count == 0) {
        NSLog(@"[CbliteBenchmark] createReplicator: no collection handles provided");
        return 0;
    }
    if (!endpointUrl || endpointUrl.length == 0) {
        NSLog(@"[CbliteBenchmark] createReplicator: empty endpoint URL");
        return 0;
    }

    // 1. Create endpoint
    CBLError error = {};
    CBLEndpoint* endpoint = CBLEndpoint_CreateWithURL(FLStr([endpointUrl UTF8String]), &error);
    if (!endpoint) {
        FLSliceResult errorMsg = CBLError_Message(&error);
        NSString* errStr = nil;
        if (errorMsg.buf && errorMsg.size > 0) {
            errStr = [[NSString alloc] initWithBytes:errorMsg.buf length:errorMsg.size encoding:NSUTF8StringEncoding];
        }
        FLSliceResult_Release(errorMsg);
        NSLog(@"[CbliteBenchmark] createReplicator: CBLEndpoint_CreateWithURL failed - %@", errStr ?: @"(no message)");
        return 0;
    }

    // 2. Create authenticator (optional - only if username+password provided)
    CBLAuthenticator* auth = NULL;
    if (username && username.length > 0 && password && password.length > 0) {
        auth = CBLAuth_CreatePassword(FLStr([username UTF8String]), FLStr([password UTF8String]));
    }

    // 3. Build CBLCollectionConfiguration array from collection handles
    size_t colCount = collectionHandles.count;
    CBLCollectionConfiguration* colConfigs = (CBLCollectionConfiguration*)calloc(colCount, sizeof(CBLCollectionConfiguration));
    if (!colConfigs) {
        NSLog(@"[CbliteBenchmark] createReplicator: failed to allocate collection configs");
        CBLEndpoint_Free(endpoint);
        if (auth) CBLAuth_Free(auth);
        return 0;
    }

    for (NSUInteger i = 0; i < colCount; i++) {
        int64_t colHandle = [collectionHandles[i] longLongValue];
        if (colHandle == 0) {
            NSLog(@"[CbliteBenchmark] createReplicator: invalid collection handle at index %lu", (unsigned long)i);
            free(colConfigs);
            CBLEndpoint_Free(endpoint);
            if (auth) CBLAuth_Free(auth);
            return 0;
        }
        colConfigs[i].collection = (CBLCollection*)colHandle;
        // Leave other fields as zero/NULL (no filters, no channels, no documentIDs)
    }

    // 4. Build replicator configuration
    CBLReplicatorConfiguration config = {};
    config.collections = colConfigs;
    config.collectionCount = colCount;
    config.endpoint = endpoint;
    config.authenticator = auth;
    config.continuous = continuous;

    // Map replicatorType: 0 = pushAndPull, 1 = push, 2 = pull
    switch (replicatorType) {
        case 1:  config.replicatorType = kCBLReplicatorTypePush; break;
        case 2:  config.replicatorType = kCBLReplicatorTypePull; break;
        default: config.replicatorType = kCBLReplicatorTypePushAndPull; break;
    }

    // 5. Create replicator
    CBLReplicator* replicator = CBLReplicator_Create(&config, &error);

    // Free the collection configs array (replicator retains what it needs)
    free(colConfigs);
    // Free endpoint and authenticator (replicator retains its own copies)
    CBLEndpoint_Free(endpoint);
    if (auth) CBLAuth_Free(auth);

    if (!replicator) {
        FLSliceResult errorMsg = CBLError_Message(&error);
        NSString* errStr = nil;
        if (errorMsg.buf && errorMsg.size > 0) {
            errStr = [[NSString alloc] initWithBytes:errorMsg.buf length:errorMsg.size encoding:NSUTF8StringEncoding];
        }
        FLSliceResult_Release(errorMsg);
        NSLog(@"[CbliteBenchmark] createReplicator: CBLReplicator_Create failed - domain=%d code=%d msg='%@'",
              error.domain, error.code, errStr ?: @"(no message)");
        return 0;
    }

    NSLog(@"[CbliteBenchmark] ✅ Replicator created, handle=%lld, type=%d, continuous=%d, collections=%zu",
          (int64_t)replicator, replicatorType, continuous, colCount);
    return (int64_t)replicator;
}

- (BOOL)startReplicatorWithHandle:(int64_t)handle resetCheckpoint:(BOOL)resetCheckpoint {
    if (handle == 0) {
        NSLog(@"[CbliteBenchmark] startReplicator: invalid handle");
        return NO;
    }
    CBLReplicator* replicator = (CBLReplicator*)handle;
    CBLReplicator_Start(replicator, resetCheckpoint);
    NSLog(@"[CbliteBenchmark] Replicator started (resetCheckpoint=%d)", resetCheckpoint);
    return YES;
}

- (void)stopReplicatorWithHandle:(int64_t)handle {
    if (handle == 0) {
        NSLog(@"[CbliteBenchmark] stopReplicator: invalid handle");
        return;
    }
    CBLReplicator* replicator = (CBLReplicator*)handle;
    CBLReplicator_Stop(replicator);
    NSLog(@"[CbliteBenchmark] Replicator stopped");
}

- (NSDictionary *)getReplicatorStatusWithHandle:(int64_t)handle {
    if (handle == 0) {
        NSLog(@"[CbliteBenchmark] getReplicatorStatus: invalid handle");
        return nil;
    }
    CBLReplicator* replicator = (CBLReplicator*)handle;
    CBLReplicatorStatus status = CBLReplicator_Status(replicator);

    // Convert error to message string if present
    NSString* errorMessage = @"";
    if (status.error.code != 0) {
        FLSliceResult errorMsg = CBLError_Message(&status.error);
        if (errorMsg.buf && errorMsg.size > 0) {
            errorMessage = [[NSString alloc] initWithBytes:errorMsg.buf
                                                    length:errorMsg.size
                                                  encoding:NSUTF8StringEncoding];
        }
        FLSliceResult_Release(errorMsg);
    }

    return @{
        @"activity": @((int)status.activity),
        @"complete": @(status.progress.complete),
        @"documentCount": @(status.progress.documentCount),
        @"errorDomain": @((int)status.error.domain),
        @"errorCode": @((int)status.error.code),
        @"errorMessage": errorMessage ?: @"",
    };
}

- (void)cleanupReplicatorWithHandle:(int64_t)handle {
    if (handle == 0) {
        NSLog(@"[CbliteBenchmark] cleanupReplicator: invalid handle");
        return;
    }
    CBLReplicator* replicator = (CBLReplicator*)handle;
    // Stop first (safe to call even if already stopped)
    CBLReplicator_Stop(replicator);
    // Release the ref-counted replicator object
    CBLReplicator_Release(replicator);
    NSLog(@"[CbliteBenchmark] Replicator cleaned up and released");
}

#pragma mark - Echo Operation (for pure overhead measurement)

- (NSString *)echoWithData:(NSString *)data {
    return data;
}

@end