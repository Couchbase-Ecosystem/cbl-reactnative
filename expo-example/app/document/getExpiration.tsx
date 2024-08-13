import React from 'react';
import CBLDocumentIdCollectionActionContainer from '@/components/CBLDocumentIdCollectionActionContainer/CBLDocumentIdCollectionActionContainer';
import getExpirationDate from '@/service/document/getExpirationDate';
import { Collection } from 'cbl-reactnative';

export default function GetDocumentExpirationScreen() {
  function reset() {}

  async function update(
    collection: Collection,
    documentId: string
  ): Promise<string[]> {
    try {
      const date = await getExpirationDate(collection, documentId);
      if (date !== null || date !== undefined) {
        return [`Document <${documentId}> expiration date is set to <${date}>`];
      } else {
        return [`Document <${documentId}> has no expiration date`];
      }
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDocumentIdCollectionActionContainer
      screenTitle="Get Document Expiration"
      handleUpdatePressed={update}
      handleResetPressed={reset}
    />
  );
}
