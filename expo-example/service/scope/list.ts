import { Database, Scope } from 'cbl-reactnative';

export default async function listScopes(database: Database): Promise<Scope[]> {
  const scopes = await database.scopes();
  return scopes;
}
