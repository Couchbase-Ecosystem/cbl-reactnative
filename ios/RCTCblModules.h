#import <Foundation/Foundation.h>
#import <React/RCTEventEmitter.h>
#import <CblReactnativeSpecs/CblReactnativeSpecs.h>

// MARK: - Non-event modules (NSObject)

@interface RCTCblDatabase  : NSObject        <NativeCblDatabaseSpec>   @end
@interface RCTCblScope     : NSObject        <NativeCblScopeSpec>      @end
@interface RCTCblDocument  : NSObject        <NativeCblDocumentSpec>   @end
@interface RCTCblEngine    : NSObject        <NativeCblEngineSpec>     @end

// MARK: - Event-emitting modules (RCTEventEmitter)

@interface RCTCblCollection : RCTEventEmitter <NativeCblCollectionSpec> @end
@interface RCTCblQuery      : RCTEventEmitter <NativeCblQuerySpec>      @end
@interface RCTCblLogging    : RCTEventEmitter <NativeCblLoggingSpec>    @end
@interface RCTCblReplicator : RCTEventEmitter <NativeCblReplicatorSpec> @end
