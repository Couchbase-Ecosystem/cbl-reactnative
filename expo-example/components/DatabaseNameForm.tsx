import DatabaseHeaderView from '@/components/DatabaseHeaderView';
import { useColorScheme } from 'react-native';
import React from 'react';
import { useStyleScheme, useThemeColor } from '@/components/Themed';
import { usePlaceholderTextColor } from '@/hooks/usePlaceholderTextColor';
import { DatabaseNameFormProps } from '@/types/databaseNameFormProps.type';
import { StyledTextInput } from '@/components/StyledTextInput';

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
      <StyledTextInput
        autoCapitalize="none"
        placeholder="Database Name"
        onChangeText={(newText) => setDatabaseName(newText)}
        defaultValue={databaseName}
      />
    </>
  );
}
