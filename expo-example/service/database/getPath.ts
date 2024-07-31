import { Database } from 'cbl-reactnative';

export default async function getPath(database: Database): Promise<string> {
  const path = await database.getPath();
  return path;
}
