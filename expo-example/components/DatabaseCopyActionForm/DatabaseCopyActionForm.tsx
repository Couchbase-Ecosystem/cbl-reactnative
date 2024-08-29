import React from 'react';
import { View } from 'react-native';
import HeaderToolbarView from '@/components/HeaderToolbarView/HeaderToolbarView';
import DatabaseConfigForm from '@/components/DatabaseConfigForm/DatabaseConfigForm';
import { DatabaseCopyActionFormProps } from '@/components/DatabaseCopyActionForm/databaseCopyActionFormProps.type';
import { StyledTextInput } from '@/components/StyledTextInput/StyledTextInput';
import { useStyleScheme } from '@/components/Themed/Themed';
import { Divider } from '@gluestack-ui/themed';

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
      <View style={styles.component}>
        <StyledTextInput
          autoCapitalize="none"
          placeholder="New Database Name"
          onChangeText={(newText) => setNewDatabaseName(newText)}
          defaultValue={newDatabaseName}
        />
      </View>
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
