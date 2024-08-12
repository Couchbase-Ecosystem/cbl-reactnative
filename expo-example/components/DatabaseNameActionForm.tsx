import DatabaseToolbarHeaderView from '@/components/DatabaseToolbarHeaderView';
import React from 'react';
import { DatabaseNameActionFormProps } from '@/types/databaseNameActionFormProps.type';
import { StyledTextInput } from '@/components/StyledTextInput';
import { View } from 'react-native';
import { useStyleScheme } from '@/components/Themed';

export default function DatabaseNameActionForm({
  databaseName,
  setDatabaseName,
  handleUpdatePressed,
}: DatabaseNameActionFormProps) {
  const styles = useStyleScheme();
  const icons = [
    {
      iconName: 'play',
      onPress: handleUpdatePressed,
    },
  ];
  return (
    <>
      <DatabaseToolbarHeaderView icons={icons} />
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
