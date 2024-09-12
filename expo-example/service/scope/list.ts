import { Database, Scope } from 'cbl-reactnative';

export default async function listScopes(database: Database): Promise<Scope[]> {
  return await database.scopes();
}
