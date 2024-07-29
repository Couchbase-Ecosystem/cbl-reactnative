import DatabaseToolbarHeaderView from '@/components/DatabaseToolbarHeaderView';
import React from 'react';
import { StyledTextInput } from '@/components/StyledTextInput';
import { DatabaseNameDirectoryActionFormProps } from '@/types/databaseNameDirectoryActionFormProps.type';
import { Divider } from '@gluestack-ui/themed';
import { useStyleScheme } from '@/components/Themed';

export default function DatabaseNameDirectoryActionForm({
  databaseName,
  setDatabaseName,
  fileLocation,
  setFileLocation,
  handleLocationPress,
  handleUpdatePressed,
}: DatabaseNameDirectoryActionFormProps) {
  const icons = [
    {
      iconName: 'folder-open',
      onPress: handleLocationPress,
    },
    {
      iconName: 'play',
      onPress: handleUpdatePressed,
    },
  ];
  const styles = useStyleScheme();
  return (
    <>
      <DatabaseToolbarHeaderView icons={icons} />
      <StyledTextInput
        autoCapitalize="none"
        placeholder="Database Name"
        onChangeText={(newText) => setDatabaseName(newText)}
        defaultValue={databaseName}
      />
      <Divider
        style={{
          marginTop: 5,
          marginLeft: 8,
        }}
      />
      <StyledTextInput
        style={[
          styles.textInput,
          { height: undefined, minHeight: 20, marginTop: 10, marginBottom: 20 },
        ]}
        autoCapitalize="none"
        placeholder="File Location"
        onChangeText={(newText) => setFileLocation(newText)}
        defaultValue={fileLocation}
        multiline={true}
      />
    </>
  );
}
