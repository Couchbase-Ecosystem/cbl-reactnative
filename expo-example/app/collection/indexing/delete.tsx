import React, { useState } from 'react';
import { Collection } from 'cbl-reactnative';
import CBLCollectionActionContainer from '@/components/CBLCollectionActionContainer/CBLCollectionActionContainer';
import HeaderView from '@/components/HeaderView/HeaderView';
import { StyledTextInput } from '@/components/StyledTextInput/StyledTextInput';
import deleteIndex from '@/service/indexes/delete';
import { useStyleScheme } from '@/components/Themed/Themed';
import { View } from 'react-native';

export default function IndexCreateScreen() {
  const styles = useStyleScheme();
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
      <View style={styles.component}>
        <StyledTextInput
          autoCapitalize="none"
          placeholder="IndexName"
          onChangeText={(newText) => setIndexName(newText)}
          defaultValue={indexName}
        />
      </View>
    </CBLCollectionActionContainer>
  );
}
