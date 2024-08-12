import React, { useState } from 'react';
import { StyledTextInput } from '@/components/StyledTextInput';
import create from '@/service/collection/create';
import { Database } from 'cbl-reactnative';
import CBLDatabaseActionContainer from '@/components/CBLDatabaseActionContainer';
import { Divider } from '@gluestack-ui/themed';
import HeaderView from '@/components/HeaderView';
import { StyleSheet, View } from 'react-native';
import { useStyleScheme } from '@/components/Themed';

export default function CollectionCreateScreen() {
  const styles = useStyleScheme();

  const [scopeName, setScopeName] = useState<string>('');
  const [collectionName, setCollectionName] = useState<string>('');

  function reset() {
    setScopeName('');
    setCollectionName('');
  }

  async function update(database: Database): Promise<string[]> {
    try {
      const collection = await create(database, scopeName, collectionName);
      return [
        `Created collection: <${collection.scope.name}.${collection.name}> in database: <${database.getName()}>`,
      ];
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDatabaseActionContainer
      screenTitle={'Create Collection'}
      handleUpdatePressed={update}
      handleResetPressed={reset}
    >
      <HeaderView name="Collection Information" iconName="bookshelf" />
      <View style={styles.component}>
        <StyledTextInput
          style={styles.input}
          autoCapitalize="none"
          placeholder="Scope Name"
          onChangeText={(scopeText) => setScopeName(scopeText)}
          defaultValue={scopeName}
        />
        <Divider style={localStyles.divider} />
        <StyledTextInput
          style={styles.input}
          autoCapitalize="none"
          placeholder="Collection Name"
          onChangeText={(collectionText) => setCollectionName(collectionText)}
          defaultValue={collectionName}
        />
      </View>
    </CBLDatabaseActionContainer>
  );
}

const localStyles = StyleSheet.create({
  divider: {
    marginTop: 2,
    marginBottom: 2,
  },
});
