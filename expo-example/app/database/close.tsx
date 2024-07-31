import React from 'react';
import { Database } from 'cbl-reactnative';
import close from '@/service/database/close';
import CBLDatabaseActionContainer from '@/components/CBLDatabaseActionContainer';

export default function DatabaseCloseScreen() {
  function reset() {}
  async function update(database: Database): Promise<string[]> {
    try {
      const results = await close(database);
      return [results];
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDatabaseActionContainer
      screenTitle={'Close Database'}
      handleUpdatePressed={update}
      handleResetPressed={reset}
    />
  );
}
