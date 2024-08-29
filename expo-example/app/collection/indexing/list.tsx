import React from 'react';
import { Collection } from 'cbl-reactnative';
import CBLCollectionActionContainer from '@/components/CBLCollectionActionContainer/CBLCollectionActionContainer';
import listIndexes from '@/service/indexes/list';

export default function IndexesListScreen() {
  function reset() {}

  async function update(collection: Collection): Promise<string[]> {
    try {
      const indexes = await listIndexes(collection);
      if (indexes.length > 0) {
        return indexes;
      } else {
        return ['No indexes found.'];
      }
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLCollectionActionContainer
      handleUpdatePressed={update}
      handleResetPressed={reset}
      screenTitle="List Indexes"
    />
  );
}
