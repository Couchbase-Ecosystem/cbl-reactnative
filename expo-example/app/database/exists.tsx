import React, { useContext, useState } from 'react';
import { SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import DatabaseNameDirectoryActionForm from '@/components/DatabaseNameDirectoryActionForm';
import ResultListView from '@/components/ResultsListView';
import DatabaseContext from '@/providers/DatabaseContext';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import doesExist from '@/service/database/exists';
import getFileDefaultPath from '@/service/file/getFileDefaultPath';

export default function DatabaseExistsScreen() {
  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [fileLocation, setFileLocation] = useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('Does Database Exists', navigation, reset);

  function reset() {
    setDatabaseName('');
    setFileLocation('');
    setResultsMessage([]);
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
    } else {
      try {
        const results = await doesExist(databaseName, fileLocation);
        setResultsMessage((prev) => [...prev, `Does Exists: <${results}>`]);
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
