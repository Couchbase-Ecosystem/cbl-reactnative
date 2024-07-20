import React, { useContext, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import ResultListView from '@/components/ResultsListView';
import DatabaseContext from '@/providers/DatabaseContext';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import HeaderRunActionView from '@/components/HeaderRunActionView';
import SelectKeyValue from '@/components/SelectKeyValue';
import { useLogLevelAsValues } from '@/hooks/useLogLevel';
import DatabaseHeaderView from '@/components/DatabaseHeaderView';
import DatabaseNameForm from '@/components/DatabaseNameForm';

export default function LoggingFileScreen() {
  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('');
  const [path, setPath] = useState<string>('');
  const [maxRotateCount, setMaxRotateCount] = useState<number>(0);
  const [maxSize, setMaxSize] = useState<number>(0);
  const [usePlainText, setUsePlainText] = useState<boolean>(true);
  const [resultMessage, setResultsMessage] = useState<string[]>([]);

  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('File Logging', navigation, reset);

  const logLevels = useLogLevelAsValues();

  function reset() {
    setDatabaseName('');
    setPath('');
    setMaxRotateCount(0);
    setMaxSize(0);
    setUsePlainText(true);
    setSelectedLogLevel('');
    setResultsMessage([]);
  }

  const update = async () => {
    if (selectedLogLevel) {
      //const result = await setConsoleLog(selectedLogLevel, selectedLogDomain);
      //setResultsMessage((prev) => [...prev, result]);
    }
  };

  return (
    <View style={styles.container}>
      <DatabaseNameForm
        setDatabaseName={setDatabaseName}
        databaseName={databaseName}
      />
      <HeaderRunActionView
        name="File Information"
        iconName="file-compare"
        handleUpdatePressed={update}
      />
      <SelectKeyValue
        headerTitle="Select a Log Level"
        onSelectChange={setSelectedLogLevel}
        placeholder="Log Level"
        items={logLevels}
      />
      <ResultListView messages={resultMessage} />
    </View>
  );
}
