import React from 'react';
import { View } from 'react-native';
import DatabaseHeaderView from '@/components/DatabaseHeaderView/DatabaseHeaderView';
import { useStyleScheme } from '@/components/Themed/Themed';
import { DatabaseNameFormProps } from '@/components/DatabaseNameForm/databaseNameFormProps.type';
import { StyledTextInput } from '@/components/StyledTextInput/StyledTextInput';

export default function DatabaseNameForm({
  databaseName,
  setDatabaseName,
  style,
}: DatabaseNameFormProps) {
  const styles = useStyleScheme();

  return (
    <>
      <DatabaseHeaderView style={style} />
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
