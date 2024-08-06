import React, { useState } from 'react';
import { Collection } from 'cbl-reactnative';
import CBLCollectionActionContainer from '@/components/CBLCollectionActionContainer';
import HeaderView from '@/components/HeaderView';
import { Divider, Switch } from '@gluestack-ui/themed';
import { StyledTextInput } from '@/components/StyledTextInput';
import createFts from '@/service/indexes/createFts';
import { View } from 'react-native';
import { Text } from '@/components/Themed';

export default function IndexFtsCreateScreen() {
  const [indexName, setIndexName] = useState<string>('');
  const [ignoreAccents, setIgnoreAccents] = useState<boolean>(false);
  const [indexProperties, setIndexProperties] = useState<string>('');

  function reset() {
    setIgnoreAccents(false);
    setIndexName('');
    setIndexProperties('');
  }

  async function update(collection: Collection): Promise<string[]> {
    try {
      await createFts(collection, indexName, indexProperties, ignoreAccents);
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
      screenTitle="Create FTS Index"
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
      <Divider style={{ marginTop: 10, marginBottom: 10 }} />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text style={{ paddingLeft: 6, fontSize: 16 }}>Ignore Accents</Text>
        <Switch
          style={{ paddingRight: 16 }}
          value={ignoreAccents}
          onValueChange={setIgnoreAccents}
        />
      </View>
    </CBLCollectionActionContainer>
  );
}
