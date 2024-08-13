import React, { useState } from 'react';
import { StyledTextInput } from '@/components/StyledTextInput';
import get from '@/service/scope/get';
import { Database } from 'cbl-reactnative';
import CBLDatabaseActionContainer from '@/components/CBLDatabaseActionContainer';
import { useStyleScheme } from '@/components/Themed';
import HeaderView from '@/components/HeaderView/HeaderView';
import { StyleSheet, View } from 'react-native';

export default function ScopeGetScreen() {
  const [scopeName, setScopeName] = useState<string>('');
  const styles = useStyleScheme();

  function reset() {
    setScopeName('');
  }

  async function update(database: Database): Promise<string[]> {
    try {
      const scope = await get(database, scopeName);
      return [`Found Scope: ${scope.name} in Database ${database.getName()}`];
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDatabaseActionContainer
      screenTitle={'Get Scope'}
      handleUpdatePressed={update}
      handleResetPressed={reset}
    >
      <HeaderView name="Scope Information" iconName="file-cabinet" />

      <View style={styles.component}>
        <StyledTextInput
          style={styles.input}
          autoCapitalize="none"
          placeholder="Scope Name"
          onChangeText={(scopeText) => setScopeName(scopeText)}
          defaultValue={scopeName}
        />
      </View>
    </CBLDatabaseActionContainer>
  );
}
