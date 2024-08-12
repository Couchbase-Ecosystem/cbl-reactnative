import React, { useState } from 'react';
import { Collection } from 'cbl-reactnative';
import CBLCollectionActionContainer from '@/components/CBLCollectionActionContainer';
import HeaderView from '@/components/HeaderView';
import { Divider, Switch } from '@gluestack-ui/themed';
import { StyledTextInput } from '@/components/StyledTextInput';
import createFts from '@/service/indexes/createFts';
import { StyleSheet, View } from 'react-native';
import { Text, useStyleScheme } from '@/components/Themed';

export default function IndexFtsCreateScreen() {
  const styles = useStyleScheme();
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
        <Divider style={localStyles.divider} />
        <View style={[styles.viewStackRightComponent, localStyles.viewLast]}>
          <Text style={styles.text}>Ignore Accents</Text>
          <Switch
            style={styles.switch}
            value={ignoreAccents}
            onValueChange={setIgnoreAccents}
          />
        </View>
      </View>
    </CBLCollectionActionContainer>
  );
}

const localStyles = StyleSheet.create({
  divider: {
    marginTop: 10,
    marginBottom: 10,
  },
  viewLast: {
    marginBottom: 16,
  },
});
