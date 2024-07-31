import React, { useState } from 'react';
import { StyledTextInput } from '@/components/StyledTextInput';
import listCollections from '@/service/collection/list';
import { Database } from 'cbl-reactnative';
import CBLDatabaseActionContainer from '@/components/CBLDatabaseActionContainer';
import HeaderView from '@/components/HeaderView';

export default function CollectionListScreen() {
  const [scopeName, setScopeName] = useState<string>('');

  function reset() {
    setScopeName('');
  }

  async function update(database: Database): Promise<string[]> {
    try {
      const results: string[] = [];
      const collections = await listCollections(database, scopeName);
      if (collections.length > 0) {
        collections.forEach((collection) => {
          results.push(
            `Found Collection: <${collection.fullName()}> in Database ${database.getName()}`
          );
        });
      } else {
        results.push(
          'Error: No collections found.  Collections should have at least 1 collection defined in a given scope.'
        );
      }
      return results;
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDatabaseActionContainer
      screenTitle={'List Collections'}
      handleUpdatePressed={update}
      handleResetPressed={reset}
    >
      <HeaderView name="Scope Information" iconName="file-cabinet" />

      <StyledTextInput
        style={{ marginBottom: 5 }}
        autoCapitalize="none"
        placeholder="Scope Name"
        onChangeText={(scopeText) => setScopeName(scopeText)}
        defaultValue={scopeName}
      />
    </CBLDatabaseActionContainer>
  );
}
