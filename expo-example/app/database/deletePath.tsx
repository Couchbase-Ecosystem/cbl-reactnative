import React, { useContext, useState } from 'react';
import deleteDatabaseByPath from '@/service/database/deleteDatabaseByPath';
import DatabaseContext from '@/providers/DatabaseContext';
import getFileDefaultPath from '@/service/file/getFileDefaultPath';
import CBLDatabaseNamePathActionContainer from '@/components/CBLDatabaseNamePathActionContainer/CBLDatabaseNamePathActionContainer';

export default function DatabaseDeletePathScreen() {
  const { databases, setDatabases } = useContext(DatabaseContext)!;

  function reset() {}

  async function update(
    databaseName: string,
    fileLocation: string
  ): Promise<string[]> {
    try {
      const results = await deleteDatabaseByPath(
        databases,
        setDatabases,
        databaseName,
        fileLocation
      );
      return [results];
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDatabaseNamePathActionContainer
      screenTitle={'Delete Database'}
      handleUpdatePressed={update}
      handleResetPressed={reset}
    />
  );
}
