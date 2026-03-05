/**
 * Turbo Module Spec for Couchbase Lite Database Operations
 *
 * This spec defines the interface for core database operations:
 * - Opening databases with encryption
 * - Closing databases
 * - Getting database paths
 *
 * Codegen will generate native interfaces from this spec.
 */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * Opens a database with optional directory and encryption key
   *
   * @param name - Database name
   * @param directory - Optional directory path (null for default)
   * @param encryptionKey - Optional encryption key (null for no encryption)
   * @returns Promise with database unique name
   */
  database_Open(
    name: string,
    directory: string | null,
    encryptionKey: string | null
  ): Promise<{ databaseUniqueName: string }>;

  /**
   * Closes an open database
   *
   * @param name - Database name to close
   */
  database_Close(name: string): Promise<void>;

  /**
   * Gets the file path of a database
   *
   * @param name - Database name
   * @returns Promise with database file path
   */
  database_GetPath(name: string): Promise<string>;

  /**
   * Checks if a database exists at the given path
   *
   * @param databaseName - Database name
   * @param directory - Directory path
   * @returns Promise with boolean indicating existence
   */
  database_Exists(databaseName: string, directory: string): Promise<boolean>;

  /**
   * Gets all scopes in a database
   *
   * @param databaseName - Database name
   * @returns Promise with scopes data as JSON string
   */
  scope_GetScopes(databaseName: string): Promise<{ scopes: string }>;

  /**
   * Deletes a database
   *
   * @param name - Database name to delete
   * @param directory - Directory path where the database is located
   */
  database_Delete(name: string, directory: string): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CouchbaseLiteDatabase');
