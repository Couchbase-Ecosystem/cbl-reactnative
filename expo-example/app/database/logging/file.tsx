import React, { useContext, useState } from 'react';
import {
  TextInput,
  useColorScheme,
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Switch, Divider } from '@gluestack-ui/themed';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme, useThemeColor, Text } from '@/components/Themed';
import ResultListView from '@/components/ResultsListView';
import DatabaseContext from '@/providers/DatabaseContext';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import SelectKeyValue from '@/components/SelectKeyValue';
import { useLogLevelAsValues } from '@/hooks/useLogLevel';
import DatabaseNameForm from '@/components/DatabaseNameForm';
import { usePlaceholderTextColor } from '@/hooks/usePlaceholderTextColor';
import getFileDefaultPath from '@/service/file/getFileDefaultPath';
import HeaderToolbarView from '@/components/HeaderToolbarView';

export default function LoggingFileScreen() {
  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('');
  const [path, setPath] = useState<string>('');
  const [maxRotateCount, setMaxRotateCount] = useState<string>('0');
  const [maxSize, setMaxSize] = useState<string>('0');
  const [usePlainText, setUsePlainText] = useState<boolean>(true);
  const [resultMessage, setResultsMessage] = useState<string[]>([]);

  const navigation = useNavigation();
  useNavigationBarTitleResetOption('File Logging', navigation, reset);

  const scheme = useColorScheme();
  const styles = useStyleScheme();
  const textColor = useThemeColor({ light: 'black', dark: 'white' }, 'text');
  const placeholderTextColor = usePlaceholderTextColor(scheme);
  const logLevels = useLogLevelAsValues();

  function reset() {
    setDatabaseName('');
    setPath('');
    setMaxRotateCount('0');
    setMaxSize('0');
    setUsePlainText(true);
    setSelectedLogLevel('');
    setResultsMessage([]);
  }

  const update = async () => {
    const numericRegex = /^[0-9]*$/;
    let maxRotateCountInt = 0;
    let maxSizeInt = 0;

    if (numericRegex.test(maxRotateCount) && numericRegex.test(maxSize)) {
      maxRotateCountInt = parseInt(maxRotateCount, 10);
      maxSizeInt = parseInt(maxSize, 10);
    } else {
      setResultsMessage((prev) => [
        ...prev,
        'Max Rotate Count and Max Size must be numeric values',
      ]);
      return;
    }
    if (selectedLogLevel === '') {
      setResultsMessage((prev) => [...prev, 'Please select a log level']);
      return;
    }
    if (databaseName === '') {
      setResultsMessage((prev) => [...prev, 'Please enter a database name']);
      return;
    }
    if (path === '') {
      setResultsMessage((prev) => [...prev, 'Please enter a path']);
      return;
    }
  };

  const handleLocationPress = async () => {
    try {
      const defaultPath = await getFileDefaultPath();
      setPath(defaultPath);
    } catch (error) {
      // @ts-ignore
      setResultsMessage((prev) => [...prev, error]);
    }
  };

  const icons = [
    {
      iconName: 'folder-open',
      onPress: handleLocationPress,
    },
    {
      iconName: 'play',
      onPress: update,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <DatabaseNameForm
          setDatabaseName={setDatabaseName}
          databaseName={databaseName}
        />
        <HeaderToolbarView
          name="File Information"
          iconName="file-compare"
          icons={icons}
        />
        <View style={styles.component}>
          <TextInput
            autoCapitalize="none"
            style={[
              styles.textInput,
              fileStyles.logDirectory,
              { color: textColor },
            ]}
            placeholder="Log Directory Path"
            placeholderTextColor={placeholderTextColor}
            onChangeText={(newText) => setPath(newText)}
            defaultValue={path}
            multiline={true}
          />
          <Divider style={fileStyles.divider} />
          <View style={styles.viewStackRightComponent}>
            <Text style={styles.text}>Use Plain Text</Text>
            <Switch
              style={fileStyles.switch}
              value={usePlainText}
              onValueChange={setUsePlainText}
            />
          </View>

          <Divider style={{ marginTop: 10 }} />

          <SelectKeyValue
            headerTitle="Select a Log Level"
            onSelectChange={setSelectedLogLevel}
            placeholder="Log Level"
            items={logLevels}
          />

          <Divider style={fileStyles.divider} />

          <Text style={styles.text}>Max Rotate Count</Text>
          <TextInput
            keyboardType="numeric"
            style={[
              styles.textInput,
              styles.text,
              fileStyles.maxSizeInput,
              {
                color: textColor,
              },
            ]}
            placeholder="0"
            placeholderTextColor={placeholderTextColor}
            onChangeText={(changeMaxRotateCount) =>
              setMaxRotateCount(changeMaxRotateCount)
            }
            defaultValue={maxRotateCount.toString()}
          />

          <Divider style={fileStyles.divider} />

          <Text style={styles.text}>Max Size (in bytes)</Text>
          <TextInput
            keyboardType="numeric"
            style={[
              styles.textInput,
              styles.text,
              fileStyles.maxSizeInput,
              {
                color: textColor,
              },
            ]}
            placeholder="0"
            placeholderTextColor={placeholderTextColor}
            onChangeText={(changedMaxSize) => setMaxSize(changedMaxSize)}
            defaultValue={maxSize}
          />

          <Divider style={fileStyles.divider} />
        </View>
        <ResultListView messages={resultMessage} />
      </ScrollView>
    </SafeAreaView>
  );
}

const fileStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  divider: {
    marginTop: 12,
    marginBottom: 12,
  },
  logDirectory: {
    height: undefined,
    minHeight: 80,
  },
  maxSizeInput: {
    height: undefined,
    minHeight: 30,
  },
  switch: {
    paddingRight: 16,
  },
  text: {
    flex: 1, // Takes up as much space as possible, pushing the switch to the end
    marginRight: 10, // Optional: adds some space between the text field and the switch
  },
});
