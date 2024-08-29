import React from 'react';
import { Database } from 'cbl-reactnative';
import getPath from '@/service/database/getPath';
import CBLDatabaseActionContainer from '@/components/CBLDatabaseActionContainer/CBLDatabaseActionContainer';

export default function DatabasePathScreen() {
  function reset() {}
  async function update(database: Database): Promise<string[]> {
    try {
      const path = await getPath(database);
      return [`Path Found: ${path}`];
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDatabaseActionContainer
      screenTitle={'Get Database Path'}
      handleUpdatePressed={update}
      handleResetPressed={reset}
    />
  );
}
