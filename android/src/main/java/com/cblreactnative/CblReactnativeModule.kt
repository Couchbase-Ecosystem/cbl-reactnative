package com.cblreactnative

import cbl.js.kotiln.DatabaseManager
import cbl.js.kotiln.FileSystemHelper
import cbl.js.kotiln.LoggingManager
import com.couchbase.lite.*
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule


@Suppress("FunctionName")
class CblReactnativeModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  // Property to hold the context
  private val context: ReactApplicationContext = reactContext

  init {
    CouchbaseLite.init(context, true)
  }

  override fun getName(): String {
    return NAME
  }

  private fun sendEvent(reactContext: ReactContext, eventName: String, params: WritableMap?) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }

  // Collection Functions
  @ReactMethod
  fun collection_CreateCollection(
    collectionName: String,
    name: String,
    scopeName: String,
    promise: Promise) {
    try {
      val col = DatabaseManager.createCollection(collectionName, scopeName, name)
      col?.let { collection ->
        val colMap = DataAdapter.adaptCollectionToMap(collection, name)
        promise.resolve(colMap)
        return
      }
      promise.reject("COLLECTION_ERROR", "Error creating collection")
    } catch (e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun collection_DeleteCollection(
    collectionName: String,
    name: String,
    scopeName: String,
    promise: Promise) {
    try {
      DatabaseManager.deleteCollection(collectionName, scopeName, name)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun collection_GetCollection(
    collectionName: String,
    name: String,
    scopeName: String,
    promise: Promise) {
    try {
      val col = DatabaseManager.getCollection(collectionName, scopeName, name)
      col?.let { collection ->
        val colMap = DataAdapter.adaptCollectionToMap(collection, name)
        promise.resolve(colMap)
        return
      }
      promise.reject("COLLECTION_ERROR", "Error getting collection")
    } catch (e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  // Database Functions
  @ReactMethod
  fun database_ChangeEncryptionKey(
    newKey: String,
    name: String,
    promise: Promise) {
    if (name.isEmpty()) {
      promise.reject("DATABASE_ERROR", "Database name must be provided")
      return
    }
    try {
      DatabaseManager.changeEncryptionKey(name, newKey)
      promise.resolve(null)
    } catch(e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun database_Close(
    name: String,
    promise: Promise) {
    if (name.isEmpty()) {
      promise.reject("DATABASE_ERROR", "Database name must be provided")
      return
    }
    try {
      DatabaseManager.closeDatabase(name)
      promise.resolve(null)
    } catch(e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }


  @ReactMethod
  fun database_Copy(
    path: String,
    newName: String,
    directory: String?,
    encryptionKey: String?,
    promise: Promise) {
    try {
      if (name.isEmpty()) {
        promise.reject("DATABASE_ERROR", "Database name must be provided")
        return
      }
      if (path.isEmpty()) {
        promise.reject("DATABASE_ERROR", "Database path must be provided")
        return
      }
      val databaseConfig = DataAdapter.getDatabaseConfig(directory, encryptionKey)
      DatabaseManager.copy(path, newName, databaseConfig, this.context)
      promise.resolve(null)
    } catch(e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun database_Delete(
    name: String,
    promise: Promise) {
    if (name.isEmpty()) {
      promise.reject("DATABASE_ERROR", "Database name must be provided")
      return
    }
    try {
      DatabaseManager.delete(name)
      promise.resolve(null)
    } catch(e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun database_DeleteWithPath(
    path: String,
    name: String,
    promise: Promise) {
    if (name.isEmpty()) {
      promise.reject("DATABASE_ERROR", "Database name must be provided")
      return
    }
    if (path.isEmpty()) {
      promise.reject("DATABASE_ERROR", "Database path must be provided")
      return
    }
    try {
      DatabaseManager.deleteWithPath(name, path)
      promise.resolve(null)
    } catch(e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun database_Exists(
    name: String,
    directory: String,
    promise: Promise) {
    if (name.isEmpty()) {
      promise.reject("DATABASE_ERROR", "Database name must be provided")
      return
    }
    try {
      val exists = DatabaseManager.exists(name, directory)
      promise.resolve(exists)
    } catch(e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun database_GetPath(
    name: String,
    promise: Promise) {
    if (name.isEmpty()) {
      promise.reject("DATABASE_ERROR", "Database name must be provided")
      return
    }
    try {
      val path = DatabaseManager.getPath(name)
      promise.resolve(path)
    } catch(e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun database_Open(
    name: String,
    directory: String? = null,
    encryptionKey: String? = null,
    promise: Promise) {
    if (name.isEmpty()) {
      promise.reject("DATABASE_ERROR", "Database name must be provided")
      return
    }
    try {
      val databaseConfig = DataAdapter.getDatabaseConfig(directory, encryptionKey)
      DatabaseManager.openDatabase(
        name,
        databaseConfig,
        this.context)
      promise.resolve(null)
    } catch(e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun database_PerformMaintenance(
    maintenanceType: Double,
    databaseName: String,
    promise: Promise) {
    if (databaseName.isEmpty()) {
      promise.reject("DATABASE_ERROR", "Database name must be provided")
      return
    }
    try {
      val mType = DataAdapter.adaptMaintenanceTypeFromInt(maintenanceType.toInt())
      DatabaseManager.performMaintenance(databaseName, mType)
      promise.resolve(null)
    } catch(e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  // File System Functions
  @ReactMethod
  fun file_GetDefaultPath(promise: Promise) {
    try {
      val path = FileSystemHelper.fileGetDefaultPath(this.context)
      promise.resolve(path)
    } catch (e: Exception) {
      promise.reject("FILE_ERROR", e.message)
    }
  }

 // Logging Functions
 @ReactMethod
 fun database_SetLogLevel(
   domain: String,
   logLevel: Double,
   promise: Promise) {
    try {
      if (domain.isEmpty()) {
        promise.reject("LOGGING_ERROR", "Log domain must be provided")
      }
      LoggingManager.setLogLevel(domain, logLevel.toInt())
      promise.resolve(null)
    } catch (e: Exception){
      promise.reject("LOGGING_ERROR", e.message)
    }
  }

  companion object {
    const val NAME = "CblReactnative"
  }
}
