import React, { useContext, useLayoutEffect, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import DatabaseNameForm from '@/components/DatabaseNameForm';
import MaterialCommunityIcons from '@expo/vector-icons/build/MaterialCommunityIcons';
import getFileDefaultPath from '@/service/file/getFileDefaultPath';
import DatabaseConfigForm from '@/components/DatabaseConfigForm';
import ResultListView from '@/components/ResultsListView';
import open from '@/service/database/open';
import DatabaseContext from '@/providers/DatabaseContext';

export default function DatabaseOpenScreen() {
  const { databases, setDatabases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [fileLocation, setFileLocation] = useState<string>('');
  const [encryptionKey, setEncryptionKey] = useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Database Open',
      headerBackTitle: 'Back',
      headerRight: () => (
        <MaterialCommunityIcons
          name="refresh"
          size={24}
          color="#428cff"
          onPress={reset}
        />
      ),
    });
  }, [navigation]);

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
      setResult(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <DatabaseNameForm
        setDatabaseName={setDatabaseName}
        databaseName={databaseName}
      />
      <DatabaseConfigForm
        setFileLocation={setFileLocation}
        fileLocation={fileLocation}
        setEncryptionKey={setEncryptionKey}
        encryptionKey={encryptionKey}
        handleLocationPress={handleLocationPress}
        handleUpdatePressed={update}
      />
      <ResultListView messages={resultMessage} />
    </View>
  );
}
