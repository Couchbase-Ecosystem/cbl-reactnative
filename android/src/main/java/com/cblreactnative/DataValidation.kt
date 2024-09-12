package com.cblreactnative

import com.facebook.react.bridge.Promise

object DataValidation {

  fun validateCollection(
    collectionName: String,
    scopeName: String,
    databaseName: String,
    promise: Promise): Boolean {
    return validateCollectionName(collectionName, promise)
      && validateScopeName(scopeName, promise)
      && validateDatabaseName(databaseName, promise)
  }

  private fun validateCollectionName(
    collectionName: String,
    promise: Promise): Boolean {
    val isValid = collectionName.isNotEmpty()
    if (!isValid) {
      promise.reject("COLLECTION_ERROR", "Collection name must be provided")
    }
    return isValid
  }

  fun validateDatabaseName(
    databaseName: String,
    promise: Promise
  ): Boolean {
    val isValid = databaseName.isNotEmpty()
    if (!isValid) {
      promise.reject("DATABASE_ERROR", "Database name must be provided")
    }
    return isValid
  }

  fun validateDocumentId(
    documentId: String,
    promise: Promise
  ): Boolean {
    val isValid = documentId.isNotEmpty()
    if (!isValid) {
      promise.reject("DOCUMENT_ERROR", "documentId must be provided")
    }
    return isValid
  }

  fun validatePath(
    path: String,
    promise: Promise): Boolean {
    val isValid = path.isNotEmpty()
    if (!isValid) {
      promise.reject("DATABASE_ERROR", "Database path must be provided")
    }
    return isValid
  }

  fun validateQuery(
    query: String,
    promise: Promise
  ): Boolean {
    val isValid = query.isNotEmpty()
    if (!isValid) {
      promise.reject("QUERY_ERROR", "Query must be provided")
    }
    return isValid
  }

  fun validateReplicatorId(
    replicatorId: String,
    promise: Promise
  ): Boolean {
    val isValid = replicatorId.isNotEmpty()
    if (!isValid) {
      promise.reject("REPLICATOR_ERROR", "replicatorId must be provided")
    }
    return isValid
  }

  fun validateScope(
    scopeName: String,
    databaseName: String,
    promise: Promise): Boolean {
    return validateScopeName(scopeName, promise)
      && validateDatabaseName(databaseName, promise)
  }

  private fun validateScopeName(
    scopeName: String,
    promise: Promise): Boolean {
    val isValid = scopeName.isNotEmpty()
    if (!isValid) {
      promise.reject("SCOPE_ERROR", "Scope name must be provided")
    }
    return isValid
  }
}
