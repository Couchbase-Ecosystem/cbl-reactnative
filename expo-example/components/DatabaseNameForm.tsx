import DatabaseHeaderView from '@/components/DatabaseHeaderView';
import { TextInput, useColorScheme } from 'react-native';
import React from 'react';
import { useStyleScheme, useThemeColor } from '@/components/Themed';
import { usePlaceholderTextColor } from '@/hooks/usePlaceholderTextColor';
import { DatabaseNameFormProps } from '@/types/databaseNameFormProps.type';

export default function DatabaseNameForm({
  databaseName,
  setDatabaseName,
}: DatabaseNameFormProps) {
  const scheme = useColorScheme();
  const styles = useStyleScheme();
  const textColor = useThemeColor({ light: 'black', dark: 'white' }, 'text');
  const placeholderTextColor = usePlaceholderTextColor(scheme);

  return (
    <>
      <DatabaseHeaderView />
      <TextInput
        autoCapitalize="none"
        style={[styles.textInput, { color: textColor }]}
        placeholder="Database Name"
        placeholderTextColor={placeholderTextColor}
        onChangeText={(newText) => setDatabaseName(newText)}
        defaultValue={databaseName}
      />
    </>
  );
}
