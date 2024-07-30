import React, { useContext, useState } from 'react';
import { ScrollView, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import ResultListView from '@/components/ResultsListView';
import DatabaseContext from '@/providers/DatabaseContext';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import DatabaseScopeCollectionForm from '@/components/DatabaseScopeCollectionForm';
import HeaderView from '@/components/HeaderView';
import DocumentEditorActionForm from '@/components/DocumentEditorActionForm';
import save from '@/service/document/save';

export default function DocumentEditorScreen() {
  //database stuff
  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [scopeName, setScopeName] = useState<string>('');
  const [collectionName, setCollectionName] = useState<string>('');
  //document stuff
  const [documentId, setDocumentId] = useState<string>('');
  const [document, setDocument] = useState<string>('');
  //results
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  //drawing stuff
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('Document Editor', navigation, reset);

  function reset() {
    setDatabaseName('');
    setScopeName('');
    setCollectionName('');
    setDocumentId('');
    setDocument('');
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
        if (document === '') {
          setResultsMessage((prev) => [
            ...prev,
            'Error: Document in string JSON format is required',
          ]);
          return;
        }
        const resultsMessage = await save(
          databases,
          databaseName,
          scopeName,
          collectionName,
          documentId,
          document
        );
        if (resultsMessage !== undefined) {
          setResultsMessage((prev) => [...prev, resultsMessage]);
        } else {
          setResultsMessage((prev) => [
            ...prev,
            'Error: Document could not be saved',
          ]);
        }
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
        <DocumentEditorActionForm
          documentId={documentId}
          setDocumentId={setDocumentId}
          document={document}
          setDocument={setDocument}
          handleUpdatePressed={update}
        />
        <ResultListView messages={resultMessage} />
      </ScrollView>
    </SafeAreaView>
  );
}
