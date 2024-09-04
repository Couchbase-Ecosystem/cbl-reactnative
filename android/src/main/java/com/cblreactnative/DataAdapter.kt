package com.cblreactnative

import cbl.js.kotiln.DatabaseManager
import com.couchbase.lite.MaintenanceType
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import org.json.JSONObject

import com.couchbase.lite.*
import com.facebook.react.bridge.ReadableMap
import org.json.JSONArray
import java.net.URI
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
  fun adaptDocumentToMap(document: Document?): WritableMap {
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
    map.remove("sequence")
    val resultsMap = Arguments.createMap()
    val documentMap: WritableMap = Arguments.makeNativeMap(map)
    resultsMap.putString("_id", document.id)
    resultsMap.putDouble("_sequence", document.sequence.toDouble())
    resultsMap.putMap("_data", documentMap)
    return resultsMap
  }

  @Throws(Exception::class)
  fun adaptReadableMapToParameters(map: ReadableMap): Parameters? {
    val queryParameters = Parameters()
    val iterator = map.keySetIterator()
    var count = 0
    while (iterator.hasNextKey()) {
      val key = iterator.nextKey()
      val nestedMap = map.getMap(key)
      val nestedType = nestedMap?.getString("type")
      count += 1
      when (nestedType) {
        "int" -> queryParameters.setInt(key, nestedMap.getInt("value"))
        "long" -> queryParameters.setLong(key, nestedMap.getLong("value"))
        "float" -> queryParameters.setFloat(key, nestedMap.getDouble("value").toFloat())
        "double" -> queryParameters.setDouble(key, nestedMap.getDouble("value"))
        "boolean" -> queryParameters.setBoolean(key, nestedMap.getBoolean("value"))
        "string" -> queryParameters.setString(key, nestedMap.getString("value"))
        "date" -> {
          val stringValue = map.getString("value")
          stringValue?.let { strValue ->
            val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
            val date = dateFormat.parse(strValue)
            date?.let { d ->
              queryParameters.setDate(key, d)
            }
          }
        }
        else -> throw Exception("Error: Invalid parameter type")
      }
    }
    if (count == 0) {
      return  null
    }
    return queryParameters
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

  @Throws(Exception::class)
  fun adaptReadableMapToReplicatorConfig(map: ReadableMap) : ReplicatorConfiguration {
    val target = map.getMap("target")
    val url = target?.getString("url")
    val replicationTypeString = map.getString("replicationType")
    if (url.isNullOrEmpty() || replicationTypeString.isNullOrEmpty()) {
      throw Exception("Replicator target url or replicator type is required")
    }
    val replicatorType = adaptStringToReplicatorType(replicationTypeString)
    val uri = URI(url)
    val endpoint = URLEndpoint(uri)
    val continuous = map.getBoolean("continuous")
    val acceptParentDomainCookies = map.getBoolean("acceptParentDomainCookies")
    val acceptSelfSignedCerts = map.getBoolean("acceptSelfSignedCerts")
    val autoPurgeEnabled = map.getBoolean("autoPurgeEnabled")

    val configBuilder = ReplicatorConfigurationFactory.newConfig(
      target = endpoint,
      continuous = continuous,
      acceptParentDomainCookies = acceptParentDomainCookies,
      acceptOnlySelfSignedServerCertificate = acceptSelfSignedCerts,
      enableAutoPurge = autoPurgeEnabled,
      type = replicatorType,
    )
    val authenticatorMap = map.getMap("authenticator")
    authenticatorMap?.let {
      val authenticator = adaptMapToAuthenticator(it)
      configBuilder.authenticator = authenticator
    }
    //handle adding collections config
    adaptCollectionsConfigFromMapForBuilder(map, configBuilder)
    return configBuilder
  }

  private fun adaptCollectionsConfigFromMapForBuilder(map: ReadableMap, configBuilder: ReplicatorConfiguration) {
    val configJson = map.getString("collectionConfig")
    if (configJson.isNullOrEmpty()) {
      throw IllegalArgumentException("Collection configuration is required")
    }
    val collectionConfigArray = JSONArray(configJson)
    if (collectionConfigArray.length() == 0) {
      throw IllegalArgumentException("Error: couldn't parse collection configuration arguments")
    }
    //loop through the collections and configuration and add to the config
    //the item will have two keys, collections and config
    for (itemCounter in 0 until collectionConfigArray.length()) {
      val mutableCollections = mutableListOf<CBLCollection>()
      val itemObject = collectionConfigArray.getJSONObject(itemCounter)
      val collections = itemObject.optJSONArray("collections")
      if (collections == null || collections.length() == 0) {
        throw IllegalArgumentException("No collections found in the config")
      } else {
        for (collectionCounter in 0 until collections.length()) {
          val collectionItemObj = collections.getJSONObject(collectionCounter)
          val collectionObj = collectionItemObj.getJSONObject("collection")
          val collectionName = collectionObj.getString("name")
          val scopeName = collectionObj.getString("scopeName")
          val databaseName = collectionObj.getString("databaseName")
          val collection = DatabaseManager.getCollection(collectionName, scopeName, databaseName)
          if (collection == null) {
            throw IllegalArgumentException("Collection not found")
          } else {
            mutableCollections.add(collection)
          }
        }
      }
      //get the configuration for the collections which is a collection
      //of documentIds and channels to filter
      //these should be optional, where at least one collection is needed to be added
      val replicatorCollectionConfig = CollectionConfiguration()
      val configObj = itemObject.optJSONObject("config")
      if (configObj != null) {
        val documentIds = configObj.optJSONArray("documentIds")
        if (documentIds != null) {
          val ids = mutableListOf<String>()
          for (i in 0 until documentIds.length()) {
            ids.add(documentIds.getString(i))
          }
          replicatorCollectionConfig.documentIDs = ids
        }
        val channels = configObj.optJSONArray("channels")
        if (channels != null) {
          val channelsList = mutableListOf<String>()
          for (i in 0 until channels.length()) {
            channelsList.add(channels.getString(i))
          }
          replicatorCollectionConfig.channels = channelsList
        }
      }
      configBuilder.addCollections(mutableCollections, replicatorCollectionConfig)
    }
  }

  fun adaptReplicatorStatusToMap(status: ReplicatorStatus): WritableMap {
    val resultMap = Arguments.createMap()
    val progressMap = Arguments.createMap()
    val errorMap = Arguments.createMap()
    status.error?.let {
      errorMap.putString("code", it.code.toString())
      errorMap.putString("message", it.message)
    }
    progressMap.putDouble("completed", status.progress.completed.toDouble())
    progressMap.putDouble("total", status.progress.total.toDouble())
    resultMap.putString("activity", status.activityLevel.name)
    resultMap.putMap("progress", progressMap)
    resultMap.putMap("error", errorMap)
    return resultMap
  }

  private fun adaptStringToReplicatorType(strValue :String): ReplicatorType {
    return when (strValue) {
      "PUSH" -> ReplicatorType.PUSH
      "PULL" -> ReplicatorType.PULL
      "PUSH_AND_PULL" -> ReplicatorType.PUSH_AND_PULL
      else -> throw IllegalArgumentException("Invalid replicator type")
    }
  }

  private fun adaptMapToAuthenticator(map: ReadableMap): Authenticator? {
    val type = map.getString("type")
    val data = map.getMap("data")
    if (type.isNullOrEmpty() || data == null) {
      throw IllegalArgumentException("Authenticator type and data are required")
    }
    when (type) {
      "basic" -> {
        val username = data.getString("username")
        val password = data.getString("password")
        if (username.isNullOrEmpty() || password.isNullOrEmpty()) {
          throw IllegalArgumentException("Username and password are required")
        }
        return BasicAuthenticator(username, password.toCharArray())
      }
      "session" -> {
        val sessionId = data.getString("sessionId")
        val cookieName = data.getString("cookieName")
        if(sessionId.isNullOrEmpty() || cookieName.isNullOrEmpty()) {
          throw IllegalArgumentException("SessionId and cookieName are required")
        }
        return SessionAuthenticator(sessionId, cookieName)
      }
      else -> throw IllegalArgumentException("Invalid authenticator type")
    }
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
