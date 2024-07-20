import { Database, DatabaseConfiguration } from 'cbl-reactnative';
import React from 'react';

export default async function copy(
  databases: Record<string, Database>,
  databaseName: string,
  newDatabaseName: string,
  fileLocation: string,
  encryptionKey: string
): Promise<String> {
  if (databaseName in databases) {
    const database = databases[databaseName];
    const config = new DatabaseConfiguration();
    //calculate the database configuration required to create and open a database
    if (fileLocation !== '' || encryptionKey !== '') {
      const config = new DatabaseConfiguration();
      if (fileLocation !== '') {
        config.directory = fileLocation;
      }
      if (encryptionKey !== '') {
        config.encryptionKey = encryptionKey;
      }
    }
    //get the current database path required for the copy to work
    const currentPath = await database.getPath();
    //close the database, so we don't write to it before copying
    await database.close();
    await database.copy(currentPath, newDatabaseName, config);
    //open the database again since the app assumes any defined database is open unless you manually close it using the close screen
    await database.open();
    return 'Database copied successfully';
  } else {
    return 'Error: Database not found';
  }
}
