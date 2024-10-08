import React, { useContext, useState } from 'react';
import { SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed/Themed';
import DatabaseNameForm from '@/components/DatabaseNameForm/DatabaseNameForm';
import getFileDefaultPath from '@/service/file/getFileDefaultPath';
import DatabaseConfigActionForm from '@/components/DatabaseConfigActionForm/DatabaseConfigActionForm';
import ResultListView from '@/components/ResultsListView/ResultsListView';
import open from '@/service/database/open';
import DatabaseContext from '@/providers/DatabaseContext';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';

export default function DatabaseOpenScreen() {
  const { databases, setDatabases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [fileLocation, setFileLocation] = useState<string>('');
  const [encryptionKey, setEncryptionKey] = useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('Open Database', navigation, reset);

  function reset() {
    setDatabaseName('');
    setFileLocation('');
    setEncryptionKey('');
    setResultsMessage([]);
  }

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
        const results = await open(
          databases,
          setDatabases,
          databaseName,
          fileLocation,
          encryptionKey
        );
        setResultsMessage((prev) => [...prev, results]);
      } catch (error) {
        setResultsMessage((prev) => [...prev, '' + error]);
      }
    }
  };

  const handleLocationPress = async () => {
    try {
      const path = await getFileDefaultPath();
      setFileLocation(path);
    } catch (error) {
      // @ts-ignore
      setResultsMessage((prev) => [...prev, error]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <DatabaseNameForm
        setDatabaseName={setDatabaseName}
        databaseName={databaseName}
      />
      <DatabaseConfigActionForm
        setFileLocation={setFileLocation}
        fileLocation={fileLocation}
        setEncryptionKey={setEncryptionKey}
        encryptionKey={encryptionKey}
        handleLocationPress={handleLocationPress}
        handleUpdatePressed={update}
      />
      <ResultListView messages={resultMessage} />
    </SafeAreaView>
  );
}
