import { Database } from 'cbl-reactnative';

export default async function getPath(
  databases: Record<string, Database>,
  databaseName: string
) {
  if (databaseName in databases) {
    const database = databases[databaseName];
    const path = await database.getPath();
    return path;
  } else {
    throw new Error('Error: Database not in Context, open Database first');
  }
}
