package com.cblreactnative

import com.couchbase.lite.MaintenanceType
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import org.json.JSONObject

import com.couchbase.lite.*
import com.couchbase.lite.Collection as CBLCollection

object DataAdapter {

  fun adaptMaintenanceTypeFromInt(maintenanceType: Int) : MaintenanceType {
    return when (maintenanceType) {
      0 -> MaintenanceType.COMPACT
      1 -> MaintenanceType.REINDEX
      2 -> MaintenanceType.INTEGRITY_CHECK
      3 -> MaintenanceType.OPTIMIZE
      4 -> MaintenanceType.FULL_OPTIMIZE
      else -> MaintenanceType.FULL_OPTIMIZE
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

  fun adaptScopeToMap(scope: Scope,
                         databaseName: String): WritableMap {
    val scopeMap: WritableMap = Arguments.createMap()
    scopeMap.putString("name", scope.name)
    scopeMap.putString("databaseName", databaseName)
    return scopeMap
  }

  fun getDatabaseConfig(
    directory: String?,
    encryptionKey: String?): JSONObject {
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
