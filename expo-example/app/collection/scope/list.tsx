import React from 'react';
import { Database } from 'cbl-reactnative';
import listScopes from '@/service/scope/list';
import CBLDatabaseActionContainer from '@/components/CBLDatabaseActionContainer';

export default function ScopeListScreen() {
  function reset() {}
  async function update(database: Database): Promise<string[]> {
    try {
      const results: string[] = [];
      const scopes = await listScopes(database);
      if (scopes.length > 0) {
        scopes.forEach((scope) => {
          results.push(`Found Scope: <${scope.name}>`);
        });
        return results;
      } else {
        return [
          'Error: No scopes found.  Scopes should have at least 1 scope defined.',
        ];
      }
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDatabaseActionContainer
      screenTitle={'List Scopes'}
      handleUpdatePressed={update}
      handleResetPressed={reset}
    />
  );
}
