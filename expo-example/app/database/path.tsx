import React, { useContext, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import DatabaseNameActionForm from '@/components/DatabaseNameActionForm';
import ResultListView from '@/components/ResultsListView';
import close from '@/service/database/close';
import DatabaseContext from '@/providers/DatabaseContext';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import getPath from '@/service/database/getPath';

export default function DatabasePathScreen() {
  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('Get Database Path', navigation, reset);

  function reset() {
    setDatabaseName('');
    setResultsMessage([]);
  }

  const update = async () => {
    if (databaseName === '') {
      setResultsMessage((prev) => [
        ...prev,
        'Error: Database name is required',
      ]);
    } else {
      try {
        const results = await getPath(databases, databaseName);
        setResultsMessage((prev) => [...prev, `Path Found: ${results}`]);
      } catch (error) {
        // @ts-ignore
        setResultsMessage((prev) => [...prev, error.message]);
      }
    }
  };

  return (
    <View style={styles.container}>
      <DatabaseNameActionForm
        setDatabaseName={setDatabaseName}
        databaseName={databaseName}
        handleUpdatePressed={update}
      />
      <ResultListView messages={resultMessage} />
    </View>
  );
}