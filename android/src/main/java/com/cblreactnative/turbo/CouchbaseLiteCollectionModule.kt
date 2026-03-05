package com.cblreactnative.turbo

import cbl.js.kotlin.DatabaseManager
import cbl.js.kotlin.CollectionManager
import com.cblreactnative.DataAdapter
import com.cblreactnative.DataValidation
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.turbomodule.core.interfaces.TurboModule
import com.couchbase.lite.ConcurrencyControl
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * Turbo Module implementation for Couchbase Lite Collection operations
 * 
 * This module handles:
 * - Saving documents to collections
 * - Getting documents from collections
 * - Creating and getting collections
 * 
 * IMPORTANT: This class implements TurboModule interface to enable JSI-based
 * communication for better performance compared to the legacy bridge.
 */
@OptIn(DelicateCoroutinesApi::class)
@ReactModule(name = CouchbaseLiteCollectionModule.NAME)
class CouchbaseLiteCollectionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), TurboModule {

    override fun getName(): String = NAME
    
    // Mark this as a Turbo Module
    override fun invalidate() {
        // Cleanup if needed
    }

    /**
     * Saves a document to a collection
     */
    @ReactMethod
    fun collection_Save(
        document: String,
        blobs: String,
        id: String,
        databaseName: String,
        scopeName: String,
        collectionName: String,
        concurrencyControlValue: Double,
        promise: Promise
    ) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                if (!DataValidation.validateCollection(collectionName, scopeName, databaseName, promise) ||
                    !DataValidation.validateDocumentId(id, promise)
                ) {
                    return@launch
                }
                
                var concurrencyControl: ConcurrencyControl? = null
                if (concurrencyControlValue != -9999.0) {
                    concurrencyControl = DataAdapter.intToConcurrencyControl(concurrencyControlValue.toInt())
                }
                
                val result = CollectionManager.saveDocument(
                    id,
                    document,
                    blobs,
                    concurrencyControl,
                    collectionName,
                    scopeName,
                    databaseName
                )
                
