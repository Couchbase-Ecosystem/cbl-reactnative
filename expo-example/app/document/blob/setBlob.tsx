import React, { useState } from 'react';
import { useStyleScheme } from '@/components/Themed';
import { Collection, Blob } from 'cbl-reactnative';
import CBLDocumentIdCollectionActionContainer from '@/components/CBLDocumentIdCollectionActionContainer';
import { StyledTextInput } from '@/components/StyledTextInput';
import { Divider } from '@gluestack-ui/themed';
import setBlob from '@/service/document/setBlob';

export default function DocumentSetBlobScreen() {
  //database stuff
  const [key, setKey] = useState<string>('');
  const [blobText, setBlobText] = useState<string>('');
  //results
  const styles = useStyleScheme();

  function reset() {
    setKey('');
  }

  async function update(
    collection: Collection,
    documentId: string
  ): Promise<string[]> {
    try {
      const encoder = new TextEncoder();
      const blob = new Blob('text/plain', encoder.encode(blobText));
      const mutDoc = await setBlob(collection, documentId, key, blob);
      if (
        mutDoc !== undefined &&
        mutDoc !== null &&
        mutDoc.getId() === documentId
      ) {
        return [
          `Blob with key <${key}> set on Document <${documentId}> in Collection <${collection.fullName()}> Database <${collection.database.getName()}>`,
        ];
      } else {
        return ['Error: Blob could not be set'];
      }
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDocumentIdCollectionActionContainer
      screenTitle="Set Blob"
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
      <Divider style={{ marginTop: 5, marginBottom: 10, marginLeft: 8 }} />
      <StyledTextInput
        autoCapitalize="none"
        style={[
          styles.textInput,
          { height: undefined, minHeight: 120, marginTop: 5, marginBottom: 15 },
        ]}
        placeholder="Blob Text"
        onChangeText={(newBlobText) => setBlobText(newBlobText)}
        defaultValue={blobText}
        multiline={true}
      />
    </CBLDocumentIdCollectionActionContainer>
  );
}
