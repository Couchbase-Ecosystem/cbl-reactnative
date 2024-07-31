import React from 'react';
import { Collection } from 'cbl-reactnative';
import deleteCollection from '@/service/collection/delete';
import CBLCollectionActionContainer from '@/components/CBLCollectionActionContainer';

export default function CollectionDeleteScreen() {
  function reset() {}

  async function update(collection: Collection) {
    try {
      await deleteCollection(collection);
      return [
        `Deleted Collection: <${collection.fullName()} in Database: <${collection.database.getName()}>`,
      ];
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLCollectionActionContainer
      handleUpdatePressed={update}
      handleResetPressed={reset}
      screenTitle="Delete Collection"
    />
  );
}