                reactContext.runOnUiQueueThread {
                    val writableMap = Arguments.createMap()
                    writableMap.putString("_id", result._id)
                    writableMap.putString("_revId", result._revId)
                    writableMap.putInt("_sequence", result._sequence.toInt())
                    promise.resolve(writableMap)
                }
            } catch (e: Throwable) {
                reactContext.runOnUiQueueThread {
                    promise.reject("COLLECTION_ERROR", e.message)
                }
            }
        }
    }

    /**
     * Gets a document from a collection
     */
    @ReactMethod
    fun collection_GetDocument(
        docId: String,
        databaseName: String,
        scopeName: String,
        collectionName: String,
        promise: Promise
    ) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                if (!DataValidation.validateCollection(collectionName, scopeName, databaseName, promise) ||
                    !DataValidation.validateDocumentId(docId, promise)
                ) {
                    return@launch
                }
                
                val doc = CollectionManager.getDocument(docId, collectionName, scopeName, databaseName)
                if (doc == null) {
                    reactContext.runOnUiQueueThread {
                        promise.resolve(Arguments.createMap())
                    }
                    return@launch
                }
                
                val documentJson = doc.toJSON()
                if (!documentJson.isNullOrEmpty()) {
                    val jsonObject = JSONObject(documentJson)
                    val map = DataAdapter.jsonObjectToMap(jsonObject)
                    val documentMap = Arguments.makeNativeMap(map)
                    
                    reactContext.runOnUiQueueThread {
                        val writableMap = Arguments.createMap()
                        writableMap.putMap("_data", documentMap)
                        writableMap.putString("_id", doc.id)
                        writableMap.putDouble("_sequence", doc.sequence.toDouble())
                        writableMap.putString("_revisionID", doc.revisionID ?: "")
                        promise.resolve(writableMap)
                    }
                } else {
                    reactContext.runOnUiQueueThread {
                        promise.resolve(Arguments.createMap())
                    }
                }
            } catch (e: Throwable) {
                reactContext.runOnUiQueueThread {
                    promise.reject("COLLECTION_ERROR", e.message)
                }
            }
        }
    }

    /**
     * Gets an existing collection
     */
    @ReactMethod
    fun collection_GetCollection(
        collectionName: String,
        databaseName: String,
        scopeName: String,
        promise: Promise
    ) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                if (!DataValidation.validateCollection(collectionName, scopeName, databaseName, promise)) {
                    return@launch
                }
                
                val col = DatabaseManager.getCollection(collectionName, scopeName, databaseName)
                col?.let { collection ->
                    val colMap = DataAdapter.cblCollectionToMap(collection, databaseName)
                    reactContext.runOnUiQueueThread {
                        promise.resolve(colMap)
                    }
                    return@launch
                }
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(null)
                }
            } catch (e: Throwable) {
                reactContext.runOnUiQueueThread {
                    promise.reject("COLLECTION_ERROR", e.message)
                }
            }
        }
    }

    /**
     * Creates a new collection
     */
    @ReactMethod
    fun collection_CreateCollection(
        collectionName: String,
        databaseName: String,
        scopeName: String,
        promise: Promise
    ) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                if (!DataValidation.validateCollection(collectionName, scopeName, databaseName, promise)) {
                    return@launch
                }
                
                val col = DatabaseManager.createCollection(collectionName, scopeName, databaseName)
                col?.let { collection ->
                    val colMap = DataAdapter.cblCollectionToMap(collection, databaseName)
                    reactContext.runOnUiQueueThread {
                        promise.resolve(colMap)
                    }
                    return@launch
                }
                
                reactContext.runOnUiQueueThread {
                    promise.reject("COLLECTION_ERROR", "Error creating collection")
                }
            } catch (e: Throwable) {
                reactContext.runOnUiQueueThread {
                    promise.reject("COLLECTION_ERROR", e.message)
                }
            }
        }
    }

    /**
     * Echo method for measuring pure bridge overhead - TURBO OPTIMIZED
     * 
     * KEY DIFFERENCE FROM LEGACY:
     * - Executes SYNCHRONOUSLY on the JS/JSI thread
     * - NO runOnUiQueueThread dispatch (saves ~0.01-0.05ms per call)
     * - NO GlobalScope.launch (saves thread scheduling overhead)
     * - Direct promise resolution without thread hop
     * 
     * This is how Turbo Modules SHOULD work - synchronous when possible!
     */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun collection_EchoSync(data: String): String {
        // TRUE SYNCHRONOUS - returns directly without Promise!
        // This is the fastest possible bridge call
        return data
    }

    /**
     * Echo method with Promise but still synchronous execution
     */
    @ReactMethod
    fun collection_Echo(data: String, promise: Promise) {
        // TURBO: Execute and resolve IMMEDIATELY on calling thread
        // NO thread dispatch - this is the key difference!
        val result = Arguments.createMap()
        result.putString("data", data)
        promise.resolve(result)  // Direct resolve, no queue
    }

    /**
     * Turbo-optimized performance check - TRUE SYNCHRONOUS
     * 
     * This method demonstrates the REAL power of Turbo Modules:
     * - Executes entirely on the JS thread via JSI
     * - No thread switching overhead
     * - No async dispatch overhead
     * - Returns result synchronously
     */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun collection_PerformanceCheckTurboSync(iterations: Double): WritableMap {
        val startTime = System.nanoTime()
        val count = iterations.toInt()
        
        // Execute directly - this runs on JS thread!
        var sum: Long = 0
        for (i in 0 until count) {
            sum += i.toLong()
        }
        
        val endTime = System.nanoTime()
        val timeMs = (endTime - startTime) / 1_000_000.0
        
        // Return synchronously - no Promise, no thread hop!
        val result = Arguments.createMap()
        result.putDouble("timeMs", timeMs)
        result.putInt("iterations", count)
        result.putDouble("checksum", sum.toDouble())
        return result
    }

    /**
     * Async version for comparison
     */
    @ReactMethod
    fun collection_PerformanceCheckTurbo(iterations: Double, promise: Promise) {
        val startTime = System.nanoTime()
        val count = iterations.toInt()
        
        // Execute directly on current thread - NO GlobalScope.launch!
        var sum: Long = 0
        for (i in 0 until count) {
            sum += i.toLong()
        }
        
        val endTime = System.nanoTime()
        val timeMs = (endTime - startTime) / 1_000_000.0
        
        // Resolve immediately - no thread dispatch
        val result = Arguments.createMap()
        result.putDouble("timeMs", timeMs)
        result.putInt("iterations", count)
        result.putDouble("checksum", sum.toDouble())
        promise.resolve(result)
    }

    /**
     * Batch echo for measuring overhead across many calls
     * Processes multiple items in a single native call to amortize bridge overhead
     */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun collection_BatchEchoSync(count: Double): Int {
        // Process batch synchronously - returns count
        return count.toInt()
    }

    /**
     * Gets the document count in a collection
     */
    @ReactMethod
    fun collection_GetCount(
        collectionName: String,
        databaseName: String,
        scopeName: String,
        promise: Promise
    ) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                if (!DataValidation.validateCollection(collectionName, scopeName, databaseName, promise)) {
                    return@launch
                }
                
                val count = CollectionManager.documentsCount(collectionName, scopeName, databaseName)
                
                reactContext.runOnUiQueueThread {
                    val result = Arguments.createMap()
                    result.putInt("count", count.toInt())
                    promise.resolve(result)
                }
            } catch (e: Throwable) {
                reactContext.runOnUiQueueThread {
                    promise.reject("COLLECTION_ERROR", e.message)
                }
            }
        }
    }

    /**
     * Gets all index names in a collection
     */
    @ReactMethod
    fun collection_GetIndexes(
        collectionName: String,
        scopeName: String,
        databaseName: String,
        promise: Promise
    ) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                if (!DataValidation.validateCollection(collectionName, scopeName, databaseName, promise)) {
                    return@launch
                }
                
                val indexes = CollectionManager.getIndexes(collectionName, scopeName, databaseName)
                
                reactContext.runOnUiQueueThread {
                    val result = Arguments.createMap()
                    val indexArray = Arguments.createArray()
                    indexes?.forEach { indexArray.pushString(it) }
                    result.putArray("indexes", indexArray)
                    promise.resolve(result)
                }
            } catch (e: Throwable) {
                reactContext.runOnUiQueueThread {
                    promise.reject("COLLECTION_ERROR", e.message)
                }
            }
        }
    }

    /**
     * Gets all collections in a scope
     */
    @ReactMethod
    fun collection_GetCollections(
        databaseName: String,
        scopeName: String,
        promise: Promise
    ) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                if (!DataValidation.validateDatabaseName(databaseName, promise)) {
                    return@launch
                }
                
                val collections = DatabaseManager.getCollections(scopeName, databaseName) ?: emptySet()
                val collectionsJson = DataAdapter.collectionsToJsonString(collections, databaseName)
                    
                reactContext.runOnUiQueueThread {
                    val result = Arguments.createMap()
                    result.putString("collections", collectionsJson)
                    promise.resolve(result)
                }
            } catch (e: Throwable) {
                reactContext.runOnUiQueueThread {
                    promise.reject("COLLECTION_ERROR", e.message)
                }
            }
        }
    }

    companion object {
        const val NAME = "CouchbaseLiteCollection"
    }
}
