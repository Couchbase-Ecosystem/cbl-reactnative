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
import deleteDocument from '@/service/document/deleteDocument';

export default function DeleteDocumentScreen() {
  //database stuff
  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [scopeName, setScopeName] = useState<string>('');
  const [collectionName, setCollectionName] = useState<string>('');
  const [documentId, setDocumentId] = useState<string>('');
  //results
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  //drawing stuff
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('Delete Document', navigation, reset);

  function reset() {
    setDatabaseName('');
    setScopeName('');
    setCollectionName('');
    setDocumentId('');
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
        const resultMessage = await deleteDocument(
          databases,
          databaseName,
          scopeName,
          collectionName,
          documentId
        );
        setResultsMessage((prev) => [...prev, '' + resultMessage]);
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
