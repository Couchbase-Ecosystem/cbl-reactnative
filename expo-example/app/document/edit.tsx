import React, { useState } from 'react';
import { useStyleScheme } from '@/components/Themed';
import DocumentEditorActionForm from '@/components/DocumentEditorActionForm';
import save from '@/service/document/save';
import { Collection } from 'cbl-reactnative';
import CBLCollectionActionContainer from '@/components/CBLCollectionActionContainer';

export default function DocumentEditorScreen() {
  const [document, setDocument] = useState<string>('');
  const [documentId, setDocumentId] = useState<string>('');
  const styles = useStyleScheme();

  function reset() {
    setDocument('');
    setDocumentId('');
  }

  async function update(collection: Collection): Promise<string[]> {
    try {
      if (document === '') {
        return ['Error: Document in string JSON format is required'];
      }
      const doc = await save(collection, documentId, document);
      if (
        document !== undefined &&
        document !== null &&
        doc.getId() == documentId
      ) {
        return [
          `Document <${documentId}> saved in Collection <${collection.fullName()}> Database <${collection.database.getName()}>`,
        ];
      } else {
        return ['Error: Document could not be saved'];
      }
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLCollectionActionContainer
      screenTitle="Document Editor"
      handleUpdatePressed={update}
      handleResetPressed={reset}
    >
      <DocumentEditorActionForm
        documentId={documentId}
        setDocumentId={setDocumentId}
        document={document}
        setDocument={setDocument}
      />
    </CBLCollectionActionContainer>
  );
}
