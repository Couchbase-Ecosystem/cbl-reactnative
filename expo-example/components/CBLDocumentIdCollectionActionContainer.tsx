import React, { useState } from 'react';
import { Collection } from 'cbl-reactnative';
import { CBLDocumentIdCollectionContainerProps } from '@/types/CBLDocumentIdCollectionActionContainerProps.type';
import CBLCollectionActionContainer from '@/components/CBLCollectionActionContainer';
import HeaderView from '@/components/HeaderView';
import { StyledTextInput } from '@/components/StyledTextInput';

export default function CBLDocumentIdCollectionActionContainer({
  screenTitle,
  handleUpdatePressed,
  handleResetPressed,
  children,
}: CBLDocumentIdCollectionContainerProps) {
  const [documentId, setDocumentId] = useState<string>('');

  async function update(collection: Collection) {
    return await handleUpdatePressed(collection, documentId);
  }

  function reset() {
    setDocumentId('');
    handleResetPressed();
  }
  return (
    <CBLCollectionActionContainer
      screenTitle={screenTitle}
      handleUpdatePressed={update}
      handleResetPressed={reset}
    >
      <HeaderView name="Document Information" iconName="file-document" />
      <StyledTextInput
        style={{ marginBottom: 5 }}
        autoCapitalize="none"
        placeholder="Document Id"
        onChangeText={(documentIdText) => setDocumentId(documentIdText)}
        defaultValue={documentId}
      />
      {children && children}
    </CBLCollectionActionContainer>
  );
}
