package com.cblreactnative

import android.provider.ContactsContract.Data
import cbl.js.kotiln.DatabaseManager
import cbl.js.kotiln.CollectionManager
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
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
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
    promise: Promise
  ) {
    try {
      if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
        return
      }
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
  fun collection_CreateIndex(
    indexName: String,
    index: ReadableMap,
    collectionName: String,
    scopeName: String,
    name: String,
    promise: Promise
  ) {
    try {
      if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
        return
      }
      val indexDto = DataAdapter.adaptMapToIndexDto(indexName, index)
      if (indexDto.type == "value") {
        val idx = IndexBuilder.valueIndex(*indexDto.valueItems)
        CollectionManager.createIndex(indexName, idx, collectionName, scopeName, name)
      } else {
        val idx = IndexBuilder.fullTextIndex(*indexDto.fullTextItems)
        if (indexDto.language != null) {
          idx.setLanguage(indexDto.language)
        }
        if (indexDto.ignoreAccents != null) {
          idx.ignoreAccents(indexDto.ignoreAccents)
        }
        CollectionManager.createIndex(indexName, idx, collectionName, scopeName, name)
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("INDEX_ERROR", e.message)
    }
  }

  @ReactMethod
  fun collection_DeleteCollection(
    collectionName: String,
    name: String,
    scopeName: String,
    promise: Promise
  ) {
    try {
      if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
        return
      }
      DatabaseManager.deleteCollection(collectionName, scopeName, name)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun collection_DeleteDocument(
    docId: String,
    name: String,
    scopeName: String,
    collectionName: String,
    concurrencyControl: Double?,
    promise: Promise
  ) {
    try {
      if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
        return
      }
      if (concurrencyControl == null) {
        val result = CollectionManager.deleteDocument(docId, collectionName, scopeName, name)
        promise.resolve(result)
        return
      }
      val concurrency = DataAdapter.adaptConcurrencyControlFromInt(concurrencyControl.toInt())
      val result =
        CollectionManager.deleteDocument(docId, collectionName, scopeName, name, concurrency)
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("DOCUMENT_ERROR", e.message)
    }

  }

  @ReactMethod
  fun collection_DeleteIndex(
    indexName: String,
    collectionName: String,
    scopeName: String,
    name: String,
    promise: Promise
  ) {
    try {
      if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
        return
      }
      if (indexName.isEmpty()) {
        promise.reject("INDEX_ERROR", "Index name must be provided")
      }
      CollectionManager.deleteIndex(indexName, collectionName, scopeName, name)
    } catch (e: Exception) {
      promise.reject("INDEX_ERROR", e.message)
    }
  }

  @ReactMethod
  fun collection_GetBlobContent(
    key: String,
    docId: String,
    name: String,
    scopeName: String,
    collectionName: String,
    promise: Promise){
    try {
      if (!DataValidation.validateCollection(collectionName, scopeName, name, promise) ||
        !DataValidation.validateDocumentId(docId, promise)) {
        return
      }
      val writableArray = Arguments.createArray()
      val writableMap = Arguments.createMap()
      val content = CollectionManager.getBlobContent(key, docId, collectionName, scopeName, name)
      if (content != null && content.isNotEmpty()) {
        val intArray = content.map { it.toInt() and 0xFF }
        intArray.forEach { writableArray.pushInt(it) }
      }
      writableMap.putArray("data", writableArray)
      promise.resolve(writableMap)
    } catch (e: Exception) {
      promise.reject("DOCUMENT_ERROR", e.message)
    }
  }

  @ReactMethod
  fun collection_GetCollection(
    collectionName: String,
    name: String,
    scopeName: String,
    promise: Promise
  ) {
    try {
      if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
        return
      }
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

  @ReactMethod
  fun collection_GetCollections(
    name: String,
    scopeName: String,
    promise: Promise
  ) {
    try {
      if (!DataValidation.validateScope(scopeName, name, promise)) {
        return
      }
      val cols = DatabaseManager.getCollections(scopeName, name)
      val colList = Arguments.createArray()
      cols?.forEach { collection ->
        val colMap = DataAdapter.adaptCollectionToMap(collection, name)
        colList.pushMap(colMap)
      }
      val resultsCollections: WritableMap = Arguments.createMap()
      resultsCollections.putArray("collections", colList)
      promise.resolve(resultsCollections)
    } catch (e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun collection_GetCount(
    collectionName: String,
    name: String,
    scopeName: String,
    promise: Promise
  ) {
    try {
      if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
        return
      }
      val count = CollectionManager.documentsCount(collectionName, scopeName, name)
      val map = Arguments.createMap()
      map.putInt("count", count)
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun collection_GetDefault(
    name: String,
    promise: Promise
  ) {
    if (!DataValidation.validateDatabaseName(name, promise)) {
      return
    }
    try {
      val col = DatabaseManager.defaultCollection(name)
      col?.let { collection ->
        val colMap = DataAdapter.adaptCollectionToMap(collection, name)
        promise.resolve(colMap)
        return
      }
      promise.reject("COLLECTION_ERROR", "Error getting default collection")
    } catch (e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun collection_GetDocument(
    docId: String,
    name: String,
    scopeName: String,
    collectionName: String,
    promise: Promise
  ){
    try {
      if (!DataValidation.validateCollection(collectionName, scopeName, name, promise) ||
        !DataValidation.validateDocumentId(docId, promise)) {
        return
      }
      val doc = CollectionManager.getDocument(docId, collectionName, scopeName, name)
      val docMap = DataAdapter.adaptDocumentToMap(doc)
      promise.resolve(docMap)
    } catch (e: Exception) {
      promise.reject("DOCUMENT_ERROR", e.message)
    }
  }

  @ReactMethod
  fun collection_GetDocumentExpiration(
    docId: String,
    name: String,
    scopeName: String,
    collectionName: String,
    promise: Promise
  ){
    try {
      if (!DataValidation.validateCollection(collectionName, scopeName, name, promise) ||
        !DataValidation.validateDocumentId(docId, promise)) {
        return
      }
      val map = Arguments.createMap()
      val expiration = CollectionManager.getDocumentExpiration(docId, collectionName, scopeName, name)
      if (expiration == null) {
        map.putNull("expiration")
      } else {
        map.putString("expiration", DataAdapter.dateToISOString(expiration))
      }
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("DOCUMENT_ERROR", e.message)
    }
  }

  @ReactMethod
  fun collection_GetIndexes(
    collectionName: String,
    name: String,
    scopeName: String,
    promise: Promise
  ) {
    try {
      if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
        return
      }
      val indexes = CollectionManager.getIndexes(collectionName, scopeName, name)
      val writableArray = Arguments.createArray()
      if (indexes != null) {
        for (item in indexes) {
          writableArray.pushString(item)
        }
      }
      val resultsIndexes: WritableMap = Arguments.createMap()
      resultsIndexes.putArray("indexes", writableArray)
      promise.resolve(resultsIndexes)
    } catch (e: Exception) {
      promise.reject("INDEX_ERROR", e.message)
    }
  }

  @ReactMethod
  fun collection_PurgeDocument(
    docId: String,
    name: String,
    scopeName: String,
    collectionName: String,
    promise: Promise
  ) {
    try {
      if (!DataValidation.validateCollection(collectionName, scopeName, name, promise) ||
        !DataValidation.validateDocumentId(docId, promise)) {
        return
      }
      CollectionManager.purgeDocument(docId, collectionName, scopeName, name)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("DOCUMENT_ERROR", e.message)
    }
  }

  @ReactMethod
  fun collection_SetDocumentExpiration(
    expiration: String,
    docId: String,
    name: String,
    scopeName: String,
    collectionName: String,
    promise: Promise){
    try {
      if (!DataValidation.validateCollection(collectionName, scopeName, name, promise) ||
        !DataValidation.validateDocumentId(docId, promise)
      ) {
        return
      }
      CollectionManager.setDocumentExpiration(expiration, docId, collectionName, scopeName, name)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("DOCUMENT_ERROR", e.message)
    }
  }

  // Database Functions
  @ReactMethod
  fun database_ChangeEncryptionKey(
    newKey: String,
    name: String,
    promise: Promise
  ) {
    if (!DataValidation.validateDatabaseName(name, promise)) {
      return
    }
    try {
      DatabaseManager.changeEncryptionKey(name, newKey)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun database_Close(
    name: String,
    promise: Promise
  ) {
    if (!DataValidation.validateDatabaseName(name, promise)) {
      return
    }
    try {
      DatabaseManager.closeDatabase(name)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }


  @ReactMethod
  fun database_Copy(
    path: String,
    newName: String,
    directory: String?,
    encryptionKey: String?,
    promise: Promise
  ) {
    try {
      if (!DataValidation.validateDatabaseName(newName, promise)) {
        return
      }
      if (!DataValidation.validatePath(path, promise)) {
        return
      }
      val databaseConfig = DataAdapter.getDatabaseConfig(directory, encryptionKey)
      DatabaseManager.copy(path, newName, databaseConfig, this.context)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun database_Delete(
    name: String,
    promise: Promise
  ) {
    if (!DataValidation.validateDatabaseName(name, promise)) {
      return
    }
    try {
      DatabaseManager.delete(name)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun database_DeleteWithPath(
    path: String,
    name: String,
    promise: Promise
  ) {
    if (!DataValidation.validateDatabaseName(name, promise)) {
      return
    }
    if (!DataValidation.validatePath(path, promise)) {
      return
    }
    try {
      DatabaseManager.deleteWithPath(name, path)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun database_Exists(
    name: String,
    directory: String,
    promise: Promise
  ) {
    if (!DataValidation.validateDatabaseName(name, promise)) {
      return
    }
    if (!DataValidation.validatePath(directory, promise)) {
      return
    }
    try {
      val exists = DatabaseManager.exists(name, directory)
      promise.resolve(exists)
    } catch (e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun database_GetPath(
    name: String,
    promise: Promise
  ) {
    if (!DataValidation.validateDatabaseName(name, promise)) {
      return
    }
    try {
      val path = DatabaseManager.getPath(name)
      promise.resolve(path)
    } catch (e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun database_Open(
    name: String,
    directory: String? = null,
    encryptionKey: String? = null,
    promise: Promise
  ) {
    if (!DataValidation.validateDatabaseName(name, promise)) {
      return
    }
    try {
      val databaseConfig = DataAdapter.getDatabaseConfig(directory, encryptionKey)
      DatabaseManager.openDatabase(
        name,
        databaseConfig,
        this.context
      )
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("DATABASE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun database_PerformMaintenance(
    maintenanceType: Double,
    databaseName: String,
    promise: Promise
  ) {
    if (!DataValidation.validateDatabaseName(name, promise)) {
      return
    }
    try {
      val mType = DataAdapter.adaptMaintenanceTypeFromInt(maintenanceType.toInt())
      DatabaseManager.performMaintenance(databaseName, mType)
      promise.resolve(null)
    } catch (e: Exception) {
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
    promise: Promise
  ) {
    try {
      if (domain.isEmpty()) {
        promise.reject("LOGGING_ERROR", "Log domain must be provided")
      }
      LoggingManager.setLogLevel(domain, logLevel.toInt())
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("LOGGING_ERROR", e.message)
    }
  }

  // Scope Functions
  @ReactMethod
  fun scope_GetDefault(
    name: String,
    promise: Promise
  ) {
    try {
      if (!DataValidation.validateDatabaseName(name, promise)) {
        return
      }
      val scopeValue = DatabaseManager.defaultScope(name)
      scopeValue?.let { scope ->
        val scopeMap = DataAdapter.adaptScopeToMap(scope, name)
        promise.resolve(scopeMap)
        return
      }
      promise.reject("SCOPE_ERROR", "Error getting default scope")
    } catch (e: Exception) {
      promise.reject("SCOPE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun scope_GetScope(
    scopeName: String,
    name: String,
    promise: Promise
  ) {
    try {
      if (!DataValidation.validateScope(scopeName, name, promise)) {
        return
      }
      val scopeValue = DatabaseManager.getScope(name, scopeName)
      scopeValue?.let { scope ->
        val scopeMap = DataAdapter.adaptScopeToMap(scope, name)
        promise.resolve(scopeMap)
        return
      }
      promise.reject("SCOPE_ERROR", "Error getting scope")
    } catch (e: Exception) {
      promise.reject("SCOPE_ERROR", e.message)
    } catch (e: Exception) {
      promise.reject("SCOPE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun scope_GetScopes(
    name: String,
    promise: Promise
  ) {
    try {
      if (!DataValidation.validateDatabaseName(name, promise)) {
        return
      }
      val scopes = DatabaseManager.scopes(name)
      val scopeList = Arguments.createArray()
      scopes.forEach { scope ->
        val scopeMap = DataAdapter.adaptScopeToMap(scope, name)
        scopeList.pushMap(scopeMap)
      }
      val resultsScopes: WritableMap = Arguments.createMap()
      resultsScopes.putArray("scopes", scopeList)
      promise.resolve(resultsScopes)
    } catch (e: Exception) {
      promise.reject("SCOPE_ERROR", e.message)
    } catch (e: Exception) {
      promise.reject("SCOPE_ERROR", e.message)
    }
  }

  companion object {
    const val NAME = "CblReactnative"
  }
}
