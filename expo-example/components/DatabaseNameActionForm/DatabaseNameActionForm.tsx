import React from 'react';
import { View } from 'react-native';
import DatabaseToolbarHeaderView from '@/components/DatabaseToolbarHeaderView/DatabaseToolbarHeaderView';
import { DatabaseNameActionFormProps } from '@/components/DatabaseNameActionForm/databaseNameActionFormProps.type';
import { StyledTextInput } from '@/components/StyledTextInput/StyledTextInput';
import { useStyleScheme } from '@/components/Themed/Themed';

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
