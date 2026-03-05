/**
 * Turbo Module Spec: CouchbaseLite C Engine
 *
 * Codegen reads this file and auto-generates:
 *   - C++ JSI binding class: NativeCblCSpecJSI
 *   - ObjC protocol: NativeCblCSpec
 *
 * The ObjC++ bridge (RCTCblC.mm) implements NativeCblCSpec
 * and forwards every call to CblCAdapter.swift.
 *
 * IMPORTANT: Every method accepts a single `args` object whose shape
 * mirrors the corresponding interface from core-types.ts:
 *   DatabaseArgs           → { name }
 *   DatabaseOpenArgs        → { name, directory, encryptionKey }  (config flattened for Codegen)
 *   DatabaseExistsArgs      → { databaseName, directory }
 *   CollectionArgs          → { name, scopeName, collectionName }
 *   CollectionSaveStringArgs→ CollectionArgs + { id, document, blobs, concurrencyControl }
 *   CollectionGetDocumentArgs→ CollectionArgs + { docId }
 *   CollectionDeleteDocumentArgs→ CollectionArgs + { docId, concurrencyControl }
 *   CollectionPurgeDocumentArgs→ CollectionArgs + { docId }
 *   QueryExecuteArgs        → { name, query, parameters }
 *   ReplicatorArgs           → { replicatorId }
 */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // ── Database ──────────────────────────────────────────────────────────
  // Mirrors DatabaseOpenArgs: { name, config: { directory, encryptionKey } }
  // Config is flattened for Codegen compatibility (avoids nested struct generation).
  // Returns { databaseUniqueName } -- the "name" used in all subsequent calls.

  /** Opens (or creates) a database. Returns { databaseUniqueName }. */
  database_Open(args: {
    name: string;
    directory: string | null;
    encryptionKey: string | null;
  }): Promise<{ databaseUniqueName: string }>;

  /** Closes a database. Mirrors DatabaseArgs: { name }. */
  database_Close(args: { name: string }): Promise<void>;

  /** Deletes an open database by name. Mirrors DatabaseArgs: { name }. */
  database_Delete(args: { name: string }): Promise<void>;

  /**
   * Deletes a database file by path (static, db must be closed).
   * Mirrors DatabaseExistsArgs: { databaseName, directory }.
   */
  database_DeleteWithPath(args: {
    databaseName: string;
    directory: string;
  }): Promise<void>;

  /** Returns the filesystem path of an open database. Mirrors DatabaseArgs. */
  database_GetPath(args: { name: string }): Promise<{ path: string }>;

  /**
   * Checks if a database file exists at the given path.
   * Mirrors DatabaseExistsArgs: { databaseName, directory }.
   */
  database_Exists(args: {
    databaseName: string;
    directory: string;
  }): Promise<{ exists: boolean }>;

  // ── Collection ────────────────────────────────────────────────────────
  // Mirrors CollectionArgs: { name (=databaseUniqueName), scopeName, collectionName }

  /** Creates a collection (or returns existing). Mirrors CollectionArgs. */
  collection_CreateCollection(args: {
    name: string;
    scopeName: string;
    collectionName: string;
  }): Promise<{ name: string; scopeName: string; databaseName: string }>;

  /** Deletes a collection. Mirrors CollectionArgs. */
  collection_DeleteCollection(args: {
    name: string;
    scopeName: string;
    collectionName: string;
  }): Promise<void>;

  /** Total number of documents in a collection. Mirrors CollectionArgs. */
  collection_GetCount(args: {
    name: string;
    scopeName: string;
    collectionName: string;
  }): Promise<{ count: number }>;

  // ── Single Document CRUD ──────────────────────────────────────────────
  // Mirrors CollectionSaveStringArgs = CollectionArgs + { id, document, blobs, concurrencyControl }
  // Returns CollectionDocumentSaveResult: { _id, _revId, _sequence }

  /** Saves a document. Returns { _id, _revId, _sequence }. */
  collection_Save(args: {
    name: string;
    scopeName: string;
    collectionName: string;
    id: string;
    document: string;
    blobs: string;
    concurrencyControl: number;
  }): Promise<{ _id: string; _revId: string; _sequence: number }>;

  /** Gets a document by ID. Mirrors CollectionGetDocumentArgs. */
  collection_GetDocument(args: {
    name: string;
    scopeName: string;
    collectionName: string;
    docId: string;
  }): Promise<{
    _id: string;
    _data: Record<string, unknown>;
    _sequence: number;
    _revId: string;
  } | null>;

  /** Deletes a document. Mirrors CollectionDeleteDocumentArgs. */
  collection_DeleteDocument(args: {
    name: string;
    scopeName: string;
    collectionName: string;
    docId: string;
    concurrencyControl: number;
  }): Promise<void>;

  /** Purges a document. Mirrors CollectionPurgeDocumentArgs. */
  collection_PurgeDocument(args: {
    name: string;
    scopeName: string;
    collectionName: string;
    docId: string;
  }): Promise<void>;

  // ── Batch Operations (NEW -- native-level batching) ───────────────────
  // These are new methods not in ICoreEngine. They follow the same args-object
  // pattern with CollectionArgs fields + batch-specific data as JSON strings
  // to avoid per-doc bridge overhead.

  /**
   * Saves many documents in ONE native call using inBatch (Swift) or Transaction (C).
   * @param args.docsJson - JSON string: array of { id: string, data: string }
   * @returns { saved, failed, timeMs, errors }
   */
  collection_BatchSave(args: {
    name: string;
    scopeName: string;
    collectionName: string;
    docsJson: string;
  }): Promise<{
    saved: number;
    failed: number;
    timeMs: number;
    errors: string;
  }>;

  /**
   * Gets many documents in ONE native call.
   * @param args.docIdsJson - JSON string: array of document ID strings
   * @returns JSON string: array of { _id, _data, _revId, _sequence }
   */
  collection_BatchGet(args: {
    name: string;
    scopeName: string;
    collectionName: string;
    docIdsJson: string;
  }): Promise<string>;

  /**
   * Deletes many documents in ONE native call using inBatch / Transaction.
   * @param args.docIdsJson - JSON string: array of document ID strings
   * @returns { deleted, failed, timeMs }
   */
  collection_BatchDelete(args: {
    name: string;
    scopeName: string;
    collectionName: string;
    docIdsJson: string;
  }): Promise<{ deleted: number; failed: number; timeMs: number }>;

  // ── Query ─────────────────────────────────────────────────────────────
  // Mirrors QueryExecuteArgs: { name (=databaseUniqueName), query, parameters }
  // `parameters` maps to Dictionary from core-types; use Object for Codegen.

  /** Executes a SQL++ query. Returns JSON array string of result rows. */
  query_Execute(args: {
    name: string;
    query: string;
    parameters: Record<string, unknown> | null;
  }): Promise<string>;

  // ── Replicator ────────────────────────────────────────────────────────
  // replicator_Create takes a serialized config string (contains databaseName,
  // endpoint, collections, auth, etc.). Returns { replicatorId }.
  // All other replicator methods mirror ReplicatorArgs: { replicatorId }.

  /** Creates a replicator. Returns { replicatorId }. */
  replicator_Create(args: {
    config: string;
  }): Promise<{ replicatorId: string }>;

  /** Starts the replicator. Mirrors ReplicatorArgs. */
  replicator_Start(args: { replicatorId: string }): Promise<void>;

  /** Stops the replicator. Mirrors ReplicatorArgs. */
  replicator_Stop(args: { replicatorId: string }): Promise<void>;

  /** Returns current replicator status. Mirrors ReplicatorArgs. */
  replicator_GetStatus(args: { replicatorId: string }): Promise<{
    activity: number;
    progress: { completed: number; total: number };
    error: string | null;
  }>;

  /** Stops and removes the replicator. Mirrors ReplicatorArgs. */
  replicator_Cleanup(args: { replicatorId: string }): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('CblC');
