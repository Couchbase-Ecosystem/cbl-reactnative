import React from 'react';
import { Collection } from 'cbl-reactnative';
import CBLCollectionActionContainer from '@/components/CBLCollectionActionContainer';

export default function CollectionGetScreen() {
  function reset() {}

  async function update(collection: Collection): Promise<string[]> {
    return [
      `Collection: <${collection.fullName()}> was retrieved from database <${collection.database.getName()}>`,
    ];
  }

  return (
    <CBLCollectionActionContainer
      handleUpdatePressed={update}
      handleResetPressed={reset}
      screenTitle="Get Collection"
    />
  );
}
