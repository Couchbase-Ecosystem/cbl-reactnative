import { Database } from 'cbl-reactnative';

export default async function changeEncryptionKey(
  databases: Record<string, Database>,
  databaseName: string,
  encryptionKey: string
) {
  if (databaseName in databases) {
    const database = databases[databaseName];
    await database.changeEncryptionKey(encryptionKey);
    return 'Database encryption key changed';
  } else {
    throw new Error('Error: Database not in Context, open Database first');
  }
}
