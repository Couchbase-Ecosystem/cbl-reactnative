import React, { useContext, useState } from 'react';
import { useStyleScheme } from '@/components/Themed';
import { Collection } from 'cbl-reactnative';
import CBLDocumentIdCollectionActionContainer from '@/components/CBLDocumentIdCollectionActionContainer';
import { StyledTextInput } from '@/components/StyledTextInput';
import { Divider } from '@gluestack-ui/themed';
import getBlob from '@/service/document/getBlob';
import { StyleSheet, View } from 'react-native';

export default function DocumentGetBlobScreen() {
  const styles = useStyleScheme();
  const [key, setKey] = useState<string>('');

  function reset() {
    setKey('');
  }

  async function update(
    collection: Collection,
    documentId: string
  ): Promise<string[]> {
    try {
      const result = await getBlob(collection, documentId, key);
      return [result];
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDocumentIdCollectionActionContainer
      screenTitle="Get Blob"
      handleUpdatePressed={update}
      handleResetPressed={reset}
    >
      <Divider style={localStyles.divider} />
      <StyledTextInput
        style={styles.input}
        autoCapitalize="none"
        placeholder="Blob Key"
        onChangeText={(keyText) => setKey(keyText)}
        defaultValue={key}
      />
    </CBLDocumentIdCollectionActionContainer>
  );
}
const localStyles = StyleSheet.create({
  divider: {
    marginTop: 5,
    marginBottom: 10,
  },
});
