import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  file_GetDefaultPath(): Promise<string>;

  listenerToken_Remove(changeListenerToken: string): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CblEngine');
