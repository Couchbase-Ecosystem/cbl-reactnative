import React, { useContext, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import ResultListView from '@/components/ResultsListView';
import DatabaseContext from '@/providers/DatabaseContext';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import DatabaseScopeCollectionActionForm from '@/components/DatabaseScopeCollectionActionForm';
import deleteCollection from '@/service/collection/delete';

export default function CollectionDeleteScreen() {
  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [scopeName, setScopeName] = useState<string>('');
  const [collectionName, setCollectionName] = useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('Delete Collection', navigation, reset);

  function reset() {
    setDatabaseName('');
    setScopeName('');
    setCollectionName('');
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
        await deleteCollection(
          databases,
          databaseName,
          scopeName,
          collectionName
        );
        setResultsMessage((prev) => [
          ...prev,
          `Deleted Collection: <${scopeName}.${collectionName}> in Database: <${databaseName}>`,
        ]);
      } catch (error) {
        // @ts-ignore
        setResultsMessage((prev) => [...prev, error.message]);
      }
    }
  };

  return (
    <View style={styles.container}>
      <DatabaseScopeCollectionActionForm
        databaseName={databaseName}
        setDatabaseName={setDatabaseName}
        scopeName={scopeName}
        setScopeName={setScopeName}
        collectionName={collectionName}
        setCollectionName={setCollectionName}
        handleUpdatePressed={update}
      />
      <ResultListView messages={resultMessage} />
    </View>
  );
}
