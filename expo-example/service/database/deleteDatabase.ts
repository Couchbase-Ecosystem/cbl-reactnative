import { Database } from 'cbl-reactnative';

export default async function deleteDatabase(
  databases: Record<string, Database>,
  databaseName: string
) {
  if (databaseName in databases) {
    throw new Error('Error: Database already in Context');
  } else {
    let database = databases[databaseName];
    await database.deleteDatabase();
    return 'Database deleted successfully';
  }
}
