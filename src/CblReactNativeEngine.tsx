import { NativeModules, Platform } from 'react-native';
import {
  CollectionArgs,
  CollectionChangeListenerArgs,
  CollectionCreateIndexArgs,
  CollectionDeleteDocumentArgs,
  CollectionDeleteIndexArgs,
  CollectionDocumentExpirationArgs,
  CollectionDocumentGetBlobContentArgs,
  CollectionDocumentSaveResult,
  CollectionGetDocumentArgs,
  CollectionPurgeDocumentArgs,
  CollectionSaveArgs,
  CollectionsResult,
  DatabaseArgs,
  DatabaseCopyArgs,
  DatabaseCreateIndexArgs,
  DatabaseDeleteDocumentArgs,
  DatabaseDeleteIndexArgs,
  DatabaseEncryptionKeyArgs,
  DatabaseExistsArgs,
  DatabaseGetDocumentArgs,
  DatabaseOpenArgs,
  DatabasePerformMaintenanceArgs,
  DatabasePurgeDocumentArgs,
  DatabaseSaveArgs,
  DatabaseSetFileLoggingConfigArgs,
  DatabaseSetLogLevelArgs,
  DocumentChangeListenerArgs,
  DocumentExpirationResult,
  DocumentGetBlobContentArgs,
  DocumentResult,
  ICoreEngine,
  ListenerCallback,
  ListenerHandle,
  QueryChangeListenerArgs,
  QueryExecuteArgs,
  QueryRemoveChangeListenerArgs,
  ReplicationChangeListenerArgs,
  ReplicatorArgs,
  ReplicatorCollectionArgs,
  ReplicatorDocumentPendingArgs,
  ScopeArgs,
  ScopesResult,
} from './cblite-js/cblite/core-types';

import { Collection } from './cblite-js/cblite/src/collection';
import { EngineLocator } from './cblite-js/cblite/src/engine-locator';
import { ReplicatorStatus } from './cblite-js/cblite/src/replicator-status';
import { Result } from './cblite-js/cblite/src/result';
import { Scope } from './cblite-js/cblite/src/scope';

export class CblReactNativeEngine implements ICoreEngine {
  private static readonly LINKING_ERROR =
    `The package 'cbl-reactnative' doesn't seem to be linked. Make sure: \n\n` +
    Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
    '- You rebuilt the app after installing the package\n' +
    '- You are not using Expo Go\n';

  CblReactNative = NativeModules.CblReactnative
    ? NativeModules.CblReactnative
    : new Proxy(
        {},
        {
          get() {
            throw new Error(CblReactNativeEngine.LINKING_ERROR);
          },
        }
      );

  constructor() {
    EngineLocator.registerEngine(EngineLocator.key, this);
  }

  multiply(a: number, b: number): Promise<number> {
    return this.CblReactNative.multiply(a, b);
  }

  collection_AddChangeListener(
    args: CollectionChangeListenerArgs,
    lcb: ListenerCallback
  ): Promise<ListenerHandle> {
    return Promise.resolve(undefined);
  }

  collection_AddDocumentChangeListener(
    args: DocumentChangeListenerArgs,
    lcb: ListenerCallback
  ): Promise<ListenerHandle> {
    return Promise.resolve(undefined);
  }

  collection_CreateCollection(args: CollectionArgs): Promise<Collection> {
    return Promise.resolve(undefined);
  }

  collection_CreateIndex(args: CollectionCreateIndexArgs): Promise<void> {
    return Promise.resolve(undefined);
  }

  collection_DeleteCollection(args: CollectionArgs): Promise<void> {
    return Promise.resolve(undefined);
  }

  collection_DeleteDocument(args: CollectionDeleteDocumentArgs): Promise<void> {
    return Promise.resolve(undefined);
  }

  collection_DeleteIndex(args: CollectionDeleteIndexArgs): Promise<void> {
    return Promise.resolve(undefined);
  }

  collection_GetBlobContent(
    args: CollectionDocumentGetBlobContentArgs
  ): Promise<{ data: ArrayBuffer }> {
    return Promise.resolve({ data: undefined });
  }

  collection_GetCollection(args: CollectionArgs): Promise<Collection> {
    return Promise.resolve(undefined);
  }

  collection_GetCollections(args: ScopeArgs): Promise<CollectionsResult> {
    return Promise.resolve(undefined);
  }

  collection_GetCount(args: CollectionArgs): Promise<{ count: number }> {
    return Promise.resolve({ count: 0 });
  }

  collection_GetDefault(args: DatabaseArgs): Promise<Collection> {
    return Promise.resolve(undefined);
  }

  collection_GetDocument(
    args: CollectionGetDocumentArgs
  ): Promise<DocumentResult> {
    return Promise.resolve(undefined);
  }

  collection_GetDocumentExpiration(
    args: CollectionGetDocumentArgs
  ): Promise<DocumentExpirationResult> {
    return Promise.resolve(undefined);
  }

  collection_GetIndexes(args: CollectionArgs): Promise<{ indexes: string[] }> {
    return Promise.resolve({ indexes: [] });
  }

  collection_PurgeDocument(args: CollectionPurgeDocumentArgs): Promise<void> {
    return Promise.resolve(undefined);
  }

