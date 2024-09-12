import { Database, Collection } from 'cbl-reactnative';

export default async function create(
  database: Database,
  scopeName: string,
  collectionName: string
): Promise<Collection> {
  return await database.createCollection(collectionName, scopeName);
}
