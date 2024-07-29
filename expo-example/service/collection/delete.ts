import { Collection, Database } from 'cbl-reactnative';

export default async function deleteCollection(
  databases: Record<string, Database>,
  databaseName: string,
  scopeName: string,
  collectionName: string
): Promise<void> {
  if (databaseName in databases) {
    const database = databases[databaseName];
    await database.deleteCollection(collectionName, scopeName);
  } else {
    throw new Error('Error: Database not in Context, open Database first');
  }
}