  collection_RemoveChangeListener(
    args: CollectionChangeListenerArgs
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  collection_RemoveDocumentChangeListener(
    args: CollectionChangeListenerArgs
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  collection_Save(
    args: CollectionSaveArgs
  ): Promise<CollectionDocumentSaveResult> {
    return Promise.resolve(undefined);
  }

  collection_SetDocumentExpiration(
    args: CollectionDocumentExpirationArgs
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  database_ChangeEncryptionKey(args: DatabaseEncryptionKeyArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.database_ChangeEncryptionKey(
        args.name,
        args.newKey
      ).then(
        () => resolve(),
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  database_Close(args: DatabaseArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.database_Close(args.name).then(
        () => resolve(),
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  database_Copy(args: DatabaseCopyArgs): Promise<void> {
    return Promise.resolve(undefined);
  }

  database_CreateIndex(args: DatabaseCreateIndexArgs): Promise<void> {
    return Promise.resolve(undefined);
  }

  database_Delete(args: DatabaseArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.database_Delete(args.name).then(
        () => resolve(),
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  database_DeleteDocument(args: DatabaseDeleteDocumentArgs): Promise<void> {
    return Promise.resolve(undefined);
  }

  database_DeleteIndex(args: DatabaseDeleteIndexArgs): Promise<void> {
    return Promise.resolve(undefined);
  }

  database_Exists(args: DatabaseExistsArgs): Promise<{ exists: boolean }> {
    return Promise.resolve({ exists: false });
  }

  database_GetCount(args: DatabaseArgs): Promise<{ count: number }> {
    return Promise.resolve({ count: 0 });
  }

  database_GetDocument(args: DatabaseGetDocumentArgs): Promise<DocumentResult> {
    return Promise.resolve(undefined);
  }

  database_GetIndexes(args: DatabaseArgs): Promise<{ indexes: string[] }> {
    return Promise.resolve({ indexes: [] });
  }

  database_GetPath(args: DatabaseArgs): Promise<{ path: string }> {
    return Promise.resolve({ path: '' });
  }

  database_Open(args: DatabaseOpenArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.database_Open(
        args.name,
        args.config.directory,
        args.config.encryptionKey
      ).then(
        () => resolve(),
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  database_PerformMaintenance(
    args: DatabasePerformMaintenanceArgs
  ): Promise<void> {
    const numValue = args.maintenanceType.valueOf();
    return new Promise((resolve, reject) => {
      this.CblReactNative.database_PerformMaintenance(numValue, args.name).then(
        () => resolve(),
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  database_PurgeDocument(args: DatabasePurgeDocumentArgs): Promise<void> {
    return Promise.resolve(undefined);
  }

  database_Save(args: DatabaseSaveArgs): Promise<{ _id: string }> {
    return Promise.resolve({ _id: '' });
  }

  database_SetFileLoggingConfig(
    args: DatabaseSetFileLoggingConfigArgs
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  database_SetLogLevel(args: DatabaseSetLogLevelArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.database_SetLogLevel(args.domain, args.logLevel).then(
        () => resolve(),
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  logging_SetLogLevel(args: DatabaseSetLogLevelArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.database_SetLogLevel(args.domain, args.logLevel).then(
        () => resolve(),
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  document_GetBlobContent(
    args: DocumentGetBlobContentArgs
  ): Promise<{ data: ArrayBuffer }> {
    return Promise.resolve({ data: undefined });
  }

  file_GetDefaultPath(): Promise<{ path: string }> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.file_GetDefaultPath().then(
        (result: string) => {
          resolve({ path: result });
        },
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  file_GetFileNamesInDirectory(args: {
    path: string;
  }): Promise<{ files: string[] }> {
    return Promise.resolve({ files: [] });
  }

  query_AddChangeListener(
    args: QueryChangeListenerArgs,
    lcb: ListenerCallback
  ): Promise<ListenerHandle> {
    return Promise.resolve(undefined);
  }

  query_Execute(args: QueryExecuteArgs): Promise<Result> {
    return Promise.resolve(undefined);
  }

  query_Explain(args: QueryExecuteArgs): Promise<Result> {
    return Promise.resolve(undefined);
  }

  query_RemoveChangeListener(
    args: QueryRemoveChangeListenerArgs
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  replicator_AddChangeListener(
    args: ReplicationChangeListenerArgs,
    lcb: ListenerCallback
  ): Promise<ListenerHandle> {
    return Promise.resolve(undefined);
  }

  replicator_AddDocumentChangeListener(
    args: ReplicationChangeListenerArgs,
    lcb: ListenerCallback
  ): Promise<ListenerHandle> {
    return Promise.resolve(undefined);
  }

  replicator_Cleanup(args: ReplicatorArgs): Promise<void> {
    return Promise.resolve(undefined);
  }

  replicator_Create(args: any): Promise<ReplicatorArgs> {
    return Promise.resolve(undefined);
  }

  replicator_GetPendingDocumentIds(
    args: ReplicatorCollectionArgs
  ): Promise<{ pendingDocumentIds: string[] }> {
    return Promise.resolve({ pendingDocumentIds: [] });
  }

  replicator_GetStatus(args: ReplicatorArgs): Promise<ReplicatorStatus> {
    return Promise.resolve(undefined);
  }

  replicator_IsDocumentPending(
    args: ReplicatorDocumentPendingArgs
  ): Promise<{ isPending: boolean }> {
    return Promise.resolve({ isPending: false });
  }

  replicator_RemoveChangeListener(
    args: ReplicationChangeListenerArgs
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  replicator_ResetCheckpoint(args: ReplicatorArgs): Promise<void> {
    return Promise.resolve(undefined);
  }

  replicator_Start(args: ReplicatorArgs): Promise<void> {
    return Promise.resolve(undefined);
  }

  replicator_Stop(args: ReplicatorArgs): Promise<void> {
    return Promise.resolve(undefined);
  }

  scope_GetDefault(args: DatabaseArgs): Promise<Scope> {
    return Promise.resolve(undefined);
  }

  scope_GetScope(args: ScopeArgs): Promise<Scope> {
    return Promise.resolve(undefined);
  }

  scope_GetScopes(args: DatabaseArgs): Promise<ScopesResult> {
    return Promise.resolve(undefined);
  }
}
