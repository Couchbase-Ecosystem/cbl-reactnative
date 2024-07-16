import React, { useContext, useLayoutEffect, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import DatabaseNameForm from '@/components/DatabaseNameForm';
import MaterialCommunityIcons from '@expo/vector-icons/build/MaterialCommunityIcons';
import ResultListView from '@/components/ResultsListView';
import deleteDatabase from '@/service/database/deleteDatabase';
import DatabaseContext from '@/providers/DatabaseContext';

export default function DatabaseDeleteScreen() {
  const { databases, setDatabases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
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
        const results = await deleteDatabase(databases, databaseName);
        setResultsMessage((prev) => [...prev, results]);
      } catch (error) {
        setResultsMessage((prev) => [...prev, '' + error]);
      }
    }
  };

  return (
    <View style={styles.container}>
      <DatabaseNameForm
        setDatabaseName={setDatabaseName}
        databaseName={databaseName}
      />
      <ResultListView messages={resultMessage} />
    </View>
  );
}
