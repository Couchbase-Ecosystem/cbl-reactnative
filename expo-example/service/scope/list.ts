import { Database, Scope } from 'cbl-reactnative';

export default async function listScopes(
  databases: Record<string, Database>,
  databaseName: string
): Promise<Scope[]> {
  if (databaseName in databases) {
    let database = databases[databaseName];
    const scopes = await database.scopes();
    return scopes;
  } else {
    throw new Error('Error: Database not in Context, open Database first');
  }
}
