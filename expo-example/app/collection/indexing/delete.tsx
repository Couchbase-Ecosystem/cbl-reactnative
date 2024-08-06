import React, { useState } from 'react';
import { Collection } from 'cbl-reactnative';
import CBLCollectionActionContainer from '@/components/CBLCollectionActionContainer';
import HeaderView from '@/components/HeaderView';
import { Divider } from '@gluestack-ui/themed';
import { StyledTextInput } from '@/components/StyledTextInput';
import deleteIndex from '@/service/indexes/delete';

export default function IndexCreateScreen() {
  const [indexName, setIndexName] = useState<string>('');

  function reset() {
    setIndexName('');
  }

  async function update(collection: Collection): Promise<string[]> {
    try {
      await deleteIndex(collection, indexName);
      return [`Index ${indexName} was deleted successfully`];
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLCollectionActionContainer
      handleUpdatePressed={update}
      handleResetPressed={reset}
      screenTitle="Delete Index"
    >
      <HeaderView name="Index" iconName="magnify" />
      <StyledTextInput
        autoCapitalize="none"
        placeholder="IndexName"
        onChangeText={(newText) => setIndexName(newText)}
        defaultValue={indexName}
      />
    </CBLCollectionActionContainer>
  );
}
