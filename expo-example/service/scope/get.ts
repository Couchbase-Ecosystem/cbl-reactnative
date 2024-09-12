import { Database, Scope } from 'cbl-reactnative';

export default async function get(
  database: Database,
  scopeName: string
): Promise<Scope> {
  return await database.scope(scopeName);
}
