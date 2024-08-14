import React, { useContext, useState } from 'react';
import { ReplicatorConfigCollectionFormProps } from '@/components/ReplicationConfigCollectionForm/ReplicatorConfigCollectionFormProps.type';
import { Database } from '../../../lib/typescript/src';
import DatabaseContext from '@/providers/DatabaseContext';
import DatabaseNameActionForm from '@/components/DatabaseNameActionForm/DatabaseNameActionForm';
import HeaderView from '@/components/HeaderView/HeaderView';
import { View } from 'react-native';
import { StyledTextInput } from '@/components/StyledTextInput/StyledTextInput';
import { Divider } from '@gluestack-ui/themed';
import { useStyleScheme } from '@/components/Themed/Themed';

export default function ReplicatorConfigCollectionForm({
  handleUpdatePressed,
  handleResetPressed,
  updateResultMessage,
}: ReplicatorConfigCollectionFormProps) {
  const styles = useStyleScheme();

  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [scopeName, setScopeName] = useState<string>('');
  const [collections, setCollections] = useState<string>('');

  async function update() {
    if (databaseName === '') {
      updateResultMessage(['Error: Database name is required']);
    } else {
      try {
        if (
          databaseName in databases &&
          databases[databaseName] instanceof Database
        ) {
          const database = databases[databaseName];
          const collectionsList = collections.trim().split(',');
          await handleUpdatePressed(database, scopeName, collectionsList);
        } else {
          updateResultMessage([
            `Error: Database <${databaseName}> not found in context. Make sure database was opened first prior to trying to use it.`,
          ]);
        }
      } catch (error) {
        // @ts-ignore
        updateResultMessage([error.message]);
      }
    }
  }

  function reset() {
    setDatabaseName('');
    setScopeName('');
    setCollections('');
    handleResetPressed();
  }
  return (
    <>
      <DatabaseNameActionForm
        setDatabaseName={setDatabaseName}
        databaseName={databaseName}
        handleUpdatePressed={update}
      />
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
          placeholder="Collection Names (comma separated)"
          onChangeText={(newText) => setCollections(newText)}
          defaultValue={collections}
        />
      </View>
    </>
  );
}
