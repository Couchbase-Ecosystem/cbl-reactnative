import { Collection, Database } from 'cbl-reactnative';

export default async function defaultCollection(
  database: Database
): Promise<Collection> {
  const collection = await database.defaultCollection();
  return collection;
}
