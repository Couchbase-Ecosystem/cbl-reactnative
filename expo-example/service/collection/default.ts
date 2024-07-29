import { Collection, Database } from 'cbl-reactnative';

export default async function defaultCollection(
  databases: Record<string, Database>,
  databaseName: string
): Promise<Collection> {
  if (databaseName in databases) {
    const database = databases[databaseName];
    const collection = await database.defaultCollection();
    return collection;
  } else {
    throw new Error('Error: Database not in Context, open Database first');
  }
}
