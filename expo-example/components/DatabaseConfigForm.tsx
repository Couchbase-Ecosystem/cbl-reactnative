import React from 'react';
import { TextInput, useColorScheme } from 'react-native';
import { useStyleScheme, useThemeColor } from '@/components/Themed';
import { usePlaceholderTextColor } from '@/hooks/usePlaceholderTextColor';
import HeaderToolbarView from '@/components/HeaderToolbarView';
import { DatabaseConfigFormProps } from '@/types/databaseConfigFormProps.type';

export default function DatabaseConfigForm({
  fileLocation,
  setFileLocation,
  encryptionKey,
  setEncryptionKey,
  handleLocationPress,
  handleUpdatePressed,
}: DatabaseConfigFormProps) {
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
        name="Database Configuration"
        iconName="database-cog"
        icons={icons}
      />
      <TextInput
        style={[styles.textInput, { color: textColor }]}
        placeholder="File Location"
        placeholderTextColor={placeholderTextColor}
        onChangeText={(newText) => setFileLocation(newText)}
        defaultValue={fileLocation}
        multiline={true}
        numberOfLines={4}
      />
      <TextInput
        style={[styles.textInput, { color: textColor }]}
        placeholder="Encryption Key"
        placeholderTextColor={placeholderTextColor}
        onChangeText={(newText) => setEncryptionKey(newText)}
        defaultValue={encryptionKey}
      />
    </>
  );
}
