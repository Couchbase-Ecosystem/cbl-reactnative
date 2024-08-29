import React from 'react';
import doesExist from '@/service/database/exists';
import CBLDatabaseNamePathActionContainer from '@/components/CBLDatabaseNamePathActionContainer/CBLDatabaseNamePathActionContainer';
export default function DatabaseExistsScreen() {
  function reset() {}

  async function update(
    databaseName: string,
    fileLocation: string
  ): Promise<string[]> {
    try {
      const results = await doesExist(databaseName, fileLocation);
      return [`Does Exists: <${results}>`];
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDatabaseNamePathActionContainer
      screenTitle={'Does Database Exist'}
      handleUpdatePressed={update}
      handleResetPressed={reset}
    />
  );
}
