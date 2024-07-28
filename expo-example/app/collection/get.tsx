import React, { useContext, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import ResultListView from '@/components/ResultsListView';
import DatabaseContext from '@/providers/DatabaseContext';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import DatabaseScopeCollectionActionForm from '@/components/DatabaseScopeCollectionActionForm';
import get from '@/service/collection/get';

export default function CollectionGetScreen() {
  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [scopeName, setScopeName] = useState<string>('');
  const [collectionName, setCollectionName] = useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('Get Collection', navigation, reset);

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
        const collection = await get(
          databases,
          databaseName,
          scopeName,
          collectionName
        );
        setResultsMessage((prev) => [
          ...prev,
          `Found Collection: <${collection.fullName()}> in Datbase <${databaseName}>`,
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
