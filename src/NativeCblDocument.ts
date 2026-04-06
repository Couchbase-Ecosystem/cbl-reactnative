/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  collection_GetDocument(
    docId: string,
    name: string,
    scopeName: string,
    collectionName: string
  ): Promise<Object>;

  collection_Save(
    document: string,
    blobs: string,
    docId: string,
    name: string,
    scopeName: string,
    collectionName: string,
    concurrencyControlValue: number
  ): Promise<Object>;

  collection_DeleteDocument(
    docId: string,
    name: string,
    scopeName: string,
    collectionName: string,
    concurrencyControl: number
  ): Promise<Object>;

  collection_PurgeDocument(
    docId: string,
    name: string,
    scopeName: string,
    collectionName: string
  ): Promise<void>;

  collection_GetDocumentExpiration(
    docId: string,
    name: string,
    scopeName: string,
    collectionName: string
  ): Promise<Object>;

  collection_SetDocumentExpiration(
    expiration: string,
    docId: string,
    name: string,
    scopeName: string,
    collectionName: string
  ): Promise<void>;

  collection_GetBlobContent(
    key: string,
    documentId: string,
    name: string,
    scopeName: string,
    collectionName: string
  ): Promise<Object>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CblDocument');
