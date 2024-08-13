import React, { useContext, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import DatabaseScopeCollectionActionForm from '@/components/DatabaseScopeCollectionActionForm/DatabaseScopeCollectionActionForm';
import { CBLCollectionContainerProps } from '@/components/CBLCollectionActionContainer/CBLCollectionContainerProps.type';
import ResultListView from '@/components/ResultsListView/ResultsListView';
import { useStyleScheme } from '@/components/Themed/Themed';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import { useNavigation } from '@react-navigation/native';
import DatabaseContext from '@/providers/DatabaseContext';
import get from '@/service/collection/get';

export default function CBLCollectionActionContainer({
  screenTitle,
  handleUpdatePressed,
  handleResetPressed,
  children,
}: CBLCollectionContainerProps) {
  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [scopeName, setScopeName] = useState<string>('');
  const [collectionName, setCollectionName] = useState<string>('');
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
        const collection = await get(
          databases,
          databaseName,
          scopeName,
          collectionName
        );
        const resultMessages = await handleUpdatePressed(collection);
        setResultsMessage((prev) => [...prev, ...resultMessages]);
      } catch (error) {
        // @ts-ignore
        setResultsMessage((prev) => [...prev, error.message]);
      }
    }
  }

  function reset() {
    setDatabaseName('');
    setScopeName('');
    setCollectionName('');
    setResultsMessage([]);
    handleResetPressed();
  }
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <DatabaseScopeCollectionActionForm
          databaseName={databaseName}
          setDatabaseName={setDatabaseName}
          scopeName={scopeName}
          setScopeName={setScopeName}
          collectionName={collectionName}
          setCollectionName={setCollectionName}
          handleUpdatePressed={update}
        />
        {children && children}
        <ResultListView messages={resultMessage} />
      </ScrollView>
    </SafeAreaView>
  );
}
