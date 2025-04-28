import React, { useContext, useState } from 'react';
import { Collection, MutableDocument } from 'cbl-reactnative';
import { useStyleScheme } from '@/components/Themed/Themed';
import { SafeAreaView } from 'react-native';
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
  const [collection, setCollection] = useState<Collection | null>(null);

  const styles = useStyleScheme();
  const navigation = useNavigation();
  useNavigationBarTitleOption('Collection Change Listener', navigation);
  const [informationMessages, setInformationMessages] = useState<string[]>([]);

  async function update(): Promise<void> {
    try {
      const database = databases[databaseName];
      if (database) {
        const collection = await database.collection(collectionName, scopeName);
        if (collection != null) {
          setCollection(collection);
          if (!isListenerAdded || token === '') {
            setInformationMessages((prev) => [
              ...prev,
              `::Information: Collection <${collection.name}> Starting Change listener...`,
            ]);
            const token = await collection.addChangeListener((change) => {
              for (const doc of change.documentIDs) {
                const dateString = new Date().toISOString();
                const newMessage = `${dateString}::Change:: Collection <${collection.name}> changed: ${doc}`;
                setInformationMessages((prev) => [...prev, newMessage]);
              }
            });

            const saveDocuments = async () => {
              const doc1 = new MutableDocument();
              const doc2 = new MutableDocument();
              doc1.setId('doc1');
              doc1.setString('name', 'Alice');
              doc2.setId('doc2');
              doc2.setString('name', 'tdbGamer');
              await collection.save(doc1);
              await collection.save(doc2);
            };
            await saveDocuments();
            setIsListenerAdded(true);
            setToken(token);
          }
        } else {
          setInformationMessages((prev) => [
            ...prev,
            `::ERROR: ${scopeName}.${collectionName} not found`,
          ]);
        }
      } else {
        setInformationMessages((prev) => [
          ...prev,
          `::ERROR: Database ${databaseName} not found`,
        ]);
      }
    } catch (error) {
      // @ts-ignore
      setInformationMessages((prev) => [...prev, `::ERROR: ${error.message}`]);
    }
  }

  async function stop(): Promise<void> {
    const database = databases[databaseName];
    if (database != null && isListenerAdded && collection) {
      await collection.removeChangeListener(token);
      setIsListenerAdded(false);
      setInformationMessages([
        `::Information: Removed Listening for changes on collection: ${collection.name}`,
      ]);
    }
    setToken('');
    setDatabaseName('');
    setCollectionName('');
    setScopeName('');
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
      <ResultListView useScrollView={true} messages={informationMessages} />
    </SafeAreaView>
  );
}
