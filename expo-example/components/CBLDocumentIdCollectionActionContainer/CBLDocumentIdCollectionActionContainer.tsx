import React, { useState } from 'react';
import { View } from 'react-native';
import { Collection } from 'cbl-reactnative';
import { CBLDocumentIdCollectionContainerProps } from '@/components/CBLDocumentIdCollectionActionContainer/CBLDocumentIdCollectionActionContainerProps.type';
import CBLCollectionActionContainer from '@/components/CBLCollectionActionContainer/CBLCollectionActionContainer';
import HeaderView from '@/components/HeaderView/HeaderView';
import { StyledTextInput } from '@/components/StyledTextInput/StyledTextInput';
import { useStyleScheme } from '@/components/Themed/Themed';

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
