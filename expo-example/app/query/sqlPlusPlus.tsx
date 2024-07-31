import React, { useState } from 'react';
import { Database } from 'cbl-reactnative';
import execute from '@/service/query/execute';
import CBLDatabaseActionContainer from '@/components/CBLDatabaseActionContainer';
import { useStyleScheme } from '@/components/Themed';
import { StyledTextInput } from '@/components/StyledTextInput';
import HeaderView from '@/components/HeaderView';

export default function QuerySqlPlusPlusScreen() {
  const [query, setQuery] = useState<string>('');
  const styles = useStyleScheme();

  function reset() {
    setQuery('');
  }

  async function update(database: Database): Promise<string[]> {
    try {
      const date = new Date().toISOString();
      const results = await execute(query, null, database);
      const dict: string[] = [];
      for (const result of results) {
        dict.push(`${date}::<<${JSON.stringify(result)}>>`);
      }
      return dict;
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLDatabaseActionContainer
      screenTitle={'Query Workbench'}
      handleUpdatePressed={update}
      handleResetPressed={reset}
    >
      <HeaderView name="Query Editor" iconName="database-search" />
      <StyledTextInput
        autoCapitalize="none"
        style={[
          styles.textInput,
          { height: undefined, minHeight: 120, marginTop: 5, marginBottom: 15 },
        ]}
        placeholder="SQL++ Query"
        onChangeText={(newText) => setQuery(newText)}
        defaultValue={query}
        multiline={true}
      />
    </CBLDatabaseActionContainer>
  );
}
