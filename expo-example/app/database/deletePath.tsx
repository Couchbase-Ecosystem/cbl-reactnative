import React, { useContext, useState } from 'react';
import { SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import DatabaseNameDirectoryActionForm from '@/components/DatabaseNameDirectoryActionForm';
import ResultListView from '@/components/ResultsListView';
import deleteDatabaseByPath from '@/service/database/deleteDatabaseByPath';
import DatabaseContext from '@/providers/DatabaseContext';

import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import getFileDefaultPath from '@/service/file/getFileDefaultPath';

export default function DatabaseDeletePathScreen() {
  const { databases, setDatabases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [fileLocation, setFileLocation] = useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('Delete Database', navigation, reset);

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
    // validate that the database name isn't blank
    // and see if the database is in context, if so throw error
    // otherwise get a pointer to the database, open it, and add to the context
    if (databaseName === '') {
      setResultsMessage((prev) => [
        ...prev,
        'Error: Database name is required',
      ]);
    } else {
      try {
        const results = await deleteDatabaseByPath(
          databases,
          setDatabases,
          databaseName,
          fileLocation
        );
        setResultsMessage((prev) => [...prev, results]);
      } catch (error) {
        setResultsMessage((prev) => [...prev, '' + error]);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <DatabaseNameDirectoryActionForm
        setDatabaseName={setDatabaseName}
        databaseName={databaseName}
        setFileLocation={setFileLocation}
        fileLocation={fileLocation}
        handleLocationPress={getDefaultDirectory}
        handleUpdatePressed={update}
      />
      <ResultListView messages={resultMessage} />
    </SafeAreaView>
  );
}
