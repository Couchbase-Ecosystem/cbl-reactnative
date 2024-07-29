import { Database, DatabaseConfiguration } from 'cbl-reactnative';
import React from 'react';

export default async function open(
  databases: Record<string, Database>,
  setDatabases: React.Dispatch<React.SetStateAction<Record<string, Database>>>,
  databaseName: string,
  fileLocation: string,
  encryptionKey: string
) {
  if (databaseName in databases) {
    const database = databases[databaseName];
    await database.open();
    return 'Database opened successfully';
  } else {
    let database: Database;
    //calculate the database configuration required to create and open a database
    if (fileLocation !== '' || encryptionKey !== '') {
      const config = new DatabaseConfiguration();
      if (fileLocation !== '') {
        config.directory = fileLocation;
      }
      if (encryptionKey !== '') {
        config.encryptionKey = encryptionKey;
      }
      database = new Database(databaseName, config);
    } else {
      database = new Database(databaseName);
    }
    await database.open();
    setDatabases((prevState) => ({
      ...prevState,
      [databaseName]: database,
    }));
    return 'Database opened successfully';
  }
}
