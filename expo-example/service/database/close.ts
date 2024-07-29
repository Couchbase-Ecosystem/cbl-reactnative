import { Database } from 'cbl-reactnative';

export default async function close(
  databases: Record<string, Database>,
  databaseName: string
) {
  if (databaseName in databases) {
    const database = databases[databaseName];
    await database.close();
    return 'Database closed successfully';
  } else {
    throw new Error('Error: Database not in Context, open Database first');
  }
}
