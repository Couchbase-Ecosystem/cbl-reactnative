import React, { useContext, useState } from 'react';
import { SafeAreaView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import ResultListView from '@/components/ResultsListView';
import DatabaseContext from '@/providers/DatabaseContext';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import DatabaseNameActionForm from '@/components/DatabaseNameActionForm';
import defaultCollection from '@/service/collection/default';

export default function CollectionGetDefaultScreen() {
  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('Get Default Collection', navigation, reset);

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
        const collection = await defaultCollection(databases, databaseName);
        setResultsMessage((prev) => [
          ...prev,
          `Found Collection: <${collection.fullName()}> in Database: <${databaseName}>`,
        ]);
      } catch (error) {
        // @ts-ignore
        setResultsMessage((prev) => [...prev, error.message]);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <DatabaseNameActionForm
        setDatabaseName={setDatabaseName}
        databaseName={databaseName}
        handleUpdatePressed={update}
      />
      <ResultListView messages={resultMessage} />
    </SafeAreaView>
  );
}
