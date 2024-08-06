import React, { useState } from 'react';
import { Collection } from 'cbl-reactnative';
import CBLCollectionActionContainer from '@/components/CBLCollectionActionContainer';
import HeaderView from '@/components/HeaderView';
import { Divider } from '@gluestack-ui/themed';
import { StyledTextInput } from '@/components/StyledTextInput';
import create from '@/service/indexes/create';

export default function IndexCreateScreen() {
  const [indexName, setIndexName] = useState<string>('');
  const [indexProperties, setIndexProperties] = useState<string>('');

  function reset() {
    setIndexName('');
    setIndexProperties('');
  }

  async function update(collection: Collection): Promise<string[]> {
    try {
      await create(collection, indexName, indexProperties);
      return [`Index ${indexName} was created successfully`];
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLCollectionActionContainer
      handleUpdatePressed={update}
      handleResetPressed={reset}
      screenTitle="Create Index"
    >
      <HeaderView name="Index" iconName="magnify" />
      <StyledTextInput
        autoCapitalize="none"
        placeholder="IndexName"
        onChangeText={(newText) => setIndexName(newText)}
        defaultValue={indexName}
      />
      <Divider style={{ marginLeft: 8, marginTop: 10, marginBottom: 10 }} />
      <StyledTextInput
        style={{
          height: 120,
          minHeight: 20,
          marginBottom: 10,
        }}
        autoCapitalize="none"
        placeholder="Index Properties (comma separated)"
        onChangeText={(newText) => setIndexProperties(newText)}
        defaultValue={indexProperties}
        multiline={true}
      />
    </CBLCollectionActionContainer>
  );
}
