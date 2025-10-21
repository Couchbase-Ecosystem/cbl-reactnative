import React, { useState } from 'react';
import TestRunnerContainer from '@/components/TestRunnerContainer/TestRunnerContainer';
import { SafeAreaView, Text, Button, ScrollView} from 'react-native';
import { View } from '@/components/Themed/Themed';
import { 
    Database, 
    DatabaseConfiguration,
    Replicator, 
    ReplicatorConfiguration,
    URLEndpoint,
    BasicAuthenticator,
    SessionAuthenticator,
    ReplicatorType,
    Collection,
  MutableDocument, 
  Document,
  ConcurrencyControl 
  } from 'cbl-reactnative';import getFileDefaultPath from '@/service/file/getFileDefaultPath';

export default function DocumentChangeListenerScreen() {

   // open a database
  // create a collection
  // add a collecion change listener



  const [listOfLogs, setListOfLogs] = useState<string[]>([]);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);

  const [database, setDatabase] = useState<Database | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [replicator, setReplicator] = useState<Replicator | null>(null);

  const [listOfDocuments, setListOfDocuments] = useState<string[]>([]);

  const [token, setToken] = useState<string>('');


 
  const openDatabase = async () => {
    try {
      setListOfLogs(prev => [...prev, 'Opening Database']);  // ✅ Use prev
      const databaseName = 'databse_name_random';
      const directory = await getFileDefaultPath();
      const dbConfig = new DatabaseConfiguration();
      const database = new Database(databaseName, dbConfig);
      await database.open();
      setListOfLogs(prev => [...prev, `Database opened with name: ${database.getName()} at default directory`]);  // ✅ Use prev
      setDatabase(database);
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error opening database: ${error.message}`]);  // ✅ Use prev
    }
  }

  const createCollection = async () => {
    try {
      setListOfLogs(prev => [...prev, 'Creating Collection']);  // ✅ Use prev
      const collection = await database?.createCollection('test_collection');
      if (collection) {
        setCollection(collection);
        setListOfLogs(prev => [...prev, `Collection created`]);  // ✅ Use prev
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error creating collection: ${error.message}`]);
    }
  }

  const startDocumentChangeListener = async () => {
    try{
      if (collection) {
        setListOfLogs(prev => [...prev, `Starting document change listener`]);
        const token = await collection.addDocumentChangeListener(document?.getId() || '', (change) => {
          const dateTime = new Date().toISOString();
          setListOfLogs(prev => [...prev, 
            `${dateTime} - Document changed:`,
            `  Document ID: ${change.documentId}`,
            `  Collection: ${change.collection.name}`,
            `  Database: ${change.database.getName()}`
          ]);
        });
        setToken(token);
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error starting document change listener: ${error.message}`]);
    }
  }

  const stopDocumentChangeListener = async () => {
    try{
      if (collection) {
        if (token) {
          await collection.removeDocumentChangeListener(token);
          setToken('');
          setListOfLogs(prev => [...prev, `Document change listener stopped`]);
        } else {
          setErrorLogs(prev => [...prev, `No token found to stop document change listener`]);
        }
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error stopping document change listener: ${error.message}`]);
    }
  }
  



  const createDocument = async () => {
    setListOfLogs(prev => [...prev, 'Creating Document']);  // ✅ Use prev
    try {
    const doc = new MutableDocument()
    // const defaultCollection = await database?.defaultCollection();


    doc.setString('name', 'Jayanthealthy')
    doc.setString('email', 'john@example.com')
    doc.setString('phone', '1234567890')
    doc.setString('address', '123 Main St, Anytown, USA')
    doc.setString('city', 'Anytown')
    doc.setString('state', 'CA')
    doc.setString('zip', '12345')
    doc.setNumber('age', 30)
    doc.setBoolean('isActive', true)
    doc.setDate('createdAt', new Date())
    doc.setArray('tags', ['tag1', 'tag2', 'tag3'])
    doc.setDictionary('address', {street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345'})
    

      await collection?.save(doc)
      setListOfLogs(prev => [...prev, `Document created`]);  // ✅ Use prev
      setDocument(doc);
      setListOfDocuments(prev => [...prev, doc.getId()]);
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error creating document: ${error.message}`]);  // ✅ Use prev
    }

  }

  const updateDocument = async () => {
    try{
      if (document) {
        const mutableDoc = MutableDocument.fromDocument(document as Document);
        mutableDoc.setString('name', 'Jayanthealthy updated');
        await collection?.save(mutableDoc);
        setListOfLogs(prev => [...prev, `Document updated`]);  // ✅ Use prev
        setDocument(mutableDoc);
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error updating document: ${error.message}`]);  // ✅ Use prev
    }
  }




  return (
    <SafeAreaView>
        <View style={{ padding: 10 }}>

        <Button title="Open Database" onPress={() => openDatabase()} />
        <Button title="Create Collection" onPress={() => createCollection()} />
        <Button title="Start Document Change Listener" onPress={() => startDocumentChangeListener()} />
        <Button title="Create Document" onPress={() => createDocument()} />
        <Button title="Update Document" onPress={() => updateDocument()} />
        <Button title="Stop Document Change Listener" onPress={() => stopDocumentChangeListener()} />
        <Button title="CLEAR LOGS" color="red" onPress={() => {setListOfLogs([]); setErrorLogs([])}} />


            <ScrollView style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 1 }}>

                {listOfDocuments.map((docId, index) => (
                    <View key={index} style={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                        <Text key={index}>Document ID: {docId}</Text>
                        {/* <Button title="Delete" color="red" onPress={() => deleteDocument(docId)} /> */}
                    </View>
                ))}

            </ScrollView>


<Text style={{ fontSize: 16, fontWeight: 'bold' , marginBottom: 10, marginTop: 50}}>Logs</Text>

            <ScrollView style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {listOfLogs.map((log, index) => (
                    <Text key={index}>- {log}</Text>
                ))}
            </ScrollView>
           


            <ScrollView style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {errorLogs.map((log, index) => (
                    <Text style={{ color: 'red' }} key={index}>- {log}</Text>
                ))}
            </ScrollView> 


            
            </View>


    </SafeAreaView>
  );
}