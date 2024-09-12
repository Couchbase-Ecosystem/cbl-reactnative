import { Database } from 'cbl-reactnative';

export default async function getPath(database: Database): Promise<string> {
  return await database.getPath();
}
