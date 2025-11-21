import React, { useState } from 'react';
import { SafeAreaView, Text, Button, ScrollView } from 'react-native';
import { View } from '@/components/Themed/Themed';
import { 
  Database, 
  DatabaseConfiguration,
  Collection,
  MutableDocument,
  Query,
  ListenerToken
} from 'cbl-reactnative';
import getFileDefaultPath from '@/service/file/getFileDefaultPath';

export default function LiveQueryScreen() {
  const [listOfLogs, setListOfLogs] = useState<string[]>([]);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);

  const [database, setDatabase] = useState<Database | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [query, setQuery] = useState<Query | null>(null);
  const [token, setToken] = useState<ListenerToken | null>(null);
  const [listOfDocuments, setListOfDocuments] = useState<string[]>([]);

  const openDatabase = async () => {
    try {
      setListOfLogs(prev => [...prev, 'Opening Database']);
      const databaseName = 'live_query_test_db';
      const directory = await getFileDefaultPath();
      const dbConfig = new DatabaseConfiguration();
      const database = new Database(databaseName, dbConfig);
      await database.open();
      setListOfLogs(prev => [...prev, `Database opened with name: ${database.getName()}`]);
      setDatabase(database);
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error opening database: ${error.message}`]);
    }
  }

  const createCollection = async () => {
    try {
      setListOfLogs(prev => [...prev, 'Creating Collection']);
      const collection = await database?.createCollection('live_query_collection');
      if (collection) {
        setCollection(collection);
        setListOfLogs(prev => [...prev, `Collection created`]);
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error creating collection: ${error.message}`]);
    }
  }

  const startLiveQuery = async () => {
    try {
      if (database && collection) {
        setListOfLogs(prev => [...prev, `Starting live query`]);
        
        // Create a query that selects all documents where type = 'test'
        const queryString = `SELECT * FROM _default.live_query_collection WHERE type = 'test'`;
        const query = database.createQuery(queryString);
        
        const listenerToken = await query.addChangeListener((change) => {
          const date = new Date().toISOString();
          
          if (change.error) {
            setErrorLogs(prev => [...prev, `${date} Query error: ${change.error}`]);
            return;
          }

          if (change.results && change.results.length > 0) {
            const results = change.results.map((doc) => JSON.stringify(doc));
            setListOfLogs(prev => [
              ...prev, 
              `${date} Query results updated:`,
              `  Found ${change.results.length} document(s)`,
              ...results.map(r => `  ${r}`)
            ]);
          } else {
            setListOfLogs(prev => [...prev, `${date} Query results: No matching documents`]);
          }
        });

        setQuery(query);
        setToken(listenerToken);
        setListOfLogs(prev => [...prev, `Live query started successfully with token: ${listenerToken.getUuidToken()}`]);
      } else {
        setErrorLogs(prev => [...prev, `Database or Collection not initialized`]);
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error starting live query: ${error.message}`]);
    }
  }

  const stopLiveQueryOldAPI = async () => {
    try {
      if (query && token) {
        await query.removeChangeListener(token);
        setToken(null);
        setQuery(null);
        setListOfLogs(prev => [...prev, `✅ OLD API: Live query stopped via query.removeChangeListener()`]);
      } else {
        setErrorLogs(prev => [...prev, `No active query to stop`]);
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error stopping live query (OLD API): ${error.message}`]);
    }
  }

  const stopLiveQueryNewAPI = async () => {
    try {
      if (token) {
        await token.remove();
        setToken(null);
        setQuery(null);
        setListOfLogs(prev => [...prev, `✅ NEW API: Live query stopped via token.remove()`]);
      } else {
        setErrorLogs(prev => [...prev, `No active query to stop`]);
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error stopping live query (NEW API): ${error.message}`]);
    }
  }

  const createDocument = async () => {
    setListOfLogs(prev => [...prev, 'Creating Document']);
    try {
      const doc = new MutableDocument();
      doc.setString('type', 'test');
      doc.setString('name', 'Test Document');
      doc.setString('description', 'This is a test document for live query');
      doc.setNumber('value', Math.floor(Math.random() * 100));
      doc.setDate('createdAt', new Date());

      await collection?.save(doc);
      setListOfLogs(prev => [...prev, `Document created with ID: ${doc.getId()}`]);
      setListOfDocuments(prev => [...prev, doc.getId()]);
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error creating document: ${error.message}`]);
    }
  }

  const createNonMatchingDocument = async () => {
    setListOfLogs(prev => [...prev, 'Creating Non-Matching Document']);
    try {
      const doc = new MutableDocument();
      doc.setString('type', 'other');
      doc.setString('name', 'Non-Matching Document');
      doc.setString('description', 'This document should NOT trigger the live query');

      await collection?.save(doc);
      setListOfLogs(prev => [...prev, `Non-matching document created with ID: ${doc.getId()}`]);
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error creating non-matching document: ${error.message}`]);
    }
  }

  const updateDocument = async () => {
    try {
      if (listOfDocuments.length === 0) {
        setErrorLogs(prev => [...prev, 'No documents to update']);
        return;
      }

      const docId = listOfDocuments[listOfDocuments.length - 1];
      const doc = await collection?.document(docId);
      
      if (doc) {
        const mutableDoc = new MutableDocument(doc.getId(), doc.toDictionary());
        mutableDoc.setNumber('value', Math.floor(Math.random() * 100));
        mutableDoc.setDate('updatedAt', new Date());
        
        await collection?.save(mutableDoc);
        setListOfLogs(prev => [...prev, `Document ${docId} updated`]);
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error updating document: ${error.message}`]);
    }
  }

  const deleteDocument = async () => {
    try {
      if (listOfDocuments.length === 0) {
        setErrorLogs(prev => [...prev, 'No documents to delete']);
        return;
      }

      const docId = listOfDocuments[listOfDocuments.length - 1];
      const doc = await collection?.document(docId);
      
      if (doc) {
        await collection?.deleteDocument(doc);
        setListOfDocuments(prev => prev.filter(id => id !== docId));
        setListOfLogs(prev => [...prev, `Document ${docId} deleted`]);
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error deleting document: ${error.message}`]);
    }
  }

  return (
    <SafeAreaView>
      <ScrollView style={{ padding: 10 }}>
        <View style={{ padding: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Live Query Test (Query Change Listener)
          </Text>
          
          <Text style={{ marginBottom: 10, fontSize: 12, color: '#666' }}>
            Tests both OLD and NEW APIs for removing query change listeners
          </Text>
          
          <Text style={{ marginBottom: 10, fontWeight: 'bold' }}>
            Setup Steps:
          </Text>
          <Button title="1. Open Database" onPress={() => openDatabase()} />
          <Button title="2. Create Collection" onPress={() => createCollection()} />
          <Button title="3. Start Live Query" onPress={() => startLiveQuery()} color="#007AFF" />
          
          <View style={{ height: 20 }} />
          
          <Text style={{ marginBottom: 10, fontWeight: 'bold' }}>
            Test Actions:
          </Text>
          <Button title="Create Matching Document" onPress={() => createDocument()} color="#5856D6" />
          <Button title="Create Non-Matching Document" onPress={() => createNonMatchingDocument()} color="#AF52DE" />
          <Button title="Update Last Document" onPress={() => updateDocument()} color="#5AC8FA" />
          <Button title="Delete Last Document" onPress={() => deleteDocument()} color="#FF3B30" />
          
          <View style={{ height: 20 }} />
          
          <Text style={{ marginBottom: 10, fontWeight: 'bold' }}>
            Stop Live Query:
          </Text>
          <Button title="Stop Live Query (OLD API)" color="#FF9500" onPress={() => stopLiveQueryOldAPI()} />
          <Button title="Stop Live Query (NEW API - token.remove())" color="#34C759" onPress={() => stopLiveQueryNewAPI()} />
          
          <View style={{ height: 20 }} />
          
          <Button title="CLEAR LOGS" color="red" onPress={() => {setListOfLogs([]); setErrorLogs([]); setListOfDocuments([])}} />

          <View style={{ height: 20 }} />

          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
            Documents Created: {listOfDocuments.length}
          </Text>

          {listOfDocuments.length > 0 && (
            <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 5 }}>
              {listOfDocuments.map((docId, index) => (
                <Text key={index} style={{ fontSize: 12 }}>
                  • {docId}
                </Text>
              ))}
            </View>
          )}

          <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 10 }}>
            Logs
          </Text>

          <View style={{ padding: 10, backgroundColor: '#f5f5f5', borderRadius: 5, minHeight: 100 }}>
            {listOfLogs.length === 0 ? (
              <Text style={{ fontSize: 12, color: '#999' }}>No logs yet...</Text>
            ) : (
              listOfLogs.map((log, index) => (
                <Text key={index} style={{ fontSize: 12, marginBottom: 5 }}>
                  {log}
                </Text>
              ))
            )}
          </View>

          {errorLogs.length > 0 && (
            <>
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: 'red' }}>
                Errors
              </Text>
              <View style={{ padding: 10, backgroundColor: '#ffe6e6', borderRadius: 5 }}>
                {errorLogs.map((log, index) => (
                  <Text key={index} style={{ color: 'red', fontSize: 12, marginBottom: 5 }}>
                    {log}
                  </Text>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}