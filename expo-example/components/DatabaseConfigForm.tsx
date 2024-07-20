import React from 'react';
import { TextInput, useColorScheme } from 'react-native';
import { useStyleScheme, useThemeColor } from '@/components/Themed';
import { usePlaceholderTextColor } from '@/hooks/usePlaceholderTextColor';
import { DatabaseConfigFormProps } from '@/types/databaseConfigFormProps.type';

export default function DatabaseConfigForm({
  fileLocation,
  setFileLocation,
  encryptionKey,
  setEncryptionKey,
}: DatabaseConfigFormProps) {
  const scheme = useColorScheme();
  const styles = useStyleScheme();
  const textColor = useThemeColor({ light: 'black', dark: 'white' }, 'text');
  const placeholderTextColor = usePlaceholderTextColor(scheme);

  return (
    <>
      <TextInput
        autoCapitalize="none"
        style={[
          styles.textInput,
          { color: textColor, height: undefined, minHeight: 20 },
        ]}
        placeholder="File Location"
        placeholderTextColor={placeholderTextColor}
        onChangeText={(newText) => setFileLocation(newText)}
        defaultValue={fileLocation}
        multiline={true}
      />
      <TextInput
        autoCapitalize="none"
        style={[styles.textInput, { color: textColor }]}
        placeholder="Encryption Key"
        placeholderTextColor={placeholderTextColor}
        onChangeText={(newText) => setEncryptionKey(newText)}
        defaultValue={encryptionKey}
      />
    </>
  );
}
