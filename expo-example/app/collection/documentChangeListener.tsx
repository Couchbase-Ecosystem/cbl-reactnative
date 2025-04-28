import React, { useContext, useState } from 'react';
import { Collection, MutableDocument } from 'cbl-reactnative';
import { useStyleScheme } from '@/components/Themed/Themed';
import { SafeAreaView, View } from 'react-native';
import ResultListView from '@/components/ResultsListView/ResultsListView';
import DatabaseScopeCollectionActionForm from '@/components/DatabaseScopeCollectionActionForm/DatabaseScopeCollectionActionForm';
import useNavigationBarTitleOption from '@/hooks/useNativgationBarTitle';
import { useNavigation } from '@react-navigation/native';
import DatabaseContext from '@/providers/DatabaseContext';
import { StyledTextInput } from '@/components/StyledTextInput/StyledTextInput';
import HeaderView from '@/components/HeaderView/HeaderView';

export default function CollectionStatusScreen() {
  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [scopeName, setScopeName] = useState<string>('');
  const [collectionName, setCollectionName] = useState<string>('');
  const [documentID, setDocumentID] = useState<string>('-1');

  const [isListenerAdded, setIsListenerAdded] = useState(false);
  const [token, setToken] = useState<string>('');
  const [collection, setCollection] = useState<Collection | null>(null);

  const styles = useStyleScheme();
  const navigation = useNavigation();
  useNavigationBarTitleOption(
    'Collection Document Change Listener',
    navigation
  );
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
              `::Information: Collection <${collection.name}> Starting Document Change listener...`,
            ]);
            const token = await collection.addDocumentChangeListener(
              documentID,
              (change) => {
                const dateString = new Date().toISOString();
                const newMessage = `${dateString}::Change:: Document with id: <${change.documentId}> changed in database: <${change.database.getName()}>, collection: <${change.collection.name}>`;
                setInformationMessages((prev) => [...prev, newMessage]);
              }
            );

            const saveDocuments = async () => {
              const doc1 = new MutableDocument();
              doc1.setId(documentID);
              doc1.setString('name', 'Alice');

              await collection.save(doc1);
            };
            await saveDocuments();

            const fetchedDoc = await collection.document(documentID);
            const mutableDoc = MutableDocument.fromDocument(fetchedDoc);
            mutableDoc.setString('key', 'value2');
            await collection.save(mutableDoc);

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
        `::Information: Removed Listening for changes od document: ${documentID} on collection: ${collection.name}`,
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
      <HeaderView name="Document ID" iconName="file-document" />
      <View style={styles.component}>
        <StyledTextInput
          autoCapitalize="none"
          placeholder="Document ID"
          onChangeText={(newText) => setDocumentID(newText)}
          defaultValue={documentID}
        />
      </View>
      <ResultListView useScrollView={true} messages={informationMessages} />
    </SafeAreaView>
  );
}
