package com.cblreactnative

import com.cblreactnative.turbo.CouchbaseLiteDatabaseModule
import com.cblreactnative.turbo.CouchbaseLiteCollectionModule
import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.turbomodule.core.interfaces.TurboModule

/**
 * TurboReactPackage for Couchbase Lite Turbo Modules
 * 
 * This package registers Turbo Modules with the New Architecture.
 * It coexists with the legacy CblReactnativePackage to support both architectures.
 */
class CblReactnativeTurboPackage : TurboReactPackage() {
    
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return when (name) {
            CouchbaseLiteDatabaseModule.NAME -> CouchbaseLiteDatabaseModule(reactContext)
            CouchbaseLiteCollectionModule.NAME -> CouchbaseLiteCollectionModule(reactContext)
            else -> null
        }
    }
    
    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            mapOf(
                CouchbaseLiteDatabaseModule.NAME to ReactModuleInfo(
                    CouchbaseLiteDatabaseModule.NAME,
                    CouchbaseLiteDatabaseModule::class.java.name,
                    false, // canOverrideExistingModule
                    false, // needsEagerInit
                    true,  // isCxxModule
                    true   // isTurboModule
                ),
                CouchbaseLiteCollectionModule.NAME to ReactModuleInfo(
                    CouchbaseLiteCollectionModule.NAME,
                    CouchbaseLiteCollectionModule::class.java.name,
                    false, // canOverrideExistingModule
                    false, // needsEagerInit
                    true,  // isCxxModule
                    true   // isTurboModule
                )
            )
        }
    }
}
