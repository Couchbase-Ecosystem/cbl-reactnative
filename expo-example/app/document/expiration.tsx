import React, { useState } from 'react';
import setExpirationDate from '@/service/document/setExpirationDate';
import { Collection } from 'cbl-reactnative';
import CBLDocumentIdCollectionActionContainer from '@/components/CBLDocumentIdCollectionActionContainer';
import { StyledTextInput } from '@/components/StyledTextInput';
import { Divider } from '@gluestack-ui/themed';

export default function GetDocumentExpirationScreen() {
  const [expiration, setExpiration] = useState<string>('');

  function reset() {
    setExpiration('');
  }

  async function update(
    collection: Collection,
    documentId: string
  ): Promise<string[]> {
    try {
      await setExpirationDate(collection, documentId, expiration);
      return [
        `Successfully set expiration to <${expiration}> for Document with ID: <${documentId}> in Collection <${collection.fullName()}> in Database <${collection.database.getName()}>`,
      ];
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDocumentIdCollectionActionContainer
      screenTitle="Set Document Expiration"
      handleUpdatePressed={update}
      handleResetPressed={reset}
    >
      <Divider style={{ marginTop: 5, marginBottom: 10, marginLeft: 8 }} />
      <StyledTextInput
        autoCapitalize="none"
        placeholder="Expiration in ISO8601 Format"
        onChangeText={(newText) => setExpiration(newText)}
        defaultValue={expiration}
      />
    </CBLDocumentIdCollectionActionContainer>
  );
}
