import DatabaseToolbarHeaderView from '@/components/DatabaseToolbarHeaderView';
import React from 'react';
import { DatabaseNameActionFormProps } from '@/types/databaseNameActionFormProps.type';
import { StyledTextInput } from '@/components/StyledTextInput';

export default function DatabaseNameActionForm({
  databaseName,
  setDatabaseName,
  handleUpdatePressed,
}: DatabaseNameActionFormProps) {
  const icons = [
    {
      iconName: 'play',
      onPress: handleUpdatePressed,
    },
  ];
  return (
    <>
      <DatabaseToolbarHeaderView icons={icons} />
      <StyledTextInput
        autoCapitalize="none"
        placeholder="Database Name"
        onChangeText={(newText) => setDatabaseName(newText)}
        defaultValue={databaseName}
      />
    </>
  );
}
