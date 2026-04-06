/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Event emitter infrastructure (emits: queryChange)
  addListener(eventType: string): void;
  removeListeners(count: number): void;

  query_Execute(
    query: string,
    parameters: Object,
    name: string
  ): Promise<Object>;

  query_Explain(
    query: string,
    parameters: Object,
    name: string
  ): Promise<Object>;

  query_AddChangeListener(
    changeListenerToken: string,
    query: string,
    parameters: Object,
    name: string
  ): Promise<void>;

  query_RemoveChangeListener(changeListenerToken: string): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CblQuery');
