import { Database, Scope } from 'cbl-reactnative';

export default async function defaultScope(
  databases: Record<string, Database>,
  databaseName: string
): Promise<Scope> {
  if (databaseName in databases) {
    let database = databases[databaseName];
    const scope = await database.defaultScope();
    return scope;
  } else {
    throw new Error('Error: Database not in Context, open Database first');
  }
}
