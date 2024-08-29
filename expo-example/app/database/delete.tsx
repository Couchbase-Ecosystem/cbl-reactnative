import React, { useContext, useState } from 'react';
import { Database } from 'cbl-reactnative';
import deleteDatabase from '@/service/database/deleteDatabase';
import CBLDatabaseActionContainer from '@/components/CBLDatabaseActionContainer/CBLDatabaseActionContainer';
import DatabaseContext from '@/providers/DatabaseContext';

export default function DatabaseDeleteScreen() {
  const { setDatabases } = useContext(DatabaseContext)!;

  function reset() {}
  async function update(database: Database): Promise<string[]> {
    try {
      const results = await deleteDatabase(database, setDatabases);
      return [results];
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDatabaseActionContainer
      screenTitle={'Delete Database'}
      handleUpdatePressed={update}
      handleResetPressed={reset}
    />
  );
}
