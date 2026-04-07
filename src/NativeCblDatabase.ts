/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  database_Open(
    name: string,
    directory: string | null,
    encryptionKey: string | null
  ): Promise<Object>;

  database_Close(name: string): Promise<void>;

  database_Delete(name: string): Promise<void>;

  database_DeleteWithPath(path: string, name: string): Promise<void>;

  database_Copy(
    path: string,
    newName: string,
    directory: string | null,
    encryptionKey: string | null
  ): Promise<void>;

  database_Exists(name: string, directory: string): Promise<boolean>;

  database_GetPath(name: string): Promise<string>;

  database_PerformMaintenance(
    maintenanceType: number,
    databaseName: string
  ): Promise<void>;

  database_ChangeEncryptionKey(newKey: string, name: string): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CblDatabase');
