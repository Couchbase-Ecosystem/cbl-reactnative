/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  scope_GetDefault(name: string): Promise<Object>;

  scope_GetScope(scopeName: string, name: string): Promise<Object>;

  scope_GetScopes(name: string): Promise<Object>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CblScope');
