import DatabaseToolbarHeaderView from '@/components/DatabaseToolbarHeaderView';
import { TextInput, useColorScheme } from 'react-native';
import React from 'react';
import { useStyleScheme, useThemeColor } from '@/components/Themed';
import { usePlaceholderTextColor } from '@/hooks/usePlaceholderTextColor';
import { DatabaseNameActionFormProps } from '@/types/databaseNameActionFormProps.type';

export default function DatabaseNameActionForm({
  databaseName,
  setDatabaseName,
  handleUpdatePressed,
}: DatabaseNameActionFormProps) {
  const scheme = useColorScheme();
  const styles = useStyleScheme();
  const textColor = useThemeColor({ light: 'black', dark: 'white' }, 'text');
  const placeholderTextColor = usePlaceholderTextColor(scheme);
  const icons = [
    {
      iconName: 'play',
      onPress: handleUpdatePressed,
    },
  ];
  return (
    <>
      <DatabaseToolbarHeaderView icons={icons} />
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
