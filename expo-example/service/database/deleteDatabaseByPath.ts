import { Database } from 'cbl-reactnative';
import React from 'react';

export default async function deleteDatabaseByPath(
  databases: Record<string, Database>,
  setDatabases: React.Dispatch<React.SetStateAction<Record<string, Database>>>,
  databaseName: string,
  fileLocation: string
) {
  await Database.deleteDatabase(databaseName, fileLocation);
  if (databaseName in databases) {
    const database = databases[databaseName];
    setDatabases((prevState) => {
      //after closing the database remove it from the provider
      const newState = { ...prevState };
      delete newState[databaseName];
      return newState;
    });
  }
  return 'Database deleted successfully';
}
