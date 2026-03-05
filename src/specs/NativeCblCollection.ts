/**
 * Turbo Module Spec for Couchbase Lite Collection Operations
 *
 * This spec defines the interface for collection operations:
 * - Saving documents to collections
 * - Reading documents from collections
 * - Getting/creating collections
 *
 * Codegen will generate native interfaces from this spec.
 */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * Saves a document to a collection
   *
   * @param document - JSON string of the document data
   * @param blobs - JSON string of blob metadata
   * @param id - Document ID
   * @param databaseName - Database name
   * @param scopeName - Scope name
   * @param collectionName - Collection name
   * @param concurrencyControl - Concurrency control value (-9999 for none)
   * @returns Promise with save result containing _id, _revId, _sequence
   */
  collection_Save(
    document: string,
    blobs: string,
    id: string,
    databaseName: string,
    scopeName: string,
    collectionName: string,
    concurrencyControl: number
  ): Promise<{ _id: string; _revId: string; _sequence: number }>;

  /**
   * Gets a document from a collection
   *
   * @param docId - Document ID to retrieve
   * @param databaseName - Database name
   * @param scopeName - Scope name
   * @param collectionName - Collection name
   * @returns Promise with document data (_id, _data as JSON string, _revisionID, _sequence)
   */
  collection_GetDocument(
    docId: string,
    databaseName: string,
    scopeName: string,
    collectionName: string
  ): Promise<{
    _id: string;
    _data: string;
    _revisionID: string;
    _sequence: number;
  }>;

  /**
   * Gets an existing collection or returns null if it doesn't exist
   *
   * @param collectionName - Collection name
   * @param databaseName - Database name
   * @param scopeName - Scope name
   * @returns Promise with collection metadata (name, scopeName, databaseName) or null
   */
  collection_GetCollection(
    collectionName: string,
    databaseName: string,
    scopeName: string
  ): Promise<{ name: string; scopeName: string; databaseName: string } | null>;

  /**
   * Creates a new collection (or returns existing one)
   *
   * @param collectionName - Collection name to create
   * @param databaseName - Database name
   * @param scopeName - Scope name
   * @returns Promise with collection metadata (name, scopeName, databaseName)
   */
  collection_CreateCollection(
    collectionName: string,
    databaseName: string,
    scopeName: string
  ): Promise<{ name: string; scopeName: string; databaseName: string }>;

  /**
   * Echo test method for measuring pure bridge overhead
   * Just returns the input data without any processing
   *
   * @param data - JSON string to echo back
   * @returns Promise with the same data echoed back
   */
  collection_Echo(data: string): Promise<{ data: string }>;

  /**
   * TRUE SYNCHRONOUS echo - returns directly without Promise!
   * This is the fastest possible bridge call in Turbo Modules.
   *
   * Uses JSI to execute synchronously on the JS thread.
   * No async dispatch, no thread hop, no Promise overhead.
   *
   * @param data - String to echo back
   * @returns The same string, synchronously
   */
  collection_EchoSync(data: string): string;

  /**
   * Turbo-optimized performance check (NO async queue dispatch)
   * Executes synchronously on JSI thread for minimal overhead
   *
   * @param iterations - Number of iterations to run
   * @returns Promise with execution time in milliseconds
   */
  collection_PerformanceCheckTurbo(
    iterations: number
  ): Promise<{ timeMs: number }>;

  /**
   * TRUE SYNCHRONOUS performance check - returns directly without Promise!
   *
   * This demonstrates the REAL power of Turbo Modules:
   * - Executes entirely on the JS thread via JSI
   * - No thread switching overhead
   * - No async dispatch overhead
   * - Returns result synchronously
   *
   * @param iterations - Number of iterations to run
   * @returns Object with timeMs, iterations, checksum - synchronously!
   */
  collection_PerformanceCheckTurboSync(iterations: number): {
    timeMs: number;
    iterations: number;
    checksum: number;
  };

  /**
   * Batch echo for measuring overhead across many calls
   * Processes multiple items in a single native call
   *
   * @param count - Number to return
   * @returns The count, synchronously
   */
  collection_BatchEchoSync(count: number): number;

  /**
   * Gets the document count in a collection
   *
   * @param collectionName - Collection name
   * @param databaseName - Database name
   * @param scopeName - Scope name
   * @returns Promise with document count
   */
  collection_GetCount(
    collectionName: string,
    databaseName: string,
    scopeName: string
  ): Promise<{ count: number }>;

  /**
   * Gets all index names in a collection
   *
   * @param collectionName - Collection name
   * @param scopeName - Scope name
   * @param databaseName - Database name
   * @returns Promise with array of index names
   */
  collection_GetIndexes(
    collectionName: string,
    scopeName: string,
    databaseName: string
  ): Promise<{ indexes: string[] }>;

  /**
   * Gets all collections in a scope
   *
   * @param databaseName - Database name
   * @param scopeName - Scope name
   * @returns Promise with collections data as JSON string
   */
  collection_GetCollections(
    databaseName: string,
    scopeName: string
  ): Promise<{ collections: string }>;

  // ==========================================================================
  // C LIBRARY BENCHMARK METHODS (Raw libcblite - Synchronous)
  // ==========================================================================
  // These methods use the raw Couchbase Lite C library (libcblite) directly,
  // bypassing the Swift/Kotlin SDK layer. Used for performance comparison.

  /**
   * Opens a database using the C library directly
   * Returns a handle (int64) to use with other C library methods
   *
   * @param name - Database name
   * @param directory - Directory path for the database
   * @returns Handle as number (0 if failed)
   */
  clib_OpenDatabase(name: string, directory: string): number;

  /**
   * Closes a database using the C library directly
   *
   * @param handle - Database handle from clib_OpenDatabase
   * @returns true if successful
   */
  clib_CloseDatabase(handle: number): boolean;

  /**
   * Deletes a database using the C library directly
   *
   * @param name - Database name
   * @param directory - Directory path
   * @returns true if successful
   */
  clib_DeleteDatabase(name: string, directory: string): boolean;

  /**
   * Gets the default collection from a database
   *
   * @param dbHandle - Database handle
   * @returns Collection handle (0 if failed)
   */
  clib_GetDefaultCollection(dbHandle: number): number;

  /**
   * Creates a collection in a database
   *
   * @param dbHandle - Database handle
   * @param name - Collection name
   * @param scopeName - Scope name
   * @returns Collection handle (0 if failed)
   */
  clib_CreateCollection(
    dbHandle: number,
    name: string,
    scopeName: string
  ): number;

  /**
   * Gets document count in a collection
   *
   * @param collectionHandle - Collection handle
   * @returns Document count
   */
  clib_GetDocumentCount(collectionHandle: number): number;

  /**
   * Saves a document to a collection using the C library
   *
   * @param collectionHandle - Collection handle
   * @param docId - Document ID
   * @param jsonData - Document data as JSON string
   * @returns true if successful
   */
  clib_SaveDocument(
    collectionHandle: number,
    docId: string,
    jsonData: string
  ): boolean;

  /**
   * Gets a document from a collection using the C library
   *
   * @param collectionHandle - Collection handle
   * @param docId - Document ID
   * @returns Document JSON string (or null if not found)
   */
  clib_GetDocument(collectionHandle: number, docId: string): string | null;

  /**
   * Begins a transaction on a database
   *
   * @param dbHandle - Database handle
   * @returns true if successful
   */
  clib_BeginTransaction(dbHandle: number): boolean;

  /**
   * Ends a transaction on a database
   *
   * @param dbHandle - Database handle
   * @param commit - true to commit, false to rollback
   * @returns true if successful
   */
  clib_EndTransaction(dbHandle: number, commit: boolean): boolean;

  /**
   * Echo for pure overhead measurement (C library)
   *
   * @param data - String to echo
   * @returns Same string back
   */
  clib_Echo(data: string): string;

  // ==========================================================================
  // SYNC vs ASYNC COMPARISON TEST METHODS
  // ==========================================================================

  /**
   * Synchronous save using Swift SDK (no backgroundQueue.async)
   * Returns result directly without Promise - executes on JS thread!
   *
   * WARNING: This blocks the JS thread during execution.
   * Only use for performance testing.
   *
   * @param document - JSON string of the document data
   * @param blobs - JSON string of blob metadata
   * @param id - Document ID
   * @param databaseName - Database name
   * @param scopeName - Scope name
   * @param collectionName - Collection name
   * @param concurrencyControl - Concurrency control value (-9999 for none)
   * @returns Save result with _id, _revId, _sequence (or error)
   */
  collection_SaveSync(
    document: string,
    blobs: string,
    id: string,
    databaseName: string,
    scopeName: string,
    collectionName: string,
    concurrencyControl: number
  ): { _id: string; _revId: string; _sequence: number } | { error: string };

  /**
   * Async version of clib_OpenDatabase (with backgroundQueue + Promise)
   * Used for fair sync vs async comparison testing.
   *
   * @param name - Database name
   * @param directory - Directory path
   * @returns Promise with database handle
   */
  clib_OpenDatabaseAsync(name: string, directory: string): Promise<number>;

  /**
   * Async version of clib_GetDefaultCollection (with backgroundQueue + Promise)
   * Used for fair sync vs async comparison testing.
   *
   * @param dbHandle - Database handle
   * @returns Promise with collection handle
   */
  clib_GetDefaultCollectionAsync(dbHandle: number): Promise<number>;

  /**
   * Async version of clib_SaveDocument (with backgroundQueue + Promise)
   * Used for fair sync vs async comparison testing.
   *
   * @param collectionHandle - Collection handle
   * @param docId - Document ID
   * @param jsonData - Document JSON data
   * @returns Promise with success boolean
   */
  clib_SaveDocumentAsync(
    collectionHandle: number,
    docId: string,
    jsonData: string
  ): Promise<boolean>;

  /**
   * Async version of clib_CloseDatabase (with backgroundQueue + Promise)
   * Used for fair sync vs async comparison testing.
   *
   * @param handle - Database handle
   * @returns Promise with success boolean
   */
  clib_CloseDatabaseAsync(handle: number): Promise<boolean>;

  /**
   * Async version of clib_DeleteDatabase (with backgroundQueue + Promise)
   * Used for fair sync vs async comparison testing.
   *
   * @param name - Database name
   * @param directory - Directory path
   * @returns Promise with success boolean
   */
  clib_DeleteDatabaseAsync(name: string, directory: string): Promise<boolean>;

  // ==========================================================================
  // MINIMAL SWIFT METHODS (Collection Handle Approach - Fair C Comparison)
  // ==========================================================================
  // These methods mirror the C library approach: cache collection once, use handle

  /**
   * Gets a collection and caches it, returning a handle for subsequent operations.
   * This mirrors clib_GetDefaultCollection - cache once, use handle for all saves.
   *
   * @param databaseName - Database name (from database_Open result)
   * @param scopeName - Scope name
   * @param collectionName - Collection name
   * @returns Handle (number) to use with swift_SaveDocumentMinimal methods (0 if failed)
   */
  swift_GetCollectionHandle(
    databaseName: string,
    scopeName: string,
    collectionName: string
  ): number;

  /**
   * Saves a document using cached collection handle - MINIMAL SYNC version.
   *
   * This is the minimal Swift equivalent of clib_SaveDocument:
   * - Uses cached collection (no lookup)
   * - Creates MutableDocument directly from JSON
   * - Saves without concurrency control
   * - Returns just Bool (no result object)
   *
   * @param collectionHandle - Handle from swift_GetCollectionHandle
   * @param docId - Document ID
   * @param jsonData - Document JSON string
   * @returns Boolean indicating success
   */
  swift_SaveDocumentMinimalSync(
    collectionHandle: number,
    docId: string,
    jsonData: string
  ): boolean;

  /**
   * Saves a document using cached collection handle - MINIMAL ASYNC version.
   * Same as sync but wrapped in backgroundQueue for fair async comparison.
   *
   * @param collectionHandle - Handle from swift_GetCollectionHandle
   * @param docId - Document ID
   * @param jsonData - Document JSON string
   * @returns Promise with boolean indicating success
   */
  swift_SaveDocumentMinimalAsync(
    collectionHandle: number,
    docId: string,
    jsonData: string
  ): Promise<boolean>;

  /**
   * Releases a cached collection handle.
   * Call this when done with bulk operations to free memory.
   *
   * @param handle - Collection handle to release
   * @returns Boolean indicating if handle was found and released
   */
  swift_ReleaseCollectionHandle(handle: number): boolean;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'CouchbaseLiteCollection'
);
