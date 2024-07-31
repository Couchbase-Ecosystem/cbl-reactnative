import { Database, Scope } from 'cbl-reactnative';

export default async function get(
  database: Database,
  scopeName: string
): Promise<Scope> {
  const scope = await database.scope(scopeName);
  return scope;
}
