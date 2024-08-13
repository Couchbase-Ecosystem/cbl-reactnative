import React from 'react';
import CBLDocumentIdCollectionActionContainer from '@/components/CBLDocumentIdCollectionActionContainer/CBLDocumentIdCollectionActionContainer';
import get from '@/service/document/get';
import { Collection } from 'cbl-reactnative';

export default function GetDocumentScreen() {
  function reset() {}

  async function update(
    collection: Collection,
    documentId: string
  ): Promise<string[]> {
    try {
      const doc = await get(collection, documentId);
      if (doc !== undefined && doc !== null) {
        const json = JSON.stringify(doc.toDictionary());
        const resultsMessage = `Document <${documentId}> found with JSON: ${json}`;
        return [resultsMessage];
      } else {
        return ['Error: Document could not be retrieved'];
      }
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDocumentIdCollectionActionContainer
      screenTitle="Get Document"
      handleUpdatePressed={update}
      handleResetPressed={reset}
    />
  );
}
