import { Database, Collection } from 'cbl-reactnative';

export default async function listCollections(
  databases: Record<string, Database>,
  databaseName: string,
  scopeName: string
): Promise<Collection[]> {
  if (databaseName in databases) {
    let database = databases[databaseName];
    const scope = await database.scope(scopeName);
    if (scope === null || scope === undefined || scope.name !== scopeName) {
      throw new Error(`Error: No Scope found for name ${scopeName}.`);
    } else {
      const collections = await database.collections(scope);
      return collections;
    }
  } else {
    throw new Error('Error: Database not in Context, open Database first');
  }
}
