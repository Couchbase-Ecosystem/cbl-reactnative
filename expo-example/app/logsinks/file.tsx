import React, { useState } from 'react';
import {
  TextInput,
  useColorScheme,
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Switch, Divider, Button, ButtonText } from '@gluestack-ui/themed';
import { useNavigation } from '@react-navigation/native';
import {
  useStyleScheme,
  useThemeColor,
  Text,
} from '@/components/Themed/Themed';
import ResultListView from '@/components/ResultsListView/ResultsListView';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import SelectKeyValue from '@/components/SelectKeyValue/SelectKeyValue';
import { useLogLevelAsValues } from '@/hooks/useLogLevel';
import { usePlaceholderTextColor } from '@/hooks/usePlaceholderTextColor';
import getFileDefaultPath from '@/service/file/getFileDefaultPath';
import HeaderToolbarView from '@/components/HeaderToolbarView/HeaderToolbarView';
import setFileSink from '@/service/logsinks/setFileSink';
import disableFileSink from '@/service/logsinks/disableFileSink';

export default function LogSinksFileScreen() {
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('');
  const [directory, setDirectory] = useState<string>('');
  const [maxRotateCount, setMaxRotateCount] = useState<string>('5');
  const [maxSize, setMaxSize] = useState<string>('10485760');
  const [usePlainText, setUsePlainText] = useState<boolean>(false);
  const [resultMessage, setResultsMessage] = useState<string[]>([]);

  const navigation = useNavigation();
  useNavigationBarTitleResetOption('LogSinks File', navigation, reset);

  const scheme = useColorScheme();
  const styles = useStyleScheme();
  const textColor = useThemeColor({ light: 'black', dark: 'white' }, 'text');
  const placeholderTextColor = usePlaceholderTextColor(scheme);
  const logLevels = useLogLevelAsValues();

  function reset() {
    setDirectory('');
    setMaxRotateCount('5');
    setMaxSize('10485760');
    setUsePlainText(false);
    setSelectedLogLevel('');
    setResultsMessage([]);
  }

  const enable = async () => {
    const numericRegex = /^[0-9]*$/;
    let maxRotateCountInt = 5;
    let maxSizeInt = 10485760;

    if (numericRegex.test(maxRotateCount) && numericRegex.test(maxSize)) {
      maxRotateCountInt = parseInt(maxRotateCount, 10);
      maxSizeInt = parseInt(maxSize, 10);
    } else {
      setResultsMessage((prev) => [
        ...prev,
        '❌ Max Rotate Count and Max Size must be numeric values',
      ]);
      return;
    }
    if (selectedLogLevel === '') {
      setResultsMessage((prev) => [...prev, '❌ Please select a log level']);
      return;
    }
    if (directory === '') {
      setResultsMessage((prev) => [...prev, '❌ Please enter a directory path']);
      return;
    }

    const result = await setFileSink(
      selectedLogLevel,
      directory,
      maxRotateCountInt,
      maxSizeInt,
      usePlainText
    );
    setResultsMessage((prev) => [...prev, result]);
  };

  const disable = async () => {
    const result = await disableFileSink();
    setResultsMessage((prev) => [...prev, result]);
  };

  const handleLocationPress = async () => {
    try {
      const defaultPath = await getFileDefaultPath();
      setDirectory(defaultPath);
    } catch (error: any) {
      setResultsMessage((prev) => [...prev, `❌ ${error.message}`]);
    }
  };

  const icons = [
    {
      iconName: 'folder-open',
      onPress: handleLocationPress,
    },
    {
      iconName: 'play',
      onPress: enable,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <HeaderToolbarView
          name="File LogSink"
          iconName="file-document"
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
            placeholder="Log Directory Path (Required)"
            placeholderTextColor={placeholderTextColor}
            onChangeText={(newText) => setDirectory(newText)}
            value={directory}
            multiline={true}
          />
          <Divider style={fileStyles.divider} />

          <SelectKeyValue
            headerTitle="Select Log Level"
            onSelectChange={setSelectedLogLevel}
            placeholder="Log Level (Required)"
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
              { color: textColor },
            ]}
            placeholder="5"
            placeholderTextColor={placeholderTextColor}
            onChangeText={setMaxRotateCount}
            value={maxRotateCount}
          />

          <Divider style={fileStyles.divider} />

          <Text style={styles.text}>Max Size (in bytes)</Text>
          <TextInput
            keyboardType="numeric"
            style={[
              styles.textInput,
              styles.text,
              fileStyles.maxSizeInput,
              { color: textColor },
            ]}
            placeholder="10485760"
            placeholderTextColor={placeholderTextColor}
            onChangeText={setMaxSize}
            value={maxSize}
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

          <Divider style={fileStyles.divider} />

          <Button onPress={disable} action="negative">
            <ButtonText>Disable File LogSink</ButtonText>
          </Button>
        </View>
        <ResultListView messages={resultMessage} />
      </ScrollView>
    </SafeAreaView>
  );
}

const fileStyles = StyleSheet.create({
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
});

