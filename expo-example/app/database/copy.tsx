import React, { useContext, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme, useThemeColor } from '@/components/Themed';
import DatabaseNameForm from '@/components/DatabaseNameForm';
import getFileDefaultPath from '@/service/file/getFileDefaultPath';
import ResultListView from '@/components/ResultsListView';
import DatabaseContext from '@/providers/DatabaseContext';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import { usePlaceholderTextColor } from '@/hooks/usePlaceholderTextColor';
import DatabaseCopyActionForm from '@/components/DatabaseCopyActionForm';
import copy from '@/service/database/copy';

export default function DatabaseCopyScreen() {
  const { databases, setDatabases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [newDatabaseName, setNewDatabaseName] = useState<string>('');
  const [fileLocation, setFileLocation] = useState<string>('');
  const [encryptionKey, setEncryptionKey] = useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  useNavigationBarTitleResetOption('Copy Database', navigation, reset);

  const scheme = useColorScheme();
  const styles = useStyleScheme();
  const textColor = useThemeColor({ light: 'black', dark: 'white' }, 'text');
  const placeholderTextColor = usePlaceholderTextColor(scheme);

  function reset() {
    setDatabaseName('');
    setNewDatabaseName('');
    setFileLocation('');
    setEncryptionKey('');
    setResultsMessage([]);
  }

  const update = async () => {
    if (databaseName === '' && newDatabaseName === '') {
      setResultsMessage((prev) => [
        ...prev,
        'Error: Database names are required',
      ]);
    } else {
      try {
        const results = await copy(
          databases,
          databaseName,
          newDatabaseName,
          fileLocation,
          encryptionKey
        );
        setResultsMessage((prev) => [...prev, '' + results]);
      } catch (error) {
        // @ts-ignore
        setResultsMessage((prev) => [...prev, error.message]);
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
    <View style={styles.container}>
      <DatabaseNameForm
        setDatabaseName={setDatabaseName}
        databaseName={databaseName}
      />
      <DatabaseCopyActionForm
        newDatabaseName={newDatabaseName}
        setNewDatabaseName={setNewDatabaseName}
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
