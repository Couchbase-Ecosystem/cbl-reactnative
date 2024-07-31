import React, { useContext, useState } from 'react';
import { useStyleScheme } from '@/components/Themed';
import { Collection } from 'cbl-reactnative';
import CBLDocumentIdCollectionActionContainer from '@/components/CBLDocumentIdCollectionActionContainer';
import { StyledTextInput } from '@/components/StyledTextInput';
import { Divider } from '@gluestack-ui/themed';
import getBlob from '@/service/document/getBlob';

export default function DocumentGetBlobScreen() {
  const [key, setKey] = useState<string>('');
  const styles = useStyleScheme();

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
      <Divider style={{ marginTop: 5, marginBottom: 10, marginLeft: 8 }} />
      <StyledTextInput
        style={{ marginBottom: 5 }}
        autoCapitalize="none"
        placeholder="Blob Key"
        onChangeText={(keyText) => setKey(keyText)}
        defaultValue={key}
      />
    </CBLDocumentIdCollectionActionContainer>
  );
}
