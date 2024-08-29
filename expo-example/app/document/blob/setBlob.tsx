import React, { useState } from 'react';
import { useStyleScheme } from '@/components/Themed/Themed';
import { Collection, Blob } from 'cbl-reactnative';
import CBLDocumentIdCollectionActionContainer from '@/components/CBLDocumentIdCollectionActionContainer/CBLDocumentIdCollectionActionContainer';
import { StyledTextInput } from '@/components/StyledTextInput/StyledTextInput';
import { Divider } from '@gluestack-ui/themed';
import setBlob from '@/service/document/setBlob';
import { StyleSheet, View } from 'react-native';

export default function DocumentSetBlobScreen() {
  const styles = useStyleScheme();
  const [key, setKey] = useState<string>('');
  const [blobText, setBlobText] = useState<string>('');

  function reset() {
    setKey('');
  }

  async function update(
    collection: Collection,
    documentId: string
  ): Promise<string[]> {
    try {
      const mutDoc = await setBlob(collection, documentId, key, blobText);
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
      <View>
        <Divider style={localStyles.divider} />
        <StyledTextInput
          style={styles.input}
          autoCapitalize="none"
          placeholder="Blob Key"
          onChangeText={(keyText) => setKey(keyText)}
          defaultValue={key}
        />
        <Divider style={localStyles.divider} />
        <StyledTextInput
          autoCapitalize="none"
          style={[styles.textInput, localStyles.blobText]}
          placeholder="Blob Text"
          onChangeText={(newBlobText) => setBlobText(newBlobText)}
          defaultValue={blobText}
          multiline={true}
        />
      </View>
    </CBLDocumentIdCollectionActionContainer>
  );
}

const localStyles = StyleSheet.create({
  blobText: {
    height: undefined,
    minHeight: 120,
    marginTop: 2,
    marginBottom: 15,
  },
  divider: {
    marginTop: 5,
    marginBottom: 10,
  },
});
