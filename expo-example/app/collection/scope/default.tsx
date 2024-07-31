import React from 'react';
import defaultScope from '@/service/scope/default';
import { Database } from 'cbl-reactnative';
import CBLDatabaseActionContainer from '@/components/CBLDatabaseActionContainer';

export default function ScopeDefaultScreen() {
  function reset() {}

  async function update(database: Database): Promise<string[]> {
    try {
      const scope = await defaultScope(database);
      return [
        `Found Scope: <${scope.name}> in Database: <${scope.database.getName()}>`,
      ];
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDatabaseActionContainer
      screenTitle={'Get Default Scope'}
      handleUpdatePressed={update}
      handleResetPressed={reset}
    />
  );
}
