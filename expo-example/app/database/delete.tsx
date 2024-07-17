import React, { useContext, useLayoutEffect, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import DatabaseNameActionForm from '@/components/DatabaseNameActionForm';
import ResultListView from '@/components/ResultsListView';
import deleteDatabase from '@/service/database/deleteDatabase';
import DatabaseContext from '@/providers/DatabaseContext';

import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';

export default function DatabaseDeleteScreen() {
  const { databases, setDatabases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('Delete Database', navigation, reset);

  function reset() {
    setDatabaseName('');
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
        const results = await deleteDatabase(
          databases,
          setDatabases,
          databaseName
        );
        setResultsMessage((prev) => [...prev, results]);
      } catch (error) {
        setResultsMessage((prev) => [...prev, '' + error]);
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
