import React from 'react';
import HeaderToolbarView from '@/components/HeaderToolbarView';
import DatabaseConfigForm from '@/components/DatabaseConfigForm';
import { DatabaseCopyActionFormProps } from '@/types/databaseCopyActionFormProps.type';
import { StyledTextInput } from '@/components/StyledTextInput';
import { Divider } from '@gluestack-ui/themed';
import { useStyleScheme } from '@/components/Themed';

export default function DatabaseCopyActionForm({
  newDatabaseName,
  setNewDatabaseName,
  fileLocation,
  setFileLocation,
  encryptionKey,
  setEncryptionKey,
  handleLocationPress,
  handleUpdatePressed,
}: DatabaseCopyActionFormProps) {
  const styles = useStyleScheme();
  const icons = [
    {
      iconName: 'folder-open',
      onPress: handleLocationPress,
    },
    {
      iconName: 'play',
      onPress: handleUpdatePressed,
    },
  ];

  return (
    <>
      <HeaderToolbarView
        name="New Database Configuration"
        iconName="database-edit"
        icons={icons}
      />
      <StyledTextInput
        autoCapitalize="none"
        placeholder="New Database Name"
        onChangeText={(newText) => setNewDatabaseName(newText)}
        defaultValue={newDatabaseName}
      />
      <Divider
        style={{
          marginTop: 5,
          marginLeft: 8,
        }}
      />
      <DatabaseConfigForm
        fileLocation={fileLocation}
        encryptionKey={encryptionKey}
        setFileLocation={setFileLocation}
        setEncryptionKey={setEncryptionKey}
      />
    </>
  );
}
