import React, { useState } from 'react';
import { StyledTextInput } from '@/components/StyledTextInput';
import create from '@/service/collection/create';
import { Database } from 'cbl-reactnative';
import CBLDatabaseActionContainer from '@/components/CBLDatabaseActionContainer';
import { Divider } from '@gluestack-ui/themed';
import HeaderView from '@/components/HeaderView';

export default function CollectionCreateScreen() {
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
      <StyledTextInput
        style={{ marginBottom: 5 }}
        autoCapitalize="none"
        placeholder="Scope Name"
        onChangeText={(scopeText) => setScopeName(scopeText)}
        defaultValue={scopeName}
      />
      <Divider style={{ marginTop: 2, marginBottom: 2 }} />
      <StyledTextInput
        style={{ marginBottom: 5 }}
        autoCapitalize="none"
        placeholder="Collection Name"
        onChangeText={(collectionText) => setCollectionName(collectionText)}
        defaultValue={collectionName}
      />
    </CBLDatabaseActionContainer>
  );
}
