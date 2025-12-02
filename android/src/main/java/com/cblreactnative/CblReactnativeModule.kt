package com.cblreactnative

import cbl.js.kotiln.DatabaseManager
import cbl.js.kotiln.CollectionManager
import cbl.js.kotiln.FileSystemHelper
import cbl.js.kotiln.LoggingManager
import cbl.js.kotiln.LogSinksManager
import cbl.js.kotiln.ReplicatorManager
import cbl.js.kotiln.ReplicatorHelper
import com.couchbase.lite.*
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import org.json.JSONObject

@OptIn(DelicateCoroutinesApi::class)
@Suppress("FunctionName")
class CblReactnativeModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  // Property to hold the context
  private val context: ReactApplicationContext = reactContext
  private val queryChangeListeners: MutableMap<String, ListenerToken> = mutableMapOf()
  private val replicatorChangeListeners: MutableMap<String, ListenerToken> = mutableMapOf()
  private val replicatorDocumentListeners: MutableMap<String, ListenerToken> = mutableMapOf()
  private val collectionChangeListeners: MutableMap<String, ListenerToken> = mutableMapOf()
  private val collectionDocumentChangeListeners: MutableMap<String, ListenerToken> = mutableMapOf()
  
  // Track whether JavaScript is listening for events
  private var listenerCount = 0

  init {
    CouchbaseLite.init(context, true)
  }

  override fun getName(): String {
    return NAME
  }

  // Required for NativeEventEmitter - these methods are called by React Native
  // when JS adds/removes listeners, but may not be reliable with Expo
  @ReactMethod
  fun addListener(eventName: String) {
    listenerCount++
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    listenerCount -= count
    if (listenerCount < 0) listenerCount = 0
  }

  private fun sendEvent(
    reactContext: ReactContext,
    eventName: String,
    params: WritableMap?) {
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
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
          return@launch
        }
        val col = DatabaseManager.createCollection(collectionName, scopeName, name)
        col?.let { collection ->
          val colMap = DataAdapter.cblCollectionToMap(collection, name)
          context.runOnUiQueueThread {
            promise.resolve(colMap)
          }
          return@launch
        }
        context.runOnUiQueueThread {
          promise.reject("COLLECTION_ERROR", "Error creating collection")
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", e.message)
        }
      }
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
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
          return@launch
        }
        val indexDto = DataAdapter.mapToIndexDto(indexName, index)
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
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("INDEX_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun collection_DeleteCollection(
    collectionName: String,
    name: String,
    scopeName: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
          return@launch
        }
        DatabaseManager.deleteCollection(collectionName, scopeName, name)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", e.message)
        }
      }
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
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
          return@launch
        }
        if (concurrencyControl == null) {
          val result = CollectionManager.deleteDocument(docId, collectionName, scopeName, name)
          context.runOnUiQueueThread {
            promise.resolve(result)
          }
          return@launch
        }
        val concurrency = DataAdapter.intToConcurrencyControl(concurrencyControl.toInt())
        val result =
          CollectionManager.deleteDocument(docId, collectionName, scopeName, name, concurrency)
        context.runOnUiQueueThread {
          promise.resolve(result)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DOCUMENT_ERROR", e.message)
        }
      }
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
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
          return@launch
        }
        if (indexName.isEmpty()) {
          context.runOnUiQueueThread {
            promise.reject("INDEX_ERROR", "Index name must be provided")
          }
        }
        CollectionManager.deleteIndex(indexName, collectionName, scopeName, name)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("INDEX_ERROR", e.message)
        }
      }
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
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateCollection(collectionName, scopeName, name, promise) ||
          !DataValidation.validateDocumentId(docId, promise)
        ) {
          return@launch
        }
        val writableArray = Arguments.createArray()
        val writableMap = Arguments.createMap()
        val content = CollectionManager.getBlobContent(key, docId, collectionName, scopeName, name)
        if (content != null && content.isNotEmpty()) {
          val intArray = content.map { it.toInt() and 0xFF }
          intArray.forEach { writableArray.pushInt(it) }
        }
        writableMap.putArray("data", writableArray)
        context.runOnUiQueueThread {
          promise.resolve(writableMap)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DOCUMENT_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun collection_GetCollection(
    collectionName: String,
    name: String,
    scopeName: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
          return@launch
        }
        val col = DatabaseManager.getCollection(collectionName, scopeName, name)
        col?.let { collection ->
          val colMap = DataAdapter.cblCollectionToMap(collection, name)
          context.runOnUiQueueThread {
            promise.resolve(colMap)
          }
          return@launch
        }
        context.runOnUiQueueThread {
          promise.reject("COLLECTION_ERROR", "Error getting collection")
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun collection_GetCollections(
    name: String,
    scopeName: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateScope(scopeName, name, promise)) {
          return@launch
        }
        val cols = DatabaseManager.getCollections(scopeName, name)
        val colList = Arguments.createArray()
        cols?.forEach { collection ->
          val colMap = DataAdapter.cblCollectionToMap(collection, name)
          colList.pushMap(colMap)
        }
        val resultsCollections: WritableMap = Arguments.createMap()
        resultsCollections.putArray("collections", colList)
        context.runOnUiQueueThread {
          promise.resolve(resultsCollections)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun collection_GetCount(
    collectionName: String,
    name: String,
    scopeName: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
          return@launch
        }
        val count = CollectionManager.documentsCount(collectionName, scopeName, name)
        val map = Arguments.createMap()
        map.putInt("count", count)
        context.runOnUiQueueThread {
          promise.resolve(map)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun collection_GetFullName(
    collectionName: String,
    name: String,
    scopeName: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
          return@launch
        }
        val fullName = CollectionManager.fullName(collectionName, scopeName, name)
        val map = Arguments.createMap()
        map.putString("fullName", fullName)
        context.runOnUiQueueThread {
          promise.resolve(map)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun collection_GetDefault(
    name: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      if (!DataValidation.validateDatabaseName(name, promise)) {
        return@launch
      }
      try {
        val col = DatabaseManager.defaultCollection(name)
        col?.let { collection ->
          val colMap = DataAdapter.cblCollectionToMap(collection, name)
          context.runOnUiQueueThread {
            promise.resolve(colMap)
          }
          return@launch
        }
        context.runOnUiQueueThread {
          promise.reject("COLLECTION_ERROR", "Error getting default collection")
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun collection_GetDocument(
    docId: String,
    name: String,
    scopeName: String,
    collectionName: String,
    promise: Promise
) {
    GlobalScope.launch(Dispatchers.IO) {
        try {
            if (!DataValidation.validateCollection(collectionName, scopeName, name, promise) ||
                !DataValidation.validateDocumentId(docId, promise)
            ) {
                return@launch
            }

            val doc = CollectionManager.getDocument(docId, collectionName, scopeName, name)
            if (doc == null) {
                context.runOnUiQueueThread {
                    promise.resolve(Arguments.createMap()) 
                }
                return@launch
            }

            val documentJson = doc.toJSON()
            if (!documentJson.isNullOrEmpty()) {
                try {
                    val test = JSONObject(documentJson)
                    val map = DataAdapter.jsonObjectToMap(test)
                    val documentMap = Arguments.makeNativeMap(map)
                    val writableMap = Arguments.createMap()
                    writableMap.putMap("_data", documentMap)

                    writableMap.putString("_id", doc.id)
                    writableMap.putDouble("_sequence", doc.sequence.toDouble())

                    context.runOnUiQueueThread {
                        promise.resolve(writableMap)
                    }
                } catch (e: Exception) {
                    context.runOnUiQueueThread {
                        promise.reject("DOCUMENT_ERROR", "Failed to parse document JSON: ${e.message}")
                    }
                }
            } else {
                context.runOnUiQueueThread {
                    promise.resolve(Arguments.createMap()) 
                }
            }
        } catch (e: Throwable) {
            context.runOnUiQueueThread {
                promise.reject("DOCUMENT_ERROR", e.message)
            }
        }
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
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateCollection(collectionName, scopeName, name, promise) ||
          !DataValidation.validateDocumentId(docId, promise)
        ) {
          return@launch
        }
        val map = Arguments.createMap()
        val expiration =
          CollectionManager.getDocumentExpiration(docId, collectionName, scopeName, name)
        if (expiration == null) {
          map.putNull("expiration")
        } else {
          map.putString("expiration", DataAdapter.dateToISOString(expiration))
        }
        context.runOnUiQueueThread {
          promise.resolve(map)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DOCUMENT_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun collection_GetIndexes(
    collectionName: String,
    scopeName: String,
    name: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
          return@launch
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
        context.runOnUiQueueThread {
          promise.resolve(resultsIndexes)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("INDEX_ERROR", e.message)
        }
      }
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
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateCollection(collectionName, scopeName, name, promise) ||
          !DataValidation.validateDocumentId(docId, promise)
        ) {
          return@launch
        }
        CollectionManager.purgeDocument(docId, collectionName, scopeName, name)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DOCUMENT_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun collection_Save(
    document: String,
    blobs: String,
    docId: String,
    name: String,
    scopeName: String,
    collectionName: String,
    concurrencyControlValue: Double?,
    promise: Promise
  ){
    GlobalScope.launch(Dispatchers.IO) {
      try {
        var concurrencyControl: ConcurrencyControl? = null
        val writableMap = Arguments.createMap()
        if (!DataValidation.validateCollection(collectionName, scopeName, name, promise) ||
          !DataValidation.validateDocumentId(docId, promise)
        ) {
          return@launch
        }
        if (concurrencyControlValue != null) {
          concurrencyControl =
            DataAdapter.intToConcurrencyControl(concurrencyControlValue.toInt())
        }
        val result = CollectionManager.saveDocument(
          docId,
          document,
          blobs,
          concurrencyControl,
          collectionName,
          scopeName,
          name
        )
        writableMap.putString("_id", result._id)
        if (result._concurrencyControl != null) {
          writableMap.putBoolean("concurrencyControlResult", result._concurrencyControl)
        } else {
          writableMap.putNull("concurrencyControlResult")
        }
        writableMap.putString("_revId", result._revId)
        writableMap.putInt("_sequence", result._sequence.toInt())
        context.runOnUiQueueThread {
          promise.resolve(writableMap)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DOCUMENT_ERROR", e.message)
        }
      }
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
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateCollection(collectionName, scopeName, name, promise) ||
          !DataValidation.validateDocumentId(docId, promise)
        ) {
          return@launch
        }
        CollectionManager.setDocumentExpiration(docId, expiration, collectionName, scopeName, name)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DOCUMENT_ERROR", e.message)
        }
      }
    }
  }
  @ReactMethod
fun collection_AddChangeListener(
  changeListenerToken: String,
  collectionName: String,
  name: String,
  scopeName: String,
  promise: Promise
) {
  GlobalScope.launch(Dispatchers.IO) {
    try {
      if (!DataValidation.validateCollection(collectionName, scopeName, name, promise)) {
        return@launch
      }
      val collection = DatabaseManager.getCollection(collectionName, scopeName, name)
      if (collection == null) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", "Could not find collection")
        }
        return@launch
      }
      val listener = collection.addChangeListener { change ->
        val resultMap = Arguments.createMap()
        resultMap.putString("token", changeListenerToken)
        
        val docIdsArray = Arguments.createArray()
        change.documentIDs.forEach { docIdsArray.pushString(it) }
        resultMap.putArray("documentIDs", docIdsArray)
        
        val collectionMap = DataAdapter.cblCollectionToMap(collection, name)
        resultMap.putMap("collection", collectionMap)
        context.runOnUiQueueThread {
          sendEvent(context, "collectionChange", resultMap)
        }
      }
      collectionChangeListeners[changeListenerToken] = listener
      context.runOnUiQueueThread {
        promise.resolve(null)
      }
    } catch (e: Throwable) {
      context.runOnUiQueueThread {
        promise.reject("DATABASE_ERROR", e.message)
      }
    }
  }
}

@ReactMethod
fun collection_RemoveChangeListener(
  changeListenerToken: String,
  promise: Promise
) {
  GlobalScope.launch(Dispatchers.IO) {
    try {
      // Check for collection change listeners
      if (collectionChangeListeners.containsKey(changeListenerToken)) {
        val listener = collectionChangeListeners[changeListenerToken]
        listener?.remove()
        collectionChangeListeners.remove(changeListenerToken)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
        return@launch
      }
      
      // Check for document change listeners
      if (collectionDocumentChangeListeners.containsKey(changeListenerToken)) {
        val listener = collectionDocumentChangeListeners[changeListenerToken]
        listener?.remove()
        collectionDocumentChangeListeners.remove(changeListenerToken)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
        return@launch
      }
      
      // No listener found
      context.runOnUiQueueThread {
        promise.reject("COLLECTION_ERROR", "No such listener found with token $changeListenerToken")
      }
    } catch (e: Throwable) {
      context.runOnUiQueueThread {
        promise.reject("COLLECTION_ERROR", e.message)
      }
    }
  }
}

@ReactMethod
fun collection_AddDocumentChangeListener(
  changeListenerToken: String,
  documentId: String,
  collectionName: String,
  name: String,
  scopeName: String,
  promise: Promise
) {
  GlobalScope.launch(Dispatchers.IO) {
    try {
      if (!DataValidation.validateCollection(collectionName, scopeName, name, promise) ||
          !DataValidation.validateDocumentId(documentId, promise)
      ) {
        return@launch
      }
      val collection = DatabaseManager.getCollection(collectionName, scopeName, name)
      if (collection == null) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", "Could not find collection")
        }
        return@launch
      }
      val listener = collection.addDocumentChangeListener(documentId) { change ->
        val resultMap = Arguments.createMap()
        resultMap.putString("token", changeListenerToken)
        resultMap.putString("documentId", change.documentID)
        val collectionMap = DataAdapter.cblCollectionToMap(collection, name)
        resultMap.putMap("collection", collectionMap)
        
        resultMap.putString("database", name)
        context.runOnUiQueueThread {
          sendEvent(context, "collectionDocumentChange", resultMap)
        }
      }
      
      collectionDocumentChangeListeners[changeListenerToken] = listener
      context.runOnUiQueueThread {
        promise.resolve(null)
      }
    } catch (e: Throwable) {
      context.runOnUiQueueThread {
        promise.reject("DATABASE_ERROR", e.message)
      }
    }
  }
}

  // Database Functions
  @ReactMethod
  fun database_ChangeEncryptionKey(
    newKey: String,
    name: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      if (!DataValidation.validateDatabaseName(name, promise)) {
        return@launch
      }
      try {
        DatabaseManager.changeEncryptionKey(name, newKey)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun database_Close(
    name: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      if (!DataValidation.validateDatabaseName(name, promise)) {
        return@launch
      }
      try {
        DatabaseManager.closeDatabase(name)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", e.message)
        }
      }
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
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateDatabaseName(newName, promise)) {
          return@launch
        }
        if (!DataValidation.validatePath(path, promise)) {
          return@launch
        }
        val databaseConfig = DataAdapter.toDatabaseConfigJson(directory, encryptionKey)
        DatabaseManager.copy(path, newName, databaseConfig, context)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun database_Delete(
    name: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      if (!DataValidation.validateDatabaseName(name, promise)) {
        return@launch
      }
      try {
        DatabaseManager.delete(name)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun database_DeleteWithPath(
    path: String,
    name: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      if (!DataValidation.validateDatabaseName(name, promise)) {
        return@launch
      }
      if (!DataValidation.validatePath(path, promise)) {
        return@launch
      }
      try {
        DatabaseManager.deleteWithPath(name, path)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun database_Exists(
    name: String,
    directory: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      if (!DataValidation.validateDatabaseName(name, promise)) {
        return@launch
      }
      if (!DataValidation.validatePath(directory, promise)) {
        return@launch
      }
      try {
        val exists = DatabaseManager.exists(name, directory)
        context.runOnUiQueueThread {
          promise.resolve(exists)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun database_GetPath(
    name: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      if (!DataValidation.validateDatabaseName(name, promise)) {
        return@launch
      }
      try {
        val path = DatabaseManager.getPath(name)
        context.runOnUiQueueThread {
          promise.resolve(path)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun database_Open(
    name: String,
    directory: String? = null,
    encryptionKey: String? = null,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      if (!DataValidation.validateDatabaseName(name, promise)) {
        return@launch
      }
      try {
        val databaseConfig = DataAdapter.toDatabaseConfigJson(directory, encryptionKey)
        val databaseUniqueName = DatabaseManager.openDatabase(
          name,
          databaseConfig,
          context
        )
        context.runOnUiQueueThread {
          val result = Arguments.createMap()
          result.putString("databaseUniqueName", databaseUniqueName)
          promise.resolve(result)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun database_PerformMaintenance(
    maintenanceType: Double,
    databaseName: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      if (!DataValidation.validateDatabaseName(name, promise)) {
        return@launch
      }
      try {
        val mType = DataAdapter.intToMaintenanceType(maintenanceType.toInt())
        DatabaseManager.performMaintenance(databaseName, mType)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("DATABASE_ERROR", e.message)
        }
      }
    }
  }

  // File System Functions
  @ReactMethod
  fun file_GetDefaultPath(promise: Promise) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        val path = FileSystemHelper.fileGetDefaultPath(context)
        context.runOnUiQueueThread {
          promise.resolve(path)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("FILE_ERROR", e.message)
        }
      }
    }
  }

  // Logging Functions

 @ReactMethod
 fun database_SetFileLoggingConfig(
   name: String,
   directory: String,
   logLevel: Double,
   maxSize: Double,
   maxRotateCount: Double,
   shouldUsePlainText: Boolean,
   promise: Promise
 ) {
   GlobalScope.launch(Dispatchers.IO) {
     try {
        if (!DataValidation.validateDatabaseName(name, promise)) {
          return@launch
        }
        LoggingManager.setFileLoggingConfig(
          directory,
          logLevel.toInt(),
          maxSize.toLong(),
          maxRotateCount.toInt(),
          shouldUsePlainText
        )
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
     } catch (e: Throwable) {
       context.runOnUiQueueThread {
         promise.reject("LOGGING_ERROR", e.message)
       }
     }
   }
 }

  @ReactMethod
  fun database_SetLogLevel(
    domain: String,
    logLevel: Double,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (domain.isEmpty()) {
          context.runOnUiQueueThread {
            promise.reject("LOGGING_ERROR", "Log domain must be provided")
          }
        }
        LoggingManager.setLogLevel(domain, logLevel.toInt())
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("LOGGING_ERROR", e.message)
        }
      }
    }
  }

  // SQL++ Query Functions
  @ReactMethod
  fun query_Execute(
  query: String,
  parameters: ReadableMap,
  name: String,
  promise: Promise){
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateDatabaseName(name, promise) || !DataValidation.validateQuery(
            query,
            promise
          )
        ) {
          return@launch
        }
        val queryParameters = DataAdapter.readableMapToParameters(parameters)
        val results = DatabaseManager.executeQuery(query, name, queryParameters)
        val resultsMap = Arguments.createMap()
        resultsMap.putString("data", results)
        context.runOnUiQueueThread {
          promise.resolve(resultsMap)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("QUERY_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun query_Explain(
    query: String,
    parameters: ReadableMap,
    name: String,
    promise: Promise){
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateDatabaseName(name, promise) || !DataValidation.validateQuery(
            query,
            promise
          )
        ) {
          return@launch
        }
        val queryParameters = DataAdapter.readableMapToParameters(parameters)
        val results = DatabaseManager.explainQuery(query, name, queryParameters)
        val resultsMap = Arguments.createMap()
        resultsMap.putString("data", results)
        context.runOnUiQueueThread {
          promise.resolve(resultsMap)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("QUERY_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun query_AddChangeListener(
    changeListenerToken: String,
    query: String,
    parameters: ReadableMap?,
    name: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateDatabaseName(name, promise) || !DataValidation.validateQuery(query, promise)) {
          return@launch
        }
        val database = DatabaseManager.getDatabase(name)
        if (database == null) {
          context.runOnUiQueueThread {
            promise.reject("DATABASE_ERROR", "Could not find database with name $name")
          }
          return@launch
        }
        val queryObj = database.createQuery(query)
        if (parameters != null && parameters.keySetIterator().hasNextKey()) {
          val params = DataAdapter.readableMapToParameters(parameters)
          queryObj.parameters = params
        }
        val listener = queryObj.addChangeListener { change ->
          val resultMap = Arguments.createMap()
          resultMap.putString("token", changeListenerToken)
          change.results?.let { results ->
            val resultList = mutableListOf<String>()
            for (result in results) {
              resultList.add(result.toJSON())
            }
            val jsonArray = "[" + resultList.joinToString(",") + "]"
            resultMap.putString("data", jsonArray)
          }
          change.error?.let { error ->
            resultMap.putString("error", error.localizedMessage)
          }
          context.runOnUiQueueThread {
            sendEvent(context, "queryChange", resultMap)
          }
        }
        queryChangeListeners[changeListenerToken] = listener
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("QUERY_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
fun query_RemoveChangeListener(
  changeListenerToken: String,
  promise: Promise
) {
  GlobalScope.launch(Dispatchers.IO) {
    try {
      if (queryChangeListeners.containsKey(changeListenerToken)) {
        val listener = queryChangeListeners[changeListenerToken]
        listener?.remove()
        queryChangeListeners.remove(changeListenerToken)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } else {
        context.runOnUiQueueThread {
          promise.reject("QUERY_ERROR", "No query listener found for token $changeListenerToken")
        }
      }
    } catch (e: Throwable) {
      context.runOnUiQueueThread {
        promise.reject("QUERY_ERROR", e.message)
      }
    }
  }
}

  // Replicator Functions
@ReactMethod
fun replicator_AddChangeListener(
  changeListenerToken: String,
  replicatorId: String,
  promise: Promise){
  GlobalScope.launch(Dispatchers.IO) {
    try {
      if (!DataValidation.validateReplicatorId(replicatorId, promise)){
        return@launch
      }
      val replicator = ReplicatorManager.getReplicator(replicatorId)
      val listener = replicator?.addChangeListener { change ->
        val statusMap = ReplicatorHelper.generateReplicatorStatusMap(change.status)
        val resultMap = Arguments.createMap()
        resultMap.putString("token", changeListenerToken)
        resultMap.putMap("status", statusMap)
        context.runOnUiQueueThread {
          sendEvent(context, "replicatorStatusChange", resultMap)
        }
      }
      listener?.let {
        replicatorChangeListeners[changeListenerToken] = it
      }
      context.runOnUiQueueThread {
        promise.resolve(null)
      }
    } catch (e: Throwable) {
      context.runOnUiQueueThread {
        promise.reject("REPLICATOR_ERROR", e.message)
      }
    }
  }
}

@ReactMethod
fun replicator_AddDocumentChangeListener(
  changeListenerToken: String,
  replicatorId: String,
  promise: Promise){
  GlobalScope.launch(Dispatchers.IO) {
    try {
      if (!DataValidation.validateReplicatorId(replicatorId, promise)){
        return@launch
      }
      val replicator = ReplicatorManager.getReplicator(replicatorId)
      val listener = replicator?.addDocumentReplicationListener { change ->
        val documentMap = ReplicatorHelper.generateDocumentReplicationMap(change.documents, change.isPush)
        val resultMap = Arguments.createMap()
        resultMap.putString("token", changeListenerToken)
        resultMap.putMap("documents", documentMap)
        context.runOnUiQueueThread {
          sendEvent(context, "replicatorDocumentChange", resultMap)
        }
      }
      listener?.let {
        replicatorDocumentListeners[changeListenerToken] = it
      }
      context.runOnUiQueueThread {
        promise.resolve(null)
      }
    } catch (e: Throwable) {
      context.runOnUiQueueThread {
        promise.reject("REPLICATOR_ERROR", e.message)
      }
    }
  }
}

  @ReactMethod
  fun replicator_Cleanup(
    replicatorId: String,
    promise: Promise) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateReplicatorId(replicatorId, promise)) {
          return@launch
        }
        ReplicatorManager.cleanUp(replicatorId)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("REPLICATOR_ERROR", e.message)
        }
      }
    }
  }

@ReactMethod
fun replicator_Create(
  config: ReadableMap,
  promise: Promise) {
  GlobalScope.launch(Dispatchers.IO) {
    try {
      // Use the ReplicatorHelper to create a configuration from the ReadableMap
      val replicatorConfig = ReplicatorHelper.replicatorConfigFromJson(config)
      val replicatorId = ReplicatorManager.createReplicator(replicatorConfig)
      val map = Arguments.createMap()
      map.putString("replicatorId", replicatorId)
      context.runOnUiQueueThread {
        promise.resolve(map)
      }
    } catch (e: Throwable) {
      context.runOnUiQueueThread {
        promise.reject("REPLICATOR_ERROR", e.message)
      }
    }
  }
}

  @ReactMethod
  fun replicator_GetPendingDocumentIds(
    replicatorId: String,
    name: String,
    scopeName: String,
    collectionName: String,
    promise: Promise){
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateReplicatorId(replicatorId, promise) ||
          !DataValidation.validateCollection(collectionName, scopeName, name, promise) ) {
          return@launch
        }
        val ids = ReplicatorManager.pendingDocIs(replicatorId, collectionName, scopeName, name)
        val writeableMap = Arguments.createMap()
        val writableArray = Arguments.fromList(ids.toList())
        writeableMap.putArray("pendingDocumentIds", writableArray)
        context.runOnUiQueueThread {
          promise.resolve(writeableMap)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("REPLICATOR_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun replicator_GetStatus(
    replicatorId: String,
    promise: Promise) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateReplicatorId(replicatorId, promise)) {
          return@launch
        }
        val status = ReplicatorManager.getStatus(replicatorId)
        val resultMap = DataAdapter.replicatorStatusToMap(status)
        context.runOnUiQueueThread {
          promise.resolve(resultMap)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("REPLICATOR_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun replicator_IsDocumentPending(
    documentId: String,
    replicatorId: String,
    name: String,
    scopeName: String,
    collectionName: String,
    promise: Promise){
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateReplicatorId(replicatorId, promise) ||
          !DataValidation.validateCollection(collectionName, scopeName, name, promise) ||
          !DataValidation.validateDocumentId(documentId, promise)) {
          return@launch
        }
        val isPending = ReplicatorManager.isDocumentPending(documentId, replicatorId, collectionName, scopeName, name)
        val map = Arguments.createMap()
        map.putBoolean("isPending", isPending)
        context.runOnUiQueueThread {
          promise.resolve(map)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("REPLICATOR_ERROR", e.message)
        }
      }
    }
  }

@ReactMethod
fun replicator_RemoveChangeListener(
  changeListenerToken: String,
  replicatorId: String,
  promise: Promise) {
  GlobalScope.launch(Dispatchers.IO) {
    try {
      if (!DataValidation.validateReplicatorId(replicatorId, promise)){
        return@launch
      }

      // Check for replicator change listeners
      if (replicatorChangeListeners.containsKey(changeListenerToken)) {
        val listener = replicatorChangeListeners[changeListenerToken]
        listener?.remove()
        replicatorChangeListeners.remove(changeListenerToken)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
        return@launch
      }

      // Check for document change listeners
      if (replicatorDocumentListeners.containsKey(changeListenerToken)) {
        val listener = replicatorDocumentListeners[changeListenerToken]
        listener?.remove()
        replicatorDocumentListeners.remove(changeListenerToken)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
        return@launch
      }

      // If no listener found
      context.runOnUiQueueThread {
        promise.reject("REPLICATOR_ERROR", "No such listener found with token $changeListenerToken")
      }
    } catch (e: Throwable) {
      context.runOnUiQueueThread {
        promise.reject("REPLICATOR_ERROR", e.message)
      }
    }
  }
}

  @ReactMethod
  fun replicator_ResetCheckpoint(
    replicatorId: String,
    promise: Promise){
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateReplicatorId(replicatorId, promise)){
          return@launch
        }
        ReplicatorManager.resetCheckpoint(replicatorId)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("REPLICATOR_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun replicator_Start(
    replicatorId: String,
    promise: Promise) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateReplicatorId(replicatorId, promise)){
          return@launch
        }
        ReplicatorManager.start(replicatorId)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("REPLICATOR_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun replicator_Stop(
    replicatorId: String,
    promise: Promise) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateReplicatorId(replicatorId, promise)){
          return@launch
        }
        ReplicatorManager.stop(replicatorId)
        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("REPLICATOR_ERROR", e.message)
        }
      }
    }
  }

  // Scope Functions
  @ReactMethod
  fun scope_GetDefault(
    name: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateDatabaseName(name, promise)) {
          return@launch
        }
        val scopeValue = DatabaseManager.defaultScope(name)
        scopeValue?.let { scope ->
          val scopeMap = DataAdapter.scopeToMap(scope, name)
          context.runOnUiQueueThread {
            promise.resolve(scopeMap)
            return@runOnUiQueueThread
          }
        }

        context.runOnUiQueueThread {
          promise.reject("SCOPE_ERROR", "Error getting default scope")
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("SCOPE_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun scope_GetScope(
    scopeName: String,
    name: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateScope(scopeName, name, promise)) {
          return@launch
        }
        val scopeValue = DatabaseManager.getScope(name, scopeName)
        scopeValue?.let { scope ->
          val scopeMap = DataAdapter.scopeToMap(scope, name)
          context.runOnUiQueueThread {
            promise.resolve(scopeMap)
            return@runOnUiQueueThread
          }
        }
        context.runOnUiQueueThread {
          promise.reject("SCOPE_ERROR", "Error getting scope")
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("SCOPE_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun scope_GetScopes(
    name: String,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        if (!DataValidation.validateDatabaseName(name, promise)) {
          return@launch
        }
        val scopes = DatabaseManager.scopes(name)
        val scopeList = Arguments.createArray()
        scopes.forEach { scope ->
          val scopeMap = DataAdapter.scopeToMap(scope, name)
          scopeList.pushMap(scopeMap)
        }
        val resultsScopes: WritableMap = Arguments.createMap()
        resultsScopes.putArray("scopes", scopeList)
        context.runOnUiQueueThread {
          promise.resolve(resultsScopes)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("SCOPE_ERROR", e.message)
        }
      }
    }
  }

   // ============================================================
  // LOG SINKS FUNCTIONS
  // ============================================================

  @ReactMethod
  fun logsinks_SetConsole(
    level: Double?,
    domains: ReadableArray?,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        // Convert Double? to Int?
        val intLevel = level?.toInt()

        // Convert ReadableArray? to List<String>?
        val domainList = domains?.toArrayList()?.filterIsInstance<String>()

        LogSinksManager.setConsoleSink(intLevel, domainList)

        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("LOGSINKS_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun logsinks_SetFile(
    level: Double?,
    config: ReadableMap?,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        // Convert Double? to Int?
        val intLevel = level?.toInt()

        // Convert ReadableMap? to Map<String, Any>?
        val configMap = config?.toHashMap()?.mapValues { it.value as Any }

        LogSinksManager.setFileSink(intLevel, configMap)

        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("LOGSINKS_ERROR", e.message)
        }
      }
    }
  }

  @ReactMethod
  fun logsinks_SetCustom(
    level: Double?,
    domains: ReadableArray?,
    token: String?,
    promise: Promise
  ) {
    GlobalScope.launch(Dispatchers.IO) {
      try {
        // Convert Double? to Int?
        val intLevel = level?.toInt()

        // Convert ReadableArray? to List<String>?
        val domainList = domains?.toArrayList()?.filterIsInstance<String>()

        // Create callback only if enabling (not disabling)
        val callback: ((LogLevel, LogDomain, String) -> Unit)? =
          if (intLevel != null && token != null) {
            { logLevel, logDomain, message ->
              val eventData = Arguments.createMap()
              eventData.putString("token", token)
              eventData.putInt("level", logLevel.ordinal)
              eventData.putString("domain", LogSinksManager.logDomainToString(logDomain))
              eventData.putString("message", message)

              // Note: React Native may show warnings about no listeners if events arrive before
              // JS listener is fully initialized, but these warnings are harmless
              context.runOnUiQueueThread {
                sendEvent(context, "customLogMessage", eventData)
              }
            }
          } else null

        LogSinksManager.setCustomSink(intLevel, domainList, callback)

        context.runOnUiQueueThread {
          promise.resolve(null)
        }
      } catch (e: Throwable) {
        context.runOnUiQueueThread {
          promise.reject("LOGSINKS_ERROR", e.message)
        }
      }
    }
  }

  companion object {
    const val NAME = "CblReactnative"
  }
}
