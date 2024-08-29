import React from 'react';
import { DocumentIdActionFormProps } from '@/components/DocumentIdActionForm/documentIdActionFormProps.type';
import { StyledTextInput } from '@/components/StyledTextInput/StyledTextInput';
import HeaderRunActionView from '@/components/HeaderRunActionView/HeaderRunActionView';

export default function DocumentIdActionForm({
  documentId,
  setDocumentId,
  handleUpdatePressed,
  style,
}: DocumentIdActionFormProps) {
  return (
    <>
      <HeaderRunActionView
        name="Document Information"
        iconName="file-document-edit-outline"
        handleUpdatePressed={handleUpdatePressed}
        style={style}
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
