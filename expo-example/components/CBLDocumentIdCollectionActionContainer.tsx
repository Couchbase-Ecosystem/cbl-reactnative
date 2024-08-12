import React, { useState } from 'react';
import { Collection } from 'cbl-reactnative';
import { CBLDocumentIdCollectionContainerProps } from '@/types/CBLDocumentIdCollectionActionContainerProps.type';
import CBLCollectionActionContainer from '@/components/CBLCollectionActionContainer';
import HeaderView from '@/components/HeaderView';
import { StyledTextInput } from '@/components/StyledTextInput';
import { useStyleScheme } from '@/components/Themed';
import { View } from 'react-native';

export default function CBLDocumentIdCollectionActionContainer({
  screenTitle,
  handleUpdatePressed,
  handleResetPressed,
  children,
}: CBLDocumentIdCollectionContainerProps) {
  const styles = useStyleScheme();
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
      <View style={styles.component}>
        <StyledTextInput
          style={styles.input}
          autoCapitalize="none"
          placeholder="Document Id"
          onChangeText={(documentIdText) => setDocumentId(documentIdText)}
          defaultValue={documentId}
        />
        {children && children}
      </View>
    </CBLCollectionActionContainer>
  );
}
