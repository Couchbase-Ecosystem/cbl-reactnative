import React, { useState } from 'react';
import { StyledTextInput } from '@/components/StyledTextInput/StyledTextInput';
import listCollections from '@/service/collection/list';
import { Database } from 'cbl-reactnative';
import CBLDatabaseActionContainer from '@/components/CBLDatabaseActionContainer/CBLDatabaseActionContainer';
import HeaderView from '@/components/HeaderView/HeaderView';
import { View } from 'react-native';
import { useStyleScheme } from '@/components/Themed/Themed';

export default function CollectionListScreen() {
  const styles = useStyleScheme();
  const [scopeName, setScopeName] = useState<string>('');

  function reset() {
    setScopeName('');
  }

  async function update(database: Database): Promise<string[]> {
    try {
      const results: string[] = [];
      const collections = await listCollections(database, scopeName);
      if (collections.length > 0) {
        for (const collection of collections) {
          const fullName = await collection.fullName();
          results.push(
            `Found Collection: <${fullName}> in Database ${database.getName()}`
          );
        }
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

      <View style={styles.component}>
        <StyledTextInput
          style={{ marginBottom: 5 }}
          autoCapitalize="none"
          placeholder="Scope Name"
          onChangeText={(scopeText) => setScopeName(scopeText)}
          defaultValue={scopeName}
        />
      </View>
    </CBLDatabaseActionContainer>
  );
}
