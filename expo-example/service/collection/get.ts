import { Collection, Database } from 'cbl-reactnative';

export default async function getCollection(
  databases: Record<string, Database>,
  databaseName: string,
  scopeName: string,
  collectionName: string
): Promise<Collection> {
  if (databaseName in databases) {
    const database = databases[databaseName];
    const collection = await database.collection(collectionName, scopeName);
    return collection;
  } else {
    throw new Error('Error: Database not in Context, open Database first');
  }
}
