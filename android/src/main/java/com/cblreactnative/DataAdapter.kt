package com.cblreactnative

import cbl.js.kotiln.DatabaseManager
import com.couchbase.lite.MaintenanceType
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import org.json.JSONObject

import com.couchbase.lite.*
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import org.json.JSONArray
import java.net.URI
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import com.couchbase.lite.Collection as CBLCollection

object DataAdapter {

  /**
   * Converts a `CBLCollection` object to a `WritableMap`.
   *
   * This function takes a `CBLCollection` object and the associated database name, and converts them into a `WritableMap`
   * that can be used in React Native. The resulting map includes the collection name and the scope information.
   *
   * @param collection The `CBLCollection` object to be converted.
   * @param databaseName The name of the database associated with the collection.
   * @return A `WritableMap` representation of the provided `CBLCollection` and database name.
   */
  fun cblCollectionToMap(collection: CBLCollection, databaseName: String)
    : WritableMap {
    val colMap: WritableMap = Arguments.createMap()
    val scopeMap: WritableMap = scopeToMap(collection.scope, databaseName)
    colMap.putString("name", collection.name)
    colMap.putMap("scope", scopeMap)
    return colMap
  }

  /**
   * Converts a `Date` object to an ISO 8601 string representation.
   *
   * This function takes a `Date` object and formats it into a string following the ISO 8601 standard.
   * If the provided date is `null`, the function returns `null`.
   *
   * @param date The `Date` object to be converted. Can be `null`.
   * @return A string representation of the date in ISO 8601 format, or `null` if the date is `null`.
   */
  fun dateToISOString(date: Date?): String? {
    if (date == null) {
      return null
    }
    val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
    return format.format(date)
  }

