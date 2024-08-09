import React, { useState } from 'react';
import defaultCollection from '@/service/collection/default';
import { Database } from 'cbl-reactnative';
import CBLDatabaseActionContainer from '@/components/CBLDatabaseActionContainer';

export default function ReplicationConfigListingScreen() {
  function reset() {}

  async function update(database: Database) {
    try {
      const collection = await defaultCollection(database);
      return [
        `Found Collection: <${collection.fullName()}> in Database: <${collection.database.getName()}>`,
      ];
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDatabaseActionContainer
      screenTitle={'Replication Configs'}
      handleUpdatePressed={update}
      handleResetPressed={reset}
    />
  );
}
