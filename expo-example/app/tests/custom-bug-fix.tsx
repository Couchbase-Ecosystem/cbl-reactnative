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

export default function CustomBugFixScreen() {
  function reset() {}

  async function update(): Promise<string[]> {
    try {
      return [''];
    } catch (e) {
      // @ts-ignore
      return [error.message];
    }
  }

  const [listOfLogs, setListOfLogs] = useState<string[]>([]);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);

  const [database, setDatabase] = useState<Database | null>(null);
  const [replicator, setReplicator] = useState<Replicator | null>(null);

  const [listOfDocuments, setListOfDocuments] = useState<string[]>([]);


  // open a database
  // connect to sync gateway with default 
  // create a collection
  // create a document
  // delete the document
  // THE BUG IS THAT THE DOCUMENT IS NOT BEING DELETED from sync gateway but it is getting deleted from the database

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
  
  const connectToSyncGateway = async () => {
    setListOfLogs(prev => [...prev, 'Connecting to Sync Gateway']);  // ✅ Use prev
    const defaultCollection = await database?.defaultCollection();

    const syncGatewayUrl = "wss://nasm0fvdr-jnehnb.apps.cloud.couchbase.com:4984/testendpoint"
    const endpoint = new URLEndpoint(syncGatewayUrl);
    const username = "jayantdhingra"
    const password = "f9yu5QT4B5jpZep@"

    const replicatorConfig = new ReplicatorConfiguration(endpoint)
    replicatorConfig.setAuthenticator(new BasicAuthenticator(username, password))
    // replicatorConfig.setContinuous(true)
    replicatorConfig.setAcceptOnlySelfSignedCerts(false);

    
    if (defaultCollection) {
      replicatorConfig.addCollection(defaultCollection)
    }

    const replicator = await Replicator.create(replicatorConfig)

    replicator.addChangeListener((change) => {
        const status = change.status;

      setListOfLogs(prev => [...prev, `Replicator changed:, ${status}`]);  

      if (status.getError()) {
        setErrorLogs(prev => [...prev, `Replication error: ${status.getError()}`]);
      }

    })

    await replicator.start(false)
    setReplicator(replicator);

    setListOfLogs(prev => [...prev, `Replicator created`]);  // ✅ Use prev
  }


  const createDocument = async () => {
    setListOfLogs(prev => [...prev, 'Creating Document']);  // ✅ Use prev
    try {
    const doc = new MutableDocument()
    const defaultCollection = await database?.defaultCollection();


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
    

      await defaultCollection?.save(doc)
      setListOfLogs(prev => [...prev, `Document created`]);  // ✅ Use prev
      setListOfDocuments(prev => [...prev, doc.getId()]);
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error creating document: ${error.message}`]);  // ✅ Use prev
    }

  }


  const deleteDocument = async (docId: string) => {
    setListOfLogs(prev => [...prev, 'Deleting Document']);  // ✅ Use prev
    try {
        const defaultCollection = await database?.defaultCollection();
        const doc = await defaultCollection?.document(docId)
        if(doc){
          await defaultCollection?.deleteDocument(doc)
          setListOfDocuments(prev => prev.filter(id => id !== docId));
        setListOfLogs(prev => [...prev, `Document deleted`]);  // ✅ Use prev
        } else {
            setErrorLogs(prev => [...prev, `Document not found`]);  // ✅ Use prev
        }
        
    } catch (error) {
        // @ts-ignore
        setErrorLogs(prev => [...prev, `Error deleting document: ${error.message}`]);  // ✅ Use prev
    }
  }
 


  return (
    <SafeAreaView>
        <View style={{ padding: 10 }}>

        <Button title="Open Database" onPress={() => openDatabase()} />
        <Button title="Connect to Sync Gateway" onPress={() => connectToSyncGateway()} />
        <Button title="Create Document" onPress={() => createDocument()} />
        <Button title="CLEAR LOGS" color="red" onPress={() => {setListOfLogs([]); setErrorLogs([])}} />


            <ScrollView style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 1 }}>

                {listOfDocuments.map((docId, index) => (
                    <View key={index} style={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                        <Text key={index}>Document ID: {docId}</Text>
                        <Button title="Delete" color="red" onPress={() => deleteDocument(docId)} />
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