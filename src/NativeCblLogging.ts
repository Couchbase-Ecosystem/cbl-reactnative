/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Event emitter infrastructure (emits: customLogMessage)
  addListener(eventType: string): void;
  removeListeners(count: number): void;

  // Legacy logging API
  database_SetLogLevel(domain: string, logLevel: number): Promise<void>;

  database_SetFileLoggingConfig(
    name: string,
    directory: string,
    logLevel: number,
    maxSize: number,
    maxRotateCount: number,
    shouldUsePlainText: boolean
  ): Promise<void>;

  // New LogSinks API
  logsinks_SetConsole(level: number, domains: string[]): Promise<void>;

  logsinks_SetFile(level: number, config: Object): Promise<void>;

  logsinks_SetCustom(
    level: number,
    domains: string[],
    token: string
  ): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CblLogging');
