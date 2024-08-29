import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useStyleScheme } from '@/components/Themed/Themed';
import { DatabaseScopeCollectionFormProps } from '@/components/DatabaseScopeCollectionForm/databaseScopeCollectionFormProps.type';
import { StyledTextInput } from '@/components/StyledTextInput/StyledTextInput';
import HeaderView from '@/components/HeaderView/HeaderView';
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
      <View style={styles.component}>
        <StyledTextInput
          style={localStyles.databaseName}
          autoCapitalize="none"
          placeholder="Database Name"
          onChangeText={(newText) => setDatabaseName(newText)}
          defaultValue={databaseName}
        />
      </View>
      <HeaderView name="Collection Information" iconName="bookshelf" />
      <View style={styles.component}>
        <StyledTextInput
          autoCapitalize="none"
          placeholder="Scope Name"
          onChangeText={(newText) => setScopeName(newText)}
          defaultValue={scopeName}
        />
        <Divider />
        <StyledTextInput
          style={styles.input}
          autoCapitalize="none"
          placeholder="Collection Name"
          onChangeText={(newText) => setCollectionName(newText)}
          defaultValue={collectionName}
        />
      </View>
    </>
  );
}

const localStyles = StyleSheet.create({
  databaseName: {
    marginTop: 5,
  },
});
