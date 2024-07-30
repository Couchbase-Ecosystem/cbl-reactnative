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
      maxRotateCountInt = parseInt(maxRotateCount);
      maxSizeInt = parseInt(maxSize);
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
      const path = await getFileDefaultPath();
      setPath(path);
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
        <TextInput
          autoCapitalize="none"
          style={[
            styles.textInput,
            { color: textColor, height: undefined, minHeight: 80 },
          ]}
          placeholder="Log Directory Path"
          placeholderTextColor={placeholderTextColor}
          onChangeText={(newText) => setPath(newText)}
          defaultValue={path}
          multiline={true}
        />
        <Divider style={{ marginTop: 10, marginBottom: 10 }} />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ paddingLeft: 6, fontSize: 16 }}>Use Plain Text</Text>
          <Switch
            style={{ paddingRight: 16 }}
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

        <Divider style={{ marginTop: 12, marginBottom: 12 }} />

        <Text style={{ paddingLeft: 6, fontSize: 16 }}>Max Rotate Count</Text>
        <TextInput
          keyboardType="numeric"
          style={[
            styles.textInput,
            {
              color: textColor,
              height: undefined,
              minHeight: 30,
              fontSize: 16,
            },
          ]}
          placeholder="0"
          placeholderTextColor={placeholderTextColor}
          onChangeText={(maxRotateCount) => setMaxRotateCount(maxRotateCount)}
          defaultValue={maxRotateCount.toString()}
        />

        <Divider style={{ marginTop: 12, marginBottom: 12 }} />

        <Text style={{ paddingLeft: 6, fontSize: 16 }}>
          Max Size (in bytes)
        </Text>
        <TextInput
          keyboardType="numeric"
          style={[
            styles.textInput,
            {
              color: textColor,
              height: undefined,
              minHeight: 30,
              fontSize: 16,
            },
          ]}
          placeholder="0"
          placeholderTextColor={placeholderTextColor}
          onChangeText={(maxSize) => setMaxSize(maxSize)}
          defaultValue={maxSize}
        />

        <Divider style={{ marginTop: 12, marginBottom: 12 }} />

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
  text: {
    flex: 1, // Takes up as much space as possible, pushing the switch to the end
    marginRight: 10, // Optional: adds some space between the text field and the switch
  },
});
