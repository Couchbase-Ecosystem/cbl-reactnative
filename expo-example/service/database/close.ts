import { Database } from 'cbl-reactnative';

export default async function close(database: Database) {
  await database.close();
  return 'Database closed successfully';
}
