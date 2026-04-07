/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Event emitter infrastructure (emits: replicatorStatusChange, replicatorDocumentChange)
  addListener(eventType: string): void;
  removeListeners(count: number): void;

  replicator_Create(config: Object): Promise<Object>;

  replicator_Start(replicatorId: string): Promise<void>;

  replicator_Stop(replicatorId: string): Promise<void>;

  replicator_Cleanup(replicatorId: string): Promise<void>;

  replicator_GetStatus(replicatorId: string): Promise<Object>;

  replicator_ResetCheckpoint(replicatorId: string): Promise<void>;

  replicator_GetPendingDocumentIds(
    replicatorId: string,
    name: string,
    scopeName: string,
    collectionName: string
  ): Promise<Object>;

  replicator_IsDocumentPending(
    documentId: string,
    replicatorId: string,
    name: string,
    scopeName: string,
    collectionName: string
  ): Promise<Object>;

  replicator_AddChangeListener(
    changeListenerToken: string,
    replicatorId: string
  ): Promise<void>;

  replicator_AddDocumentChangeListener(
    changeListenerToken: string,
    replicatorId: string
  ): Promise<void>;

  replicator_RemoveChangeListener(
    changeListenerToken: string,
    replicatorId: string
  ): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CblReplicator');
