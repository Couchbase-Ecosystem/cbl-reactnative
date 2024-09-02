package com.cblreactnative

import com.couchbase.lite.MaintenanceType
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import org.json.JSONObject

import com.couchbase.lite.*
import com.facebook.react.bridge.ReadableMap
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import com.couchbase.lite.Collection as CBLCollection

object DataAdapter {

  fun adaptMaintenanceTypeFromInt(maintenanceType: Int): MaintenanceType {
    return when (maintenanceType) {
      0 -> MaintenanceType.COMPACT
      1 -> MaintenanceType.REINDEX
      2 -> MaintenanceType.INTEGRITY_CHECK
      3 -> MaintenanceType.OPTIMIZE
      4 -> MaintenanceType.FULL_OPTIMIZE
      else -> MaintenanceType.FULL_OPTIMIZE
    }
  }

  @Throws(Exception::class)
  fun adaptDocumentToMap(document: Document?) : WritableMap {
    if (document == null) {
      return Arguments.createMap()
    }
    val map = document.toMap()
    //fix blob - only return properties, to get the content they will have to call getBlobContent
    for (key in map.keys) {
      if (map[key] is Blob) {
        val blob = map[key] as Blob
        map[key] = blob.properties
      }
    }
    map.remove("id")
    map.remove("sequence")
    val documentMap: WritableMap = Arguments.makeNativeMap(map)
    documentMap.putString("_id", document.id)
    documentMap.putLong("_sequence", document.sequence)
    return documentMap
  }

  @Throws(Exception::class)
  fun adaptMapToIndexDto(
    indexName: String,
    indexMap: ReadableMap
  ): IndexDto {
    val indexType = indexMap.getString("type")
    val indexProperties = indexMap.getArray("items")
    val valueIndexProperties = mutableListOf<ValueIndexItem>()
    val fullTextIndexProperties = mutableListOf<FullTextIndexItem>()
    val ignoreAccents = indexMap.getBoolean("ignoreAccents")
    val language = indexMap.getString("language")

    if (indexName.isEmpty()) {
      throw Exception("Error: Index name must be provided")
    }
    if (indexType.isNullOrEmpty()) {
      throw Exception("Error: Index type must be provided")
    }
    indexProperties?.let { ip ->
      if (indexType == "value") {
        for (i in 0 until ip.size()) {
          valueIndexProperties.add(ValueIndexItem.property(indexProperties.getString(i)))
        }
      } else {

        for (i in 0 until ip.size()) {
          fullTextIndexProperties.add(FullTextIndexItem.property(indexProperties.getString(i)))
        }
      }
    }

    return IndexDto(
      indexName,
      indexType,
      language,
      ignoreAccents,
      valueIndexProperties.toTypedArray(),
      fullTextIndexProperties.toTypedArray()
    )
  }

  fun dateToISOString(date: Date?): String? {
    if (date == null) {
      return null
    }
    val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
    return format.format(date)
  }

  fun adaptConcurrencyControlFromInt(concurrencyControl: Int): ConcurrencyControl {
    return when (concurrencyControl) {
      0 -> ConcurrencyControl.LAST_WRITE_WINS
      1 -> ConcurrencyControl.FAIL_ON_CONFLICT
      else -> ConcurrencyControl.LAST_WRITE_WINS
    }
  }

  fun adaptCollectionToMap(collection: CBLCollection, databaseName: String)
    : WritableMap {
    val colMap: WritableMap = Arguments.createMap()
    val scopeMap: WritableMap = adaptScopeToMap(collection.scope, databaseName)
    colMap.putString("name", collection.name)
    colMap.putMap("scope", scopeMap)
    return colMap
  }

  fun adaptScopeToMap(
    scope: Scope,
    databaseName: String
  ): WritableMap {
    val scopeMap: WritableMap = Arguments.createMap()
    scopeMap.putString("name", scope.name)
    scopeMap.putString("databaseName", databaseName)
    return scopeMap
  }

  fun getDatabaseConfig(
    directory: String?,
    encryptionKey: String?
  ): JSONObject {
    val databaseConfig = JSONObject()
    if (directory != null) {
      databaseConfig.put("directory", directory)
    }
    if (encryptionKey != null) {
      databaseConfig.put("encryptionKey", encryptionKey)
    }
    return databaseConfig
  }
}
