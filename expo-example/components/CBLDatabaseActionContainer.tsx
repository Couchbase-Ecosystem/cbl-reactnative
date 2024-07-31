import React, { useContext, useState } from 'react';
import DatabaseContext from '@/providers/DatabaseContext';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import { SafeAreaView } from 'react-native';
import ResultListView from '@/components/ResultsListView';
import { CBLDatabaseContainerProps } from '@/types/CBLDatabaseContainerProps.type';
import DatabaseNameActionForm from '@/components/DatabaseNameActionForm';
import { Database } from 'cbl-reactnative';

export default function CBLDatabaseActionContainer({
  screenTitle,
  handleUpdatePressed,
  handleResetPressed,
  children,
}: CBLDatabaseContainerProps) {
  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption(screenTitle, navigation, reset);

  async function update() {
    if (databaseName === '') {
      setResultsMessage((prev) => [
        ...prev,
        'Error: Database name is required',
      ]);
    } else {
      try {
        if (
          databaseName in databases &&
          databases[databaseName] instanceof Database
        ) {
          const database = databases[databaseName];
          const resultMessages = await handleUpdatePressed(database);
          setResultsMessage((prev) => [...prev, ...resultMessages]);
        } else {
          setResultsMessage((prev) => [
            ...prev,
            `Error: Database <${databaseName}> not found in context. Make sure database was opened first prior to trying to use it.`,
          ]);
        }
      } catch (error) {
        // @ts-ignore
        setResultsMessage((prev) => [...prev, error.message]);
      }
    }
  }

  function reset() {
    setDatabaseName('');
    setResultsMessage([]);
    handleResetPressed();
  }
  return (
    <SafeAreaView style={styles.container}>
      <DatabaseNameActionForm
        setDatabaseName={setDatabaseName}
        databaseName={databaseName}
        handleUpdatePressed={update}
      />
      {children && children}
      <ResultListView messages={resultMessage} />
    </SafeAreaView>
  );
}
