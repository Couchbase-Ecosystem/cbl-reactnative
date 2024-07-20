import React from 'react';
import HeaderToolbarView from '@/components/HeaderToolbarView';
import DatabaseConfigForm from '@/components/DatabaseConfigForm';
import { DatabaseCopyActionFormProps } from '@/types/databaseCopyActionFormProps.type';
import { TextInput, useColorScheme } from 'react-native';
import { useStyleScheme, useThemeColor } from '@/components/Themed';
import { usePlaceholderTextColor } from '@/hooks/usePlaceholderTextColor';

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
  const scheme = useColorScheme();
  const styles = useStyleScheme();
  const textColor = useThemeColor({ light: 'black', dark: 'white' }, 'text');
  const placeholderTextColor = usePlaceholderTextColor(scheme);
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
      <TextInput
        autoCapitalize="none"
        style={[styles.textInput, { color: textColor }]}
        placeholder="New Database Name"
        placeholderTextColor={placeholderTextColor}
        onChangeText={(newText) => setNewDatabaseName(newText)}
        defaultValue={newDatabaseName}
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
