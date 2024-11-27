import {
  EmitterSubscription,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from 'react-native';
import {
  CollectionChangeListenerArgs,
  ICoreEngine,
  ListenerCallback,
  CollectionArgs,
  CollectionCreateIndexArgs,
  CollectionDeleteDocumentArgs,
  CollectionDeleteIndexArgs,
  CollectionDocumentExpirationArgs,
  CollectionDocumentGetBlobContentArgs,
  CollectionDocumentSaveResult,
  CollectionGetDocumentArgs,
  CollectionPurgeDocumentArgs,
  CollectionSaveStringArgs,
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
  DocumentResult,
  QueryChangeListenerArgs,
  QueryExecuteArgs,
  QueryRemoveChangeListenerArgs,
  ReplicationChangeListenerArgs,
  ReplicatorArgs,
  ReplicatorCollectionArgs,
  ReplicatorCreateArgs,
  ReplicatorDocumentPendingArgs,
  ScopeArgs,
  ScopesResult,
  DocumentGetBlobContentArgs,
} from './cblite-js/cblite/core-types';

import { EngineLocator } from './cblite-js/cblite/src/engine-locator';
import { Collection } from './cblite-js/cblite/src/collection';
import { Result } from './cblite-js/cblite/src/result';
import { ReplicatorStatus } from './cblite-js/cblite/src/replicator-status';
import { Scope } from './cblite-js/cblite/src/scope';

import uuid from 'react-native-uuid';

export class CblReactNativeEngine implements ICoreEngine {
  _defaultCollectionName = '_default';
  _defaultScopeName = '_default';
  debugConsole = false;

  //event name mapping for the native side of the module

  _eventReplicatorStatusChange = 'replicatorStatusChange';
  _eventReplicatorDocumentChange = 'replicatorDocumentChange';
  _eventCollectionChange = 'collectionChange';
  _eventCollectionDocumentChange = 'collectionDocumentChange';
  _eventQueryChange = 'queryChange';

  //used to listen to replicator change events for both status and document changes
  private _replicatorChangeListeners: Map<string, ListenerCallback> = new Map();
  private _emitterSubscriptions: Map<string, EmitterSubscription> = new Map();

  private _replicatorDocumentChangeListeners: Map<string, ListenerCallback> =
    new Map();
  private _isReplicatorDocumentChangeEventSetup: boolean = false;

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

  _eventEmitter = new NativeEventEmitter(this.CblReactNative);

  constructor() {
    EngineLocator.registerEngine(EngineLocator.key, this);
  }

  //private logging function
  private debugLog(message: string) {
    if (this.debugConsole) {
      console.log(message);
    }
  }

  //startListeningEvents - used to listen to events from the native side of the module.  Implements Native change listeners for Couchbase Lite
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  startListeningEvents = (event: string, callback: any) => {
    console.log(`::DEBUG:: Registering listener for event: ${event}`);
    return this._eventEmitter.addListener(
      event,
      (data) => {
        this.debugLog(
          `::DEBUG:: Received event: ${event} with data: ${JSON.stringify(data)}`
        );
        callback(data);
      },
      this
    );
  };

  collection_AddChangeListener(
    // eslint-disable-next-line
    args: CollectionChangeListenerArgs,
    // eslint-disable-next-line
    lcb: ListenerCallback
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  // eslint-disable-next-line
  collection_AddDocumentChangeListener(
    // eslint-disable-next-line
    args: DocumentChangeListenerArgs,
    // eslint-disable-next-line
    lcb: ListenerCallback
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  collection_CreateCollection(args: CollectionArgs): Promise<Collection> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.collection_CreateCollection(
        args.collectionName,
        args.name,
        args.scopeName
      ).then(
        (result: Collection) => {
          resolve(result);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  collection_CreateIndex(args: CollectionCreateIndexArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.collection_CreateIndex(
        args.indexName,
        args.index,
        args.collectionName,
        args.scopeName,
        args.name
      ).then(
        () => {
          resolve();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  collection_DeleteCollection(args: CollectionArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.collection_DeleteCollection(
        args.collectionName,
        args.name,
        args.scopeName
      ).then(
        () => {
          resolve();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  collection_DeleteDocument(args: CollectionDeleteDocumentArgs): Promise<void> {
    const concurrencyControl =
      args.concurrencyControl !== null
        ? (args.concurrencyControl as number)
        : -9999;
    this.debugLog(
      `::DEBUG:: collection_DeleteDocument: ${args.docId} ${args.name} ${args.scopeName} ${args.collectionName} ${concurrencyControl}`
    );
    return new Promise((resolve, reject) => {
      this.CblReactNative.collection_DeleteDocument(
        args.docId,
        args.name,
        args.scopeName,
        args.collectionName,
        concurrencyControl
      ).then(
        () => {
          this.debugLog(`::DEBUG:: collection_DeleteDocument completed`);
          resolve();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          this.debugLog(`::DEBUG:: collection_DeleteDocument Error: ${error}`);
          reject(error);
        }
      );
    });
  }

  collection_DeleteIndex(args: CollectionDeleteIndexArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.collection_DeleteIndex(
        args.indexName,
        args.collectionName,
        args.scopeName,
        args.name
      ).then(
        () => {
          resolve();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  collection_GetBlobContent(
    args: CollectionDocumentGetBlobContentArgs
  ): Promise<{ data: ArrayBuffer }> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.collection_GetBlobContent(
        args.key,
        args.documentId,
        args.name,
        args.scopeName,
        args.collectionName
      ).then(
        (resultsData: { data: Iterable<number> }) => {
          resolve({ data: new Uint8Array(resultsData.data).buffer });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  collection_GetCollection(args: CollectionArgs): Promise<Collection> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.collection_GetCollection(
        args.collectionName,
        args.name,
        args.scopeName
      ).then(
        (result: Collection) => {
          resolve(result);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  collection_GetCollections(args: ScopeArgs): Promise<CollectionsResult> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.collection_GetCollections(
        args.name,
        args.scopeName
      ).then(
        (result: CollectionsResult) => {
          resolve(result);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  collection_GetCount(args: CollectionArgs): Promise<{ count: number }> {
    this.debugLog(
      `::DEBUG:: collection_GetCount: ${args.collectionName} ${args.name} ${args.scopeName}`
    );
    return new Promise((resolve, reject) => {
      this.CblReactNative.collection_GetCount(
        args.collectionName,
        args.name,
        args.scopeName
      ).then(
        (result: { count: number }) => {
          this.debugLog(
            `::DEBUG:: collection_GetCount completed with result: ${JSON.stringify(result)}`
          );
          resolve(result);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          this.debugLog(`::DEBUG:: collection_GetCount Error: ${error}`);
          reject(error);
        }
      );
    });
  }

  collection_GetDefault(args: DatabaseArgs): Promise<Collection> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.collection_GetDefault(args.name).then(
        (result: Collection) => {
          resolve(result);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  collection_GetDocument(
    args: CollectionGetDocumentArgs
  ): Promise<DocumentResult> {
    this.debugLog(
      `::DEBUG:: collection_GetDocument: ${args.docId} ${args.name} ${args.scopeName} ${args.collectionName}`
    );

    return new Promise((resolve, reject) => {
      this.CblReactNative.collection_GetDocument(
        args.docId,
        args.name,
        args.scopeName,
        args.collectionName
      ).then(
        (dr: DocumentResult) => {
          this.debugLog(
            `::DEBUG:: collection_GetDocument completed with result: ${JSON.stringify(dr)}`
          );
          resolve(dr);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          this.debugLog(`::DEBUG:: collection_GetDocument Error: ${error}`);
          reject(error);
        }
      );
    });
  }

  collection_GetDocumentExpiration(
    args: CollectionGetDocumentArgs
  ): Promise<DocumentExpirationResult> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.collection_GetDocumentExpiration(
        args.docId,
        args.name,
        args.scopeName,
        args.collectionName
      ).then(
        (der: DocumentExpirationResult) => {
          resolve(der);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  collection_GetIndexes(args: CollectionArgs): Promise<{ indexes: string[] }> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.collection_GetIndexes(
        args.collectionName,
        args.scopeName,
        args.name
      ).then(
        (items: { indexes: string[] }) => {
          resolve(items);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  collection_PurgeDocument(args: CollectionPurgeDocumentArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.collection_PurgeDocument(
        args.docId,
        args.name,
        args.scopeName,
        args.collectionName
      ).then(
        () => {
          resolve();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  // eslint-disable-next-line
  collection_RemoveChangeListener(args: CollectionChangeListenerArgs): Promise<void> {
    return Promise.resolve(undefined);
  }

  // eslint-disable-next-line
  collection_RemoveDocumentChangeListener(args: CollectionChangeListenerArgs): Promise<void> {
    return Promise.resolve(undefined);
  }

  collection_Save(
    args: CollectionSaveStringArgs
  ): Promise<CollectionDocumentSaveResult> {
    //deal with react native passing nulls
    const concurrencyControl =
      args.concurrencyControl !== null
        ? (args.concurrencyControl as number)
        : -9999;
    this.debugLog(
      `::DEBUG:: collection_Save: ${args.document} ${args.blobs} ${args.id} ${args.name} ${args.scopeName} ${args.collectionName} ${concurrencyControl}`
    );

    return new Promise((resolve, reject) => {
      this.CblReactNative.collection_Save(
        args.document,
        args.blobs,
        args.id,
        args.name,
        args.scopeName,
        args.collectionName,
        concurrencyControl
      ).then(
        (resultsData: CollectionDocumentSaveResult) => {
          if (this.debugConsole) {
            console.log(
              `::DEBUG:: collection_Save completed with result: ${JSON.stringify(resultsData)}`
            );
          }
          resolve(resultsData);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          console.log(`::DEBUG:: collection_Save Error: ${error}`);
          reject(error);
        }
      );
    });
  }

  collection_SetDocumentExpiration(
    args: CollectionDocumentExpirationArgs
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.collection_SetDocumentExpiration(
        args.expiration.toISOString(),
        args.docId,
        args.name,
        args.scopeName,
        args.collectionName
      ).then(
        () => {
          resolve();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  database_ChangeEncryptionKey(args: DatabaseEncryptionKeyArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.database_ChangeEncryptionKey(
        args.newKey,
        args.name
      ).then(
        () => resolve(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  database_Close(args: DatabaseArgs): Promise<void> {
    this.debugLog(`::DEBUG:: database_Close: ${args.name}`);
    return new Promise((resolve, reject) => {
      this.CblReactNative.database_Close(args.name).then(
        () => {
          this.debugLog(`::DEBUG:: database_Close completed`);
          resolve();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          this.debugLog(`::DEBUG:: database_Close Error: ${error}`);
          reject(error);
        }
      );
    });
  }

  database_Copy(args: DatabaseCopyArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.database_Copy(
        args.path,
        args.newName,
        args.config.directory,
        args.config.encryptionKey
      ).then(
        () => resolve(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  /**
   * @deprecated This function will be removed in future versions. Use collection_CreateIndex instead.
   */
  database_CreateIndex(args: DatabaseCreateIndexArgs): Promise<void> {
    const colArgs: CollectionCreateIndexArgs = {
      name: args.name,
      collectionName: this._defaultCollectionName,
      scopeName: this._defaultScopeName,
      indexName: args.indexName,
      index: args.index,
    };
    return this.collection_CreateIndex(colArgs);
  }

  database_Delete(args: DatabaseArgs): Promise<void> {
    if (this.debugConsole) {
      console.log(`::DEBUG:: database_Delete: ${args.name}`);
    }
    return new Promise((resolve, reject) => {
      this.CblReactNative.database_Delete(args.name).then(
        () => {
          this.debugLog(`::DEBUG:: database_Delete completed`);
          resolve();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          console.log(`::DEBUG:: database_Delete Error: ${error}`);
          reject(error);
        }
      );
    });
  }

  database_DeleteWithPath(args: DatabaseExistsArgs): Promise<void> {
    this.debugLog(
      `::DEBUG:: database_DeleteWithPath: ${args.directory} ${args.databaseName}`
    );
    return new Promise((resolve, reject) => {
      this.CblReactNative.database_DeleteWithPath(
        args.directory,
        args.databaseName
      ).then(
        () => {
          this.debugLog(`::DEBUG:: database_DeleteWithPath completed`);
          resolve();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          this.debugLog(`::DEBUG:: database_DeleteWithPath Error: ${error}`);
          reject(error);
        }
      );
    });
  }

  /**
   * @deprecated This will be removed in future versions. Use collection_DeleteDocument instead.
   */
  database_DeleteDocument(args: DatabaseDeleteDocumentArgs): Promise<void> {
    const colArgs: CollectionDeleteDocumentArgs = {
      name: args.name,
      collectionName: this._defaultCollectionName,
      scopeName: this._defaultScopeName,
      docId: args.docId,
      concurrencyControl: args.concurrencyControl,
    };
    this.debugLog(
      `::DEBUG:: database_DeleteDocument: ${args.docId} ${args.name} ${this._defaultScopeName} ${this._defaultCollectionName} ${args.concurrencyControl}`
    );
    return this.collection_DeleteDocument(colArgs);
  }

  /**
   * @deprecated This function will be removed in future versions. Use collection_DeleteIndex instead.
   */
  database_DeleteIndex(args: DatabaseDeleteIndexArgs): Promise<void> {
    const colArgs: CollectionDeleteIndexArgs = {
      name: args.name,
      collectionName: this._defaultCollectionName,
      scopeName: this._defaultScopeName,
      indexName: args.indexName,
    };
    return this.collection_DeleteIndex(colArgs);
  }

  database_Exists(args: DatabaseExistsArgs): Promise<{ exists: boolean }> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.database_Exists(
        args.databaseName,
        args.directory
      ).then(
        (result: boolean) => resolve({ exists: result }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  /**
   * @deprecated This will be removed in future versions. Use collection_GetCount instead.
   */
  database_GetCount(args: DatabaseArgs): Promise<{ count: number }> {
    const colArgs: CollectionArgs = {
      name: args.name,
      collectionName: this._defaultCollectionName,
      scopeName: this._defaultScopeName,
    };
    return this.collection_GetCount(colArgs);
  }

  /**
   * @deprecated This will be removed in future versions. Use collection_GetDocument instead.
   */
  database_GetDocument(args: DatabaseGetDocumentArgs): Promise<DocumentResult> {
    const colArgs: CollectionGetDocumentArgs = {
      name: args.name,
      collectionName: this._defaultCollectionName,
      scopeName: this._defaultScopeName,
      docId: args.docId,
    };
    return this.collection_GetDocument(colArgs);
  }

  /**
   * @deprecated This function will be removed in future versions. Use collection_GetIndexes instead.
   */
  database_GetIndexes(args: DatabaseArgs): Promise<{ indexes: string[] }> {
    const colArgs: CollectionArgs = {
      name: args.name,
      collectionName: this._defaultCollectionName,
      scopeName: this._defaultScopeName,
    };
    return this.collection_GetIndexes(colArgs);
  }

  database_GetPath(args: DatabaseArgs): Promise<{ path: string }> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.database_GetPath(args.name).then(
        (result: string) => resolve({ path: result }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  database_Open(args: DatabaseOpenArgs): Promise<void> {
    this.debugLog(
      `::DEBUG:: database_Open: ${args.name} ${args.config.directory} ${args.config.encryptionKey}`
    );
    return new Promise((resolve, reject) => {
      this.CblReactNative.database_Open(
        args.name,
        args.config.directory,
        args.config.encryptionKey
      ).then(
        () => {
          this.debugLog(`::DEBUG:: database_Open completed`);
          resolve();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          this.debugLog(`::DEBUG:: database_Open Error: ${error}`);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  /**
   * @deprecated This will be removed in future versions. Use collection_PurgeDocument instead.
   */
  database_PurgeDocument(args: DatabasePurgeDocumentArgs): Promise<void> {
    const colArgs: CollectionPurgeDocumentArgs = {
      name: args.name,
      collectionName: this._defaultCollectionName,
      scopeName: this._defaultScopeName,
      docId: args.docId,
    };
    return this.collection_PurgeDocument(colArgs);
  }

  /**
   * @deprecated This function will be removed in future versions. Use collection_Save instead.
   */
  database_Save(args: DatabaseSaveArgs): Promise<{ _id: string }> {
    const colArgs: CollectionSaveStringArgs = {
      name: args.name,
      collectionName: this._defaultCollectionName,
      scopeName: this._defaultScopeName,
      id: args.id,
      document: JSON.stringify(args.document),
      blobs: JSON.stringify(args.blobs),
      concurrencyControl: args.concurrencyControl,
    };
    return this.collection_Save(colArgs);
  }

  database_SetFileLoggingConfig(
    args: DatabaseSetFileLoggingConfigArgs
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.database_SetFileLoggingConfig(
        args.name,
        args.config.directory,
        args.config.level,
        args.config.maxSize,
        args.config.maxRotateCount,
        args.config.usePlaintext
      ).then(
        () => resolve(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  database_SetLogLevel(args: DatabaseSetLogLevelArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.database_SetLogLevel(args.domain, args.logLevel).then(
        () => resolve(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  /**
   * @deprecated This will be removed in future versions. Use collection_GetBlobContent instead.
   */
  document_GetBlobContent(
    args: DocumentGetBlobContentArgs
  ): Promise<{ data: ArrayBuffer }> {
    const colArgs: CollectionDocumentGetBlobContentArgs = {
      name: args.name,
      collectionName: this._defaultCollectionName,
      scopeName: this._defaultScopeName,
      documentId: args.documentId,
      key: args.key,
    };
    return this.collection_GetBlobContent(colArgs);
  }

  file_GetDefaultPath(): Promise<{ path: string }> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.file_GetDefaultPath().then(
        (result: string) => {
          resolve({ path: result });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  // eslint-disable-next-line
  file_GetFileNamesInDirectory(args: { path: string; }): Promise<{ files: string[] }> {
    return Promise.resolve({ files: [] });
  }

  // eslint-disable-next-line
  query_AddChangeListener( args: QueryChangeListenerArgs, lcb: ListenerCallback): Promise<void> {
    return Promise.resolve(undefined);
  }

  query_Execute(args: QueryExecuteArgs): Promise<Result> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.query_Execute(
        args.query,
        args.parameters,
        args.name
      ).then(
        (result: Result) => {
          resolve(result);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  query_Explain(args: QueryExecuteArgs): Promise<{ data: string }> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.query_Explain(
        args.query,
        args.parameters,
        args.name
      ).then(
        (result: { data: string }) => {
          resolve(result);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  // eslint-disable-next-line
  query_RemoveChangeListener( args: QueryRemoveChangeListenerArgs): Promise<void> {
    return Promise.resolve(undefined);
  }

  replicator_AddChangeListener(
    args: ReplicationChangeListenerArgs,
    lcb: ListenerCallback
  ): Promise<void> {
    //need to track the listener callback for later use due to how React Native events work.  Events are global so we need to first find which callback to call, we could have multiple replicators registered
    //https://reactnative.dev/docs/native-modules-ios#sending-events-to-javascript
    if (
      this._replicatorChangeListeners.has(args.changeListenerToken) ||
      this._emitterSubscriptions.has(args.changeListenerToken)
    ) {
      throw new Error(
        'ERROR:  changeListenerToken already exists and is registered to listen to callbacks, cannot add a new one'
      );
    }
    //if the event listener is not setup, then set up the listener.
    //Event listener only needs to be setup once for any replicators in memory
    const subscription = this._eventEmitter.addListener(
      this._eventReplicatorStatusChange,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (results: any) => {
        this.debugLog(
          `::DEBUG:: Received event ${this._eventReplicatorStatusChange}`
        );
        const token = results.token as string;
        const data = results?.status;
        const error = results?.error;
        if (token === undefined || token === null || token.length === 0) {
          this.debugLog(
            '::ERROR:: No token to resolve back to proper callback for Replicator Status Change'
          );
          throw new Error(
            'ERROR:  No token to resolve back to proper callback'
          );
        }
        const callback = this._replicatorChangeListeners.get(token);
        if (callback !== undefined) {
          callback(data, error);
        } else {
          this.debugLog(
            `Error: Could not found callback method for token: ${token}.`
          );
          throw new Error(
            `Error: Could not found callback method for token: ${token}.`
          );
        }
      }
    );
    return new Promise((resolve, reject) => {
      this.CblReactNative.replicator_AddChangeListener(
        args.changeListenerToken,
        args.replicatorId
      ).then(
        () => {
          //add token to change listener map
          this._emitterSubscriptions.set(
            args.changeListenerToken,
            subscription
          );
          this._replicatorChangeListeners.set(args.changeListenerToken, lcb);
          this.debugLog(
            `::DEBUG:: replicator_AddChangeListener listener count: ${this._eventEmitter.listenerCount(this._eventReplicatorStatusChange)}`
          );
          resolve();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          this._replicatorChangeListeners.delete(args.changeListenerToken);
          subscription.remove();
          reject(error);
        }
      );
    });
  }

  // eslint-disable-next-line
  replicator_AddDocumentChangeListener(args: ReplicationChangeListenerArgs, lcb: ListenerCallback): Promise<void> {
    return Promise.resolve(undefined);
  }

  replicator_Cleanup(args: ReplicatorArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.replicator_Cleanup(args.replicatorId).then(
        () => {
          resolve();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  replicator_Create(args: ReplicatorCreateArgs): Promise<ReplicatorArgs> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.replicator_Create(args.config).then(
        (results: ReplicatorArgs) => {
          resolve(results);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  replicator_GetPendingDocumentIds(
    args: ReplicatorCollectionArgs
  ): Promise<{ pendingDocumentIds: string[] }> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.replicator_GetPendingDocumentIds(
        args.replicatorId,
        args.name,
        args.scopeName,
        args.collectionName
      ).then(
        (results: { pendingDocumentIds: string[] }) => {
          resolve(results);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  replicator_GetStatus(args: ReplicatorArgs): Promise<ReplicatorStatus> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.replicator_GetStatus(args.replicatorId).then(
        (results: ReplicatorStatus) => {
          resolve(results);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  replicator_IsDocumentPending(
    args: ReplicatorDocumentPendingArgs
  ): Promise<{ isPending: boolean }> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.replicator_IsDocumentPending(
        args.documentId,
        args.replicatorId,
        args.name,
        args.scopeName,
        args.collectionName
      ).then(
        (results: { isPending: boolean }) => {
          resolve(results);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  replicator_RemoveChangeListener(
    args: ReplicationChangeListenerArgs
  ): Promise<void> {
    //remove the event subscription or you will have a leak
    if (this._emitterSubscriptions.has(args.changeListenerToken)) {
      this._emitterSubscriptions.get(args.changeListenerToken)?.remove();
      this._emitterSubscriptions.delete(args.changeListenerToken);
    }
    return new Promise((resolve, reject) => {
      this.CblReactNative.replicator_RemoveChangeListener(
        args.changeListenerToken,
        args.replicatorId
      ).then(
        () => {
          //remove the listener callback from the map
          if (this._replicatorChangeListeners.has(args.changeListenerToken)) {
            this._replicatorChangeListeners.delete(args.changeListenerToken);
          }
          resolve();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  replicator_ResetCheckpoint(args: ReplicatorArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.replicator_ResetCheckpoint(args.replicatorId).then(
        () => {
          resolve();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  replicator_Start(args: ReplicatorArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.replicator_Start(args.replicatorId).then(
        () => {
          resolve();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  replicator_Stop(args: ReplicatorArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.replicator_Stop(args.replicatorId).then(
        () => {
          resolve();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  scope_GetDefault(args: DatabaseArgs): Promise<Scope> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.scope_GetDefault(args.name).then(
        (result: Scope) => {
          resolve(result);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  scope_GetScope(args: ScopeArgs): Promise<Scope> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.scope_GetScope(args.scopeName, args.name).then(
        (result: Scope) => {
          resolve(result);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  scope_GetScopes(args: DatabaseArgs): Promise<ScopesResult> {
    return new Promise((resolve, reject) => {
      this.CblReactNative.scope_GetScopes(args.name).then(
        (result: ScopesResult) => {
          resolve(result);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  getUUID(): string {
    return uuid.v4().toString();
  }
}
