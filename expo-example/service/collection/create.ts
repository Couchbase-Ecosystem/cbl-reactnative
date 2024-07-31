import { Database, Collection } from 'cbl-reactnative';

export default async function create(
  database: Database,
  scopeName: string,
  collectionName: string
): Promise<Collection> {
  const collection = await database.createCollection(collectionName, scopeName);
  return collection;
}
