import { Database, Scope } from 'cbl-reactnative';

export default async function defaultScope(database: Database): Promise<Scope> {
  return await database.defaultScope();
}
