import React, { useContext, useState } from 'react';
import { MutableDocument, Query } from 'cbl-reactnative';
import { useStyleScheme } from '@/components/Themed/Themed';
import { Button, Text, SafeAreaView, View } from 'react-native';
import ResultListView from '@/components/ResultsListView/ResultsListView';
import DatabaseScopeCollectionActionForm from '@/components/DatabaseScopeCollectionActionForm/DatabaseScopeCollectionActionForm';
import useNavigationBarTitleOption from '@/hooks/useNativgationBarTitle';
import { useNavigation } from '@react-navigation/native';
import DatabaseContext from '@/providers/DatabaseContext';

export default function CollectionStatusScreen() {
  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [scopeName, setScopeName] = useState<string>('');
  const [collectionName, setCollectionName] = useState<string>('');

  const [isListenerAdded, setIsListenerAdded] = useState(false);
  const [token, setToken] = useState<string>('');
  const [query, setQuery] = useState<Query | null>(null);

  const styles = useStyleScheme();
  const navigation = useNavigation();
  useNavigationBarTitleOption('Collection Change Listener', navigation);
  const [informationMessages, setInformationMessages] = useState<string[]>([]);

  async function update(): Promise<void> {
    if (isListenerAdded && token !== '') {
      setInformationMessages(['::Information:: Listener already added.']);
      return;
    }

    const database = databases[databaseName];
    if (!database) {
      setInformationMessages((prev) => [
        ...prev,
        `::ERROR: Database ${databaseName} not found`,
      ]);
      return;
    }

    if (isListenerAdded || !!token) {
      setInformationMessages((prev) => [
        ...prev,
        `::Information: Query Change listener already started`,
      ]);
      return;
    }

    try {
      const collection = await database.collection(collectionName, scopeName);

      if (!collection) {
        setInformationMessages((prev) => [
          ...prev,
          `::ERROR: ${scopeName}.${collectionName} not found`,
        ]);
        return;
      }

      setInformationMessages((prev) => [
        ...prev,
        `::Information: Query Starting Change listener...`,
      ]);

      const queryString = `SELECT * FROM ${scopeName}.${collectionName} WHERE type = 'live-query'`;
      const query = database.createQuery(queryString);

      const listenerToken = await query.addChangeListener((change) => {
        const date = new Date().toISOString();
        if (change.error) {
          setInformationMessages((prev) => [
            ...prev,
            `${date} ::Change Listener Error:: ${change.error}`,
          ]);
          return;
        }

        if (change.results.length > 0) {
          const results = change.results.map((doc) => JSON.stringify(doc));
          setInformationMessages((prev) => [
            ...prev,
            `${date} ::Information:: Query changed with: `,
            ...results,
          ]);
        } else {
          setInformationMessages((prev) => [
            ...prev,
            `${date} ::Information:: No data in results`,
          ]);
        }
      });

      setQuery(query);
      setIsListenerAdded(true);
      setToken(listenerToken);
      setInformationMessages((prev) => [
        ...prev,
        '::Information:: Query Listening for changes',
      ]);
    } catch (error) {
      // @ts-ignore
      setInformationMessages((prev) => [...prev, `::ERROR: ${error.message}`]);
    }
  }

  async function addDocument() {
    if (!(databaseName in databases)) {
      setInformationMessages((prev) => [
        ...prev,
        '::Error:: Database is not set up',
      ]);
      return;
    }

    const database = databases[databaseName];
    const collection = await database.collection(collectionName, scopeName);

    if (!collection) {
      setInformationMessages((prev) => [
        ...prev,
        '::Error:: Database is not set up',
      ]);
      return;
    }

    const id = Math.floor(Math.random() * 1000).toString();
    const doc = new MutableDocument(`doc-${id}`);
    doc.setString('__id', id);
    doc.setString('type', 'live-query');
    await collection.save(doc);
    setInformationMessages((prev) => [
      ...prev,
      `::Information:: Document with id ${doc.getId()} added.`,
    ]);
  }

  async function stop(): Promise<void> {
    const database = databases[databaseName];
    if (database != null && isListenerAdded && query) {
      await query.removeChangeListener(token);
      setIsListenerAdded(false);
      setInformationMessages([`::Information: Removed change listener`]);
    }
    setToken('');
    setDatabaseName('');
    setCollectionName('');
    setScopeName('');
    setQuery(null);
  }

  return (
    <SafeAreaView style={styles.container}>
      <DatabaseScopeCollectionActionForm
        databaseName={databaseName}
        setDatabaseName={setDatabaseName}
        scopeName={scopeName}
        setScopeName={setScopeName}
        collectionName={collectionName}
        setCollectionName={setCollectionName}
        handleUpdatePressed={update}
        handleStopPressed={stop}
      />
      <View
        style={{ flexDirection: 'column', paddingTop: 10, paddingBottom: 10 }}
      >
        <Text style={styles.header}>Step 1. Run listener</Text>
        <Text style={styles.header}>
          Step 2. Tap "Create document" button to see changes
        </Text>
      </View>
      <Button onPress={addDocument} title="Create document" color="#428cff" />
      <ResultListView
        style={styles}
        useScrollView={true}
        messages={informationMessages}
      />
    </SafeAreaView>
  );
}
