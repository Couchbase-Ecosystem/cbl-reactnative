import React from 'react';
import CBLDocumentIdCollectionActionContainer from '@/components/CBLDocumentIdCollectionActionContainer/CBLDocumentIdCollectionActionContainer';
import deleteDocument from '@/service/document/deleteDocument';
import { Collection } from 'cbl-reactnative';

export default function DeleteDocumentScreen() {
  function reset() {}

  async function update(
    collection: Collection,
    documentId: string
  ): Promise<string[]> {
    try {
      await deleteDocument(collection, documentId);
      return [
        `Document <${documentId}> deleted successfully from Collection <${collection.fullName()}> - Database <${collection.database.getName()}>`,
      ];
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDocumentIdCollectionActionContainer
      screenTitle="Delete Document"
      handleUpdatePressed={update}
      handleResetPressed={reset}
    />
  );
}
