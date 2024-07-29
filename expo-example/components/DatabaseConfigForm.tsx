import React from 'react';
import { useStyleScheme, useThemeColor } from '@/components/Themed';
import { DatabaseConfigFormProps } from '@/types/databaseConfigFormProps.type';
import { StyledTextInput } from '@/components/StyledTextInput';
import { Divider } from '@gluestack-ui/themed';

export default function DatabaseConfigForm({
  fileLocation,
  setFileLocation,
  encryptionKey,
  setEncryptionKey,
}: DatabaseConfigFormProps) {
  const styles = useStyleScheme();
  const textColor = useThemeColor({ light: 'black', dark: 'white' }, 'text');

  return (
    <>
      <StyledTextInput
        autoCapitalize="none"
        style={[
          styles.textInput,
          { color: textColor, height: undefined, minHeight: 20, marginTop: 10 },
        ]}
        placeholder="File Location"
        onChangeText={(newText) => setFileLocation(newText)}
        defaultValue={fileLocation}
        multiline={true}
      />
      <Divider style={styles.dividerTextInput} />
      <StyledTextInput
        style={[styles.textInput, { color: textColor, marginBottom: 10 }]}
        autoCapitalize="none"
        placeholder="Encryption Key"
        onChangeText={(newText) => setEncryptionKey(newText)}
        defaultValue={encryptionKey}
      />
    </>
  );
}
