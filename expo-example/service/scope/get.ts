import { Database, Scope } from 'cbl-reactnative';

export default async function get(
  databases: Record<string, Database>,
  databaseName: string,
  scopeName: string
): Promise<Scope> {
  if (databaseName in databases) {
    try {
      const database = databases[databaseName];
      const scope = await database.scope(scopeName);
      return scope;
    } catch (error) {
      throw error;
    }
  } else {
    throw new Error('Error: Database not in Context, open Database first');
  }
}
