import React from 'react';
import { View } from 'react-native';
import { StyledTextInput } from '@/components/StyledTextInput/StyledTextInput';
import DatabaseToolbarHeaderView from '@/components/DatabaseToolbarHeaderView/DatabaseToolbarHeaderView';
import { DatabaseNameDirectoryActionFormProps } from '@/components/DatabaseNameDirectoryActionForm/databaseNameDirectoryActionFormProps.type';
import { useStyleScheme } from '@/components/Themed/Themed';
import { Divider } from '@gluestack-ui/themed';
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
      <View style={styles.component}>
        <StyledTextInput
          autoCapitalize="none"
          placeholder="Database Name"
          onChangeText={(newText) => setDatabaseName(newText)}
          defaultValue={databaseName}
        />
        <Divider
          style={{
            marginTop: 5,
          }}
        />
        <StyledTextInput
          style={[
            styles.textInput,
            {
              height: undefined,
              minHeight: 20,
              marginTop: 10,
              marginBottom: 20,
            },
          ]}
          autoCapitalize="none"
          placeholder="File Location"
          onChangeText={(newText) => setFileLocation(newText)}
          defaultValue={fileLocation}
          multiline={true}
        />
      </View>
    </>
  );
}
