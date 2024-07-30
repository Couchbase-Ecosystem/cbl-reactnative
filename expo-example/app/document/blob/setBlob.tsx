import React, { useContext, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import ResultListView from '@/components/ResultsListView';
import DatabaseContext from '@/providers/DatabaseContext';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import DatabaseScopeCollectionForm from '@/components/DatabaseScopeCollectionForm';
import HeaderView from '@/components/HeaderView';
import DocumentIdActionForm from '@/components/DocumentIdActionForm';
//import get from '@/service/document/get';

export default function DocumentSetBlobScreen() {
  //database stuff
  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [scopeName, setScopeName] = useState<string>('');
  const [collectionName, setCollectionName] = useState<string>('');
  const [documentId, setDocumentId] = useState<string>('');
  const [key, setKey] = useState<string>('');
  //results
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  //drawing stuff
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('Get Document Text Blob', navigation, reset);

  function reset() {
    setDatabaseName('');
    setScopeName('');
    setCollectionName('');
    setDocumentId('');
    setKey('');
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
        if (documentId === '') {
          setResultsMessage((prev) => [
            ...prev,
            'Error: Document ID is required',
          ]);
          return;
        }
        /*
        const doc = await get(
          databases,
          databaseName,
          scopeName,
          collectionName,
          documentId
        );
        if (doc !== undefined && doc !== null) {
          const json = JSON.stringify(doc.toDictionary());
          const resultsMessage = `Document <${documentId}> found with JSON: ${json}`;
          setResultsMessage((prev) => [...prev, resultsMessage]);
        } else {
          setResultsMessage((prev) => [
            ...prev,
            'Error: Document could not be retrieved',
          ]);
        }
         */
      } catch (error) {
        // @ts-ignore
        setResultsMessage((prev) => [...prev, error.message]);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <HeaderView name="Collection" iconName="bookshelf" />
        <DatabaseScopeCollectionForm
          databaseName={databaseName}
          setDatabaseName={setDatabaseName}
          scopeName={scopeName}
          setScopeName={setScopeName}
          collectionName={collectionName}
          setCollectionName={setCollectionName}
        />
        <DocumentIdActionForm
          documentId={documentId}
          setDocumentId={setDocumentId}
          handleUpdatePressed={update}
        />
        <ResultListView messages={resultMessage} />
      </ScrollView>
    </SafeAreaView>
  );
}
