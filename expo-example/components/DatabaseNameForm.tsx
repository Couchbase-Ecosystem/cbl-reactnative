import DatabaseHeaderView from '@/components/DatabaseHeaderView';
import { useColorScheme, View } from 'react-native';
import React from 'react';
import { useStyleScheme, useThemeColor } from '@/components/Themed';
import { DatabaseNameFormProps } from '@/types/databaseNameFormProps.type';
import { StyledTextInput } from '@/components/StyledTextInput';

export default function DatabaseNameForm({
  databaseName,
  setDatabaseName,
}: DatabaseNameFormProps) {
  const styles = useStyleScheme();

  return (
    <>
      <DatabaseHeaderView />
      <View style={styles.component}>
        <StyledTextInput
          autoCapitalize="none"
          placeholder="Database Name"
          onChangeText={(newText) => setDatabaseName(newText)}
          defaultValue={databaseName}
        />
      </View>
    </>
  );
}
