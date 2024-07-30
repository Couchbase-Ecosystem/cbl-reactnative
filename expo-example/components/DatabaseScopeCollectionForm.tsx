import React from 'react';
import { useStyleScheme } from '@/components/Themed';
import { DatabaseScopeCollectionFormProps } from '@/types/databaseScopeCollectionFormProps.type';
import { StyledTextInput } from '@/components/StyledTextInput';
import { Divider } from '@gluestack-ui/themed';

export default function DatabaseScopeCollectionForm({
  databaseName,
  setDatabaseName,
  scopeName,
  setScopeName,
  collectionName,
  setCollectionName,
}: DatabaseScopeCollectionFormProps) {
  const styles = useStyleScheme();

  return (
    <>
      <StyledTextInput
        style={{ marginTop: 5 }}
        autoCapitalize="none"
        placeholder="Database Name"
        onChangeText={(newText) => setDatabaseName(newText)}
        defaultValue={databaseName}
      />
      <Divider style={styles.dividerCollectionFormTextInput} />
      <StyledTextInput
        autoCapitalize="none"
        placeholder="Scope Name"
        onChangeText={(newText) => setScopeName(newText)}
        defaultValue={scopeName}
      />
      <Divider style={styles.dividerCollectionFormTextInput} />
      <StyledTextInput
        style={{ marginBottom: 5 }}
        autoCapitalize="none"
        placeholder="Collection Name"
        onChangeText={(newText) => setCollectionName(newText)}
        defaultValue={collectionName}
      />
    </>
  );
}
