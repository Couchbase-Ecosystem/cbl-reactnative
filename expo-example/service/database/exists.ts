import { Database } from 'cbl-reactnative';

export default async function exists(databaseName: string, directory: string) {
  const doesExist = await Database.exists(databaseName, directory);
  return doesExist;
}
