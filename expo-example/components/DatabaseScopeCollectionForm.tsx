import React from 'react';
import { useStyleScheme } from '@/components/Themed';
import { DatabaseScopeCollectionFormProps } from '@/types/databaseScopeCollectionFormProps.type';
import { StyledTextInput } from '@/components/StyledTextInput';
import { Divider } from '@gluestack-ui/themed';
import HeaderView from '@/components/HeaderView';

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
      <HeaderView name="Collection Information" iconName="bookshelf" />
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
