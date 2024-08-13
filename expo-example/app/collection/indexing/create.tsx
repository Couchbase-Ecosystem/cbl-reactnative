import React, { useState } from 'react';
import { Collection } from 'cbl-reactnative';
import CBLCollectionActionContainer from '@/components/CBLCollectionActionContainer';
import HeaderView from '@/components/HeaderView/HeaderView';
import { Divider } from '@gluestack-ui/themed';
import { StyledTextInput } from '@/components/StyledTextInput';
import create from '@/service/indexes/create';
import { useStyleScheme } from '@/components/Themed';
import { StyleSheet, View } from 'react-native';

export default function IndexCreateScreen() {
  const styles = useStyleScheme();
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
      <View style={styles.component}>
        <StyledTextInput
          autoCapitalize="none"
          placeholder="IndexName"
          onChangeText={(newText) => setIndexName(newText)}
          defaultValue={indexName}
        />
        <Divider style={localStyles.divider} />
        <StyledTextInput
          style={styles.indexProperties}
          autoCapitalize="none"
          placeholder="Index Properties (comma separated)"
          onChangeText={(newText) => setIndexProperties(newText)}
          defaultValue={indexProperties}
          multiline={true}
        />
      </View>
    </CBLCollectionActionContainer>
  );
}

const localStyles = StyleSheet.create({
  divider: {
    marginTop: 10,
    marginBottom: 10,
  },
});
