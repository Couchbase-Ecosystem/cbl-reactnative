import { Database } from 'cbl-reactnative';
import React from 'react';

export default async function deleteDatabase(
  database: Database,
  setDatabases: React.Dispatch<React.SetStateAction<Record<string, Database>>>
) {
  const databaseName = database.getName();
  await database.deleteDatabase();
  setDatabases((prevState) => {
    //after closing the database remove it from the provider/context
    const newState = { ...prevState };
    delete newState[databaseName];
    return newState;
  });
  return 'Database deleted successfully';
}
