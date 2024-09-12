import { Database, Collection } from 'cbl-reactnative';

export default async function listCollections(
  database: Database,
  scopeName: string
): Promise<Collection[]> {
  const scope = await database.scope(scopeName);
  if (scope === null || scope === undefined || scope.name !== scopeName) {
    throw new Error(`Error: No Scope found for name ${scopeName}.`);
  } else {
    return await database.collections(scope);
  }
}
