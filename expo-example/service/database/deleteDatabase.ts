import { Database } from 'cbl-reactnative';
import React from 'react';

export default async function deleteDatabase(
  databases: Record<string, Database>,
  setDatabases: React.Dispatch<React.SetStateAction<Record<string, Database>>>,
  databaseName: string
) {
  if (databaseName in databases) {
    const database = databases[databaseName];
    await database.deleteDatabase();
    setDatabases((prevState) => {
      //after closing the database remove it from the provider
      const newState = { ...prevState };
      delete newState[databaseName];
      return newState;
    });
    return 'Database deleted successfully';
  } else {
    throw new Error('Error: Database not in Context, open Database first.');
  }
}
