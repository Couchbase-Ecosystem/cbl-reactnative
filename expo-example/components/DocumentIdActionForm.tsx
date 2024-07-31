import HeaderRunActionView from '@/components/HeaderRunActionView';
import React from 'react';
import { DocumentIdActionFormProps } from '@/types/documentIdActionFormProps.type';
import { StyledTextInput } from '@/components/StyledTextInput';

export default function DocumentIdActionForm({
  documentId,
  setDocumentId,
  handleUpdatePressed,
}: DocumentIdActionFormProps) {
  return (
    <>
      <HeaderRunActionView
        name="Document Information"
        iconName="file-document-edit-outline"
        handleUpdatePressed={handleUpdatePressed}
      />
      <StyledTextInput
        autoCapitalize="none"
        placeholder="Document ID"
        onChangeText={(newText) => setDocumentId(newText)}
        defaultValue={documentId}
      />
    </>
  );
}
