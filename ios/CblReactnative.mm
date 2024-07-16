#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CblReactnative, NSObject)


RCT_EXTERN_METHOD(database_Open:(NSString)name withDirectory:(NSString)directory withEncryptionKey:(NSString)encryptionKey withResolver:(RCTPromiseResolveBlock)resolve withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(database_Close:(NSString)name withResolver:(RCTPromiseResolveBlock)resolve withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(database_Delete:(NSString)name withResolver:(RCTPromiseResolveBlock)resolve withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(file_GetDefaultPath:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
