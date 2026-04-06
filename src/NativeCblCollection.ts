/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Event emitter infrastructure (emits: collectionChange, collectionDocumentChange)
  addListener(eventType: string): void;
  removeListeners(count: number): void;

  collection_CreateCollection(
    collectionName: string,
    name: string,
    scopeName: string
  ): Promise<Object>;

  collection_DeleteCollection(
    collectionName: string,
    name: string,
    scopeName: string
  ): Promise<void>;

  collection_GetCollection(
    collectionName: string,
    name: string,
    scopeName: string
  ): Promise<Object>;

  collection_GetCollections(name: string, scopeName: string): Promise<Object>;

  collection_GetDefault(name: string): Promise<Object>;

  collection_GetCount(
    collectionName: string,
    name: string,
    scopeName: string
  ): Promise<Object>;

  collection_GetFullName(
    collectionName: string,
    name: string,
    scopeName: string
  ): Promise<Object>;

  collection_CreateIndex(
    indexName: string,
    index: Object,
    collectionName: string,
    scopeName: string,
    name: string
  ): Promise<void>;

  collection_DeleteIndex(
    indexName: string,
    collectionName: string,
    scopeName: string,
    name: string
  ): Promise<void>;

  collection_GetIndexes(
    collectionName: string,
    scopeName: string,
    name: string
  ): Promise<Object>;

  collection_AddChangeListener(
    changeListenerToken: string,
    collectionName: string,
    name: string,
    scopeName: string
  ): Promise<void>;

  collection_AddDocumentChangeListener(
    changeListenerToken: string,
    documentId: string,
    collectionName: string,
    name: string,
    scopeName: string
  ): Promise<void>;

  collection_RemoveChangeListener(changeListenerToken: string): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CblCollection');