  /**
   * Converts a `Document` to a `WritableMap`.
   *
   * This function is used to adapt a Couchbase Lite `Document` to a `WritableMap` that can be
   * used in React Native to send to Javascript via the Native Bridge. It iterates through the entries
   * of the provided `Document` and converts any nested maps that represent blobs into their properties.
   * A developer needing the blob would need to manually call the Collection `getBlobContent` method.
   *
   * @param document The `Document` to be converted. If the document is `null`, an empty `WritableMap` is returned.
   * @return A `WritableMap` representation of the provided `Document`.
   * @throws Exception If there is an error during the conversion.
   */
  @Throws(Exception::class)
  fun documentToMap(document: Document?): WritableMap {
    if (document == null) {
      return Arguments.createMap()
    }
    val map = document.toMap()
    //fix blob - only return properties, to get the content they will have to call getBlobContent
    for (key in map.keys) {
      val itemValue = map[key]
      if (itemValue is Blob) {
        document.getBlob(key)?.let { blob ->
          val properties = blob.properties.toMap()
          map[key] = properties
        }
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

  /**
   * Converts an integer value to a `MaintenanceType` enum.
   *
   * This function maps an integer value to the corresponding `MaintenanceType` enum.
   * Supported integer values are:
   * - 0: `COMPACT`
   * - 1: `REINDEX`
   * - 2: `INTEGRITY_CHECK`
   * - 3: `OPTIMIZE`
   * - 4: `FULL_OPTIMIZE`
   * If the provided integer value does not match any supported maintenance type, `FULL_OPTIMIZE` is returned by default.
   *
   * @param maintenanceType The integer value representing the maintenance type.
   * @return The corresponding `MaintenanceType` enum.
   */
  fun intToMaintenanceType(maintenanceType: Int): MaintenanceType {
    return when (maintenanceType) {
      0 -> MaintenanceType.COMPACT
      1 -> MaintenanceType.REINDEX
      2 -> MaintenanceType.INTEGRITY_CHECK
      3 -> MaintenanceType.OPTIMIZE
      4 -> MaintenanceType.FULL_OPTIMIZE
      else -> MaintenanceType.FULL_OPTIMIZE
    }
  }

  /**
   * Converts a `ReadableMap` to an `IndexDto` object.
   *
   * This function reads the necessary fields from the provided `ReadableMap` and constructs an
   * `IndexDto` object (Index Data Transformation Object).
   * It handles the index name, type, and various configuration options such as ignore accents and language.
   * Additionally, it sets up the value index properties and full-text index properties if provided.
   *
   * @param indexName The name of the index.
   * @param indexMap The `ReadableMap` containing the index configuration.
   * @return An `IndexDto` object based on the provided configuration.
   * @throws Exception If the required fields (index name or index type) are missing or invalid.
   */
  @Throws(Exception::class)
  fun mapToIndexDto(
    indexName: String,
    indexMap: ReadableMap
  ): IndexDto {
    val indexType = indexMap.getString("type")
    val indexProperties = indexMap.getArray("items")
    val valueIndexProperties = mutableListOf<ValueIndexItem>()
    val fullTextIndexProperties = mutableListOf<FullTextIndexItem>()

    if (indexName.isEmpty()) {
      throw Exception("Error: Index name must be provided")
    }
    if (indexType.isNullOrEmpty()) {
      throw Exception("Error: Index type must be provided")
    }

    var ignoreAccents: Boolean? = null
    var language: String? = null
    if (indexMap.hasKey("ignoreAccents")) {
      ignoreAccents = indexMap.getBoolean("ignoreAccents")
    }
    if (indexMap.hasKey("language")) {
      language = indexMap.getString("language")
    }

    indexProperties?.let { ip ->
      if (indexType == "value") {
        for (countValue in 0 until ip.size()) {
          val arItems = indexProperties.getArray(countValue)
          for (countArray in 0 until arItems.size()) {
            val item = arItems.getString(countArray)
            valueIndexProperties.add(ValueIndexItem.property(item))
          }
        }
      } else {
        for (countValue in 0 until ip.size()) {
          val arItems = indexProperties.getArray(countValue)
          for (countArray in 0 until arItems.size()) {
            val item = arItems.getString(countArray)
            fullTextIndexProperties.add(FullTextIndexItem.property(item))
          }
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

  /**
   * Converts an integer value to a `ConcurrencyControl` enum.
   *
   * This function maps an integer value to the corresponding `ConcurrencyControl` enum.
   * Supported integer values are:
   * - 0: `LAST_WRITE_WINS`
   * - 1: `FAIL_ON_CONFLICT`
   * If the provided integer value does not match any supported concurrency control type, `LAST_WRITE_WINS` is returned by default.
   *
   * @param concurrencyControl The integer value representing the concurrency control type.
   * @return The corresponding `ConcurrencyControl` enum.
   */
  fun intToConcurrencyControl(concurrencyControl: Int): ConcurrencyControl {
    return when (concurrencyControl) {
      0 -> ConcurrencyControl.LAST_WRITE_WINS
      1 -> ConcurrencyControl.FAIL_ON_CONFLICT
      else -> ConcurrencyControl.LAST_WRITE_WINS
    }
  }

  /**
   * Converts a `ReadableMap` to an `Authenticator` object.  Authentication is required for Replicator Authentication.
   *
   * This function reads the `type` and `data` fields from the provided `ReadableMap` and creates
   * an appropriate `Authenticator` object based on the type. Supported types include `basic` and `session`.
   *
   * @param map The `ReadableMap` containing the authenticator configuration.
   * @return An `Authenticator` object based on the provided configuration.
   * @throws IllegalArgumentException If the `type` or `data` fields are missing or invalid, or if the required fields for the specific authenticator type are missing.
   */
  private fun readableMapToAuthenticator(map: ReadableMap): Authenticator? {
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
        if (sessionId.isNullOrEmpty() || cookieName.isNullOrEmpty()) {
          throw IllegalArgumentException("SessionId and cookieName are required")
        }
        return SessionAuthenticator(sessionId, cookieName)
      }

      else -> throw IllegalArgumentException("Invalid authenticator type")
    }
  }

  /**
   * Converts a `ReadableMap` to a `ReplicatorConfiguration` by adding collection configurations.
   *
   * This function reads the `collectionConfig` field from the provided `ReadableMap` and parses it into
   * a list of collections and their respective configurations. It then adds these collections and configurations
   * to the provided `ReplicatorConfiguration` object.
   *
   * @param map The `ReadableMap` containing the collection configuration.
   * @param configBuilder The `ReplicatorConfiguration` object to which the collections and configurations will be added.
   * @throws IllegalArgumentException If the `collectionConfig` field is missing, empty, or contains invalid data.
   */
  private fun readableMapToCollectionConfig(
    map: ReadableMap,
    configBuilder: ReplicatorConfiguration
  ) {
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

  /**
   * Converts a `ReadableMap` to a `Parameters` object.
   *
   * This function iterates through the entries of the provided `ReadableMap` and converts
   * each entry to the appropriate type in the `Parameters` object. Supported types include
   * `int`, `long`, `float`, `double`, `boolean`, `string`, and `date`.
   *
   * @param map The `ReadableMap` to be converted.
   * @return A `Parameters` object containing the converted entries from the `ReadableMap`, or `null` if the map is empty.
   * @throws Exception If there is an error during the conversion, particularly if an unsupported type is encountered.
   */
  @Throws(Exception::class)
  fun readableMapToParameters(map: ReadableMap): Parameters? {
    val queryParameters = Parameters()
    val iterator = map.keySetIterator()
    var count = 0
    while (iterator.hasNextKey()) {
      val key = iterator.nextKey()
      val nestedMap = map.getMap(key)
      val nestedType = nestedMap?.getString("type")
      count += 1
      when (nestedType) {
        "int" -> queryParameters.setInt(key, nestedMap.getDouble("value").toInt())
        "long" -> queryParameters.setLong(key, nestedMap.getDouble("value").toLong())
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
      return null
    }
    return queryParameters
  }

  /**
   * Converts a `ReadableMap` to a `ReplicatorConfiguration` object.
   *
   * This function reads the necessary fields from the provided `ReadableMap` and constructs a `ReplicatorConfiguration`
   * object. It handles the target URL, replicator type, and various configuration options such as continuous replication,
   * cookie acceptance, and certificate acceptance. Additionally, it sets up the authenticator and headers if provided,
   * and adds collection configurations to the replicator configuration.
   *
   * @param map The `ReadableMap` containing the replicator configuration.
   * @return A `ReplicatorConfiguration` object based on the provided configuration.
   * @throws Exception If the required fields (target URL or replicator type) are missing or invalid.
   */
  @Throws(Exception::class)
  fun readableMapToReplicatorConfig(map: ReadableMap): ReplicatorConfiguration {
    val target = map.getMap("target")
    val url = target?.getString("url")
    val replicationTypeString = map.getString("replicatorType")
    if (url.isNullOrEmpty() || replicationTypeString.isNullOrEmpty()) {
      throw Exception("Replicator target url or replicator type is required")
    }
    val replicatorType = stringToReplicatorType(replicationTypeString)
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
      val authenticator = readableMapToAuthenticator(it)
      configBuilder.authenticator = authenticator
    }

    val headersType = map.getType("headers")
    if (headersType == ReadableType.Map) {
      val headers = map.getMap("headers")
      headers?.let {
        val headersMap = HashMap<String, String>()
        val iterator = it.keySetIterator()
        while (iterator.hasNextKey()) {
          val key = iterator.nextKey()
          val value = it.getString(key)
          if (value != null) {
            headersMap[key] = value
          }
        }
        configBuilder.headers = headersMap
      }
    }
    //handle adding collections config
    readableMapToCollectionConfig(map, configBuilder)
    return configBuilder
  }

  /**
   * Converts a `ReplicatorStatus` object to a `WritableMap` used to return value back
   * to React Native to Javascript on the Native Bridge.
   *
   * This function takes a `ReplicatorStatus` object and converts it into a `WritableMap` that can be
   * used in React Native. The resulting map includes the activity level, progress, and any error information.
   *
   * @param status The `ReplicatorStatus` object to be converted.
   * @return A `WritableMap` representation of the provided `ReplicatorStatus`.
   */
  fun replicatorStatusToMap(status: ReplicatorStatus): WritableMap {
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

  /**
   * Converts a `Scope` object to a `WritableMap`.
   *
   * This function takes a `Scope` object and the associated database name, and converts them into a `WritableMap`
   * that can be used in React Native. The resulting map includes the scope name and the database name.
   *
   * @param scope The `Scope` object to be converted.
   * @param databaseName The name of the database associated with the scope.
   * @return A `WritableMap` representation of the provided `Scope` and database name.
   */
  fun scopeToMap(
    scope: Scope,
    databaseName: String
  ): WritableMap {
    val scopeMap: WritableMap = Arguments.createMap()
    scopeMap.putString("name", scope.name)
    scopeMap.putString("databaseName", databaseName)
    return scopeMap
  }

  /**
   * Converts a string representation of a replicator type to a `ReplicatorType` enum.
   *
   * This function takes a string value and maps it to the corresponding `ReplicatorType` enum.
   * Supported string values are "PUSH", "PULL", and "PUSH_AND_PULL".
   *
   * @param strValue The string representation of the replicator type.
   * @return The corresponding `ReplicatorType` enum.
   * @throws IllegalArgumentException If the provided string value does not match any supported replicator type.
   */
  private fun stringToReplicatorType(strValue: String): ReplicatorType {
    return when (strValue) {
      "PUSH" -> ReplicatorType.PUSH
      "PULL" -> ReplicatorType.PULL
      "PUSH_AND_PULL" -> ReplicatorType.PUSH_AND_PULL
      else -> throw IllegalArgumentException("Invalid replicator type")
    }
  }

  /**
   * Converts the provided directory and encryption key into a JSON object representing the database configuration.
   *
   * This function creates a JSON object containing the directory and encryption key for the database configuration.
   * If either the directory or encryption key is `null`, they will be omitted from the resulting JSON object.
   *
   * @param directory The directory where the database files are stored. Can be `null`.
   * @param encryptionKey The encryption key used to secure the database. Can be `null`.
   * @return A `JSONObject` containing the database configuration.
   */
  fun toDatabaseConfigJson(
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

  /**
   * Converts a `ReadableMap` to a `Map<String, Any>`.
   *
   * This function is used when sending a document to be saved in the database from Javascript
   * React Native.  It iterates through the entries of the provided `ReadableMap` and converts
   * any `Blob` objects into a map of  the properties of a blob. A developer needing the blob content
   * would need to manually call the Collection `getBlobContent` method.
   *
   * @param readableMap The `ReadableMap` to be converted.
   * @return A `Map<String, Any>` representation of the provided `ReadableMap`.
   * @throws Exception If there is an error during the conversion, particularly if the blob data is invalid.
   */
  @Throws(Exception::class)
  fun toMap(readableMap: ReadableMap): Map<String, Any> {
    val map = readableMap.toHashMap()
    for ((key, value) in map) {
      if (value is HashMap<*, *>) {
        if (value.containsKey("_type") && value["_type"] == "blob") {
          val nestedMap = value["data"] as HashMap<*, *>
          val contentType = nestedMap["contentType"] as String
          //value["data"] 'should be' an array of integers - need to convert it because React Native serializes it into
          //an the ArrayList<Double>
          val rawList = nestedMap["data"] as? ArrayList<*>
          val doubleList = rawList?.filterIsInstance<Double>()?.takeIf { it.size == rawList.size } as? ArrayList<Double>
          val intData = doubleList?.map{ it.toInt()}?.toIntArray()
          if (intData == null) {
            throw Exception("Error: Invalid blob data")
          } else {
            val data = ByteArray(intData.size)
            for (i in intData.indices) {
              data[i] = intData[i].toByte()
            }
            val blob = Blob(contentType, data)
            map[key] = blob
          }
        }
      }
    }
    return map
  }
}
