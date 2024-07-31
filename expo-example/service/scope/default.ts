import { Database, Scope } from 'cbl-reactnative';

export default async function defaultScope(database: Database): Promise<Scope> {
  const scope = await database.defaultScope();
  return scope;
}
