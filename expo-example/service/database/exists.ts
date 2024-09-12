import { Database } from 'cbl-reactnative';

export default async function exists(databaseName: string, directory: string) {
  return await Database.exists(databaseName, directory);
}
