#import <React/RCTBridgeModule.h>

/**
 * Objective-C++ bridge for CouchbaseLiteDatabase Turbo Module
 * 
 * This file exposes the Swift implementation to React Native's Turbo Module system.
 * Using .mm extension enables C++ features needed for JSI/Turbo Modules.
 */

@interface RCT_EXTERN_MODULE(CouchbaseLiteDatabase, NSObject)

RCT_EXTERN_METHOD(database_Open:(NSString *)name
                  directory:(NSString *)directory
                  encryptionKey:(NSString *)encryptionKey
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(database_Close:(NSString *)name
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(database_GetPath:(NSString *)name
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(database_Exists:(NSString *)databaseName
                  directory:(NSString *)directory
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(scope_GetScopes:(NSString *)databaseName
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(database_Delete:(NSString *)name
                  directory:(NSString *)directory
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
