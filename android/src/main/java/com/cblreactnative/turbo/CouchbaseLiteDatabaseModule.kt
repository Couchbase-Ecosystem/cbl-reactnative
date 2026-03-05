package com.cblreactnative.turbo

import cbl.js.kotlin.DatabaseManager
import com.cblreactnative.DataAdapter
import com.cblreactnative.DataValidation
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.turbomodule.core.interfaces.TurboModule
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch

/**
 * Turbo Module implementation for Couchbase Lite Database operations
 * 
 * This module handles:
 * - Opening databases with encryption
 * - Closing databases
 * - Getting database paths
 * 
 * IMPORTANT: This class implements TurboModule interface to enable JSI-based
 * communication for better performance compared to the legacy bridge.
 */
@OptIn(DelicateCoroutinesApi::class)
@ReactModule(name = CouchbaseLiteDatabaseModule.NAME)
class CouchbaseLiteDatabaseModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), TurboModule {

    override fun getName(): String = NAME
    
    // Mark this as a Turbo Module
    override fun invalidate() {
        // Cleanup if needed
    }

    /**
     * Opens a database with optional directory and encryption
     */
    @ReactMethod
    fun database_Open(
        name: String,
        directory: String?,
        encryptionKey: String?,
        promise: Promise
    ) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                if (!DataValidation.validateDatabaseName(name, promise)) {
                    return@launch
                }
                
                val databaseConfig = DataAdapter.toDatabaseConfigJson(directory, encryptionKey)
                val databaseUniqueName = DatabaseManager.openDatabase(
                    name,
                    databaseConfig,
                    reactContext
                )
                
                reactContext.runOnUiQueueThread {
                    val result = Arguments.createMap()
                    result.putString("databaseUniqueName", databaseUniqueName)
                    promise.resolve(result)
                }
            } catch (e: Throwable) {
                reactContext.runOnUiQueueThread {
                    promise.reject("DATABASE_ERROR", e.message)
                }
            }
        }
    }

    /**
     * Closes an open database
     */
    @ReactMethod
    fun database_Close(name: String, promise: Promise) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                if (!DataValidation.validateDatabaseName(name, promise)) {
                    return@launch
                }
                
                DatabaseManager.closeDatabase(name)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(null)
                }
            } catch (e: Throwable) {
                reactContext.runOnUiQueueThread {
                    promise.reject("DATABASE_ERROR", e.message)
                }
            }
        }
    }

    /**
     * Gets the file path of a database
     */
    @ReactMethod
    fun database_GetPath(name: String, promise: Promise) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                if (!DataValidation.validateDatabaseName(name, promise)) {
                    return@launch
                }
                
                val path = DatabaseManager.getPath(name)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(path)
                }
            } catch (e: Throwable) {
                reactContext.runOnUiQueueThread {
                    promise.reject("DATABASE_ERROR", e.message)
                }
            }
        }
    }

    /**
     * Checks if a database exists at the given path
     */
    @ReactMethod
    fun database_Exists(
        databaseName: String,
        directory: String,
        promise: Promise
    ) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                if (!DataValidation.validateDatabaseName(databaseName, promise)) {
                    return@launch
                }
                
                val exists = DatabaseManager.exists(databaseName, directory)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(exists)
                }
            } catch (e: Throwable) {
                reactContext.runOnUiQueueThread {
                    promise.reject("DATABASE_ERROR", e.message)
                }
            }
        }
    }

    /**
     * Gets all scopes in a database
     */
    @ReactMethod
    fun scope_GetScopes(databaseName: String, promise: Promise) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                if (!DataValidation.validateDatabaseName(databaseName, promise)) {
                    return@launch
                }
                
                val scopes = DatabaseManager.scopes(databaseName)
                val scopesJson = DataAdapter.scopesToJsonString(scopes, databaseName)
                    
                reactContext.runOnUiQueueThread {
                    val result = Arguments.createMap()
                    result.putString("scopes", scopesJson)
                    promise.resolve(result)
                }
            } catch (e: Throwable) {
                reactContext.runOnUiQueueThread {
                    promise.reject("DATABASE_ERROR", e.message)
                }
            }
        }
    }

    companion object {
        const val NAME = "CouchbaseLiteDatabase"
    }
}