import { Collection, Database } from 'cbl-reactnative';

export default async function defaultCollection(
  database: Database
): Promise<Collection> {
  return await database.defaultCollection();
}
