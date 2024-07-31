import React, { useState } from 'react';
import { SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import DatabaseNameDirectoryActionForm from '@/components/DatabaseNameDirectoryActionForm';
import ResultListView from '@/components/ResultsListView';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import getFileDefaultPath from '@/service/file/getFileDefaultPath';
import { CBLDatabaseNamePathContainerProps } from '@/types/CBLDatabaseNamePathContainerProps.type';

export default function CBLDatabaseNamePathActionContainer({
  screenTitle,
  handleUpdatePressed,
  handleResetPressed,
  children,
}: CBLDatabaseNamePathContainerProps) {
  const [databaseName, setDatabaseName] = useState<string>('');
  const [fileLocation, setFileLocation] = useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption(screenTitle, navigation, reset);

  function reset() {
    setDatabaseName('');
    setFileLocation('');
    setResultsMessage([]);
    handleResetPressed();
  }

  const getDefaultDirectory = async () => {
    const defaultDirectory = await getFileDefaultPath();
    setFileLocation(defaultDirectory);
  };

  const update = async () => {
    if (databaseName === '') {
      setResultsMessage((prev) => [
        ...prev,
        'Error: Database name is required',
      ]);
    } else if (fileLocation === '') {
      setResultsMessage((prev) => [
        ...prev,
        'Error: Location path is required',
      ]);
    } else {
      try {
        const results = await handleUpdatePressed(databaseName, fileLocation);
        setResultsMessage((prev) => [...prev, ...results]);
      } catch (error) {
        // @ts-ignore
        setResultsMessage((prev) => [...prev, error.message]);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <DatabaseNameDirectoryActionForm
        setDatabaseName={setDatabaseName}
        databaseName={databaseName}
        fileLocation={fileLocation}
        setFileLocation={setFileLocation}
        handleLocationPress={getDefaultDirectory}
        handleUpdatePressed={update}
      />
      <ResultListView messages={resultMessage} />
    </SafeAreaView>
  );
}
