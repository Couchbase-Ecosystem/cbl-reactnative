import React, { useState } from 'react';
import { SafeAreaView, Text, Button, ScrollView } from 'react-native';
import { View } from '@/components/Themed/Themed';
import { 
  Database, 
  DatabaseConfiguration,
  Replicator, 
  ReplicatorConfiguration,
  URLEndpoint,
  BasicAuthenticator,
  MutableDocument
} from 'cbl-reactnative';
import getFileDefaultPath from '@/service/file/getFileDefaultPath';

export default function ReplicatorListenersScreen() {
  const [listOfLogs, setListOfLogs] = useState<string[]>([]);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);

  const [database, setDatabase] = useState<Database | null>(null);
  const [replicator, setReplicator] = useState<Replicator | null>(null);
  
  const [statusToken, setStatusToken] = useState<string>('');
  const [documentToken, setDocumentToken] = useState<string>('');
  const [listOfDocuments, setListOfDocuments] = useState<string[]>([]);

  // Configuration for Sync Gateway
  const SYNC_GATEWAY_URL = "wss://nasm0fvdr-jnehnb.apps.cloud.couchbase.com:4984/testendpoint";
  const USERNAME = "jayantdhingra";
  const PASSWORD = "f9yu5QT4B5jpZep@";

  const openDatabase = async () => {
    try {
      setListOfLogs(prev => [...prev, 'Opening Database']);
      const databaseName = 'replicator_test_db';
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

  const createReplicator = async () => {
    try {
      setListOfLogs(prev => [...prev, 'Creating Replicator with Default Collection']);
      
      if (!database) {
        setErrorLogs(prev => [...prev, 'Database not opened yet']);
        return;
      }

      const defaultCollection = await database.defaultCollection();
      
      if (!defaultCollection) {
        setErrorLogs(prev => [...prev, 'Could not get default collection']);
        return;
      }

      const endpoint = new URLEndpoint(SYNC_GATEWAY_URL);
      const replicatorConfig = new ReplicatorConfiguration(endpoint);
      
      replicatorConfig.setAuthenticator(new BasicAuthenticator(USERNAME, PASSWORD));
      replicatorConfig.setContinuous(true);
      replicatorConfig.setAcceptOnlySelfSignedCerts(false);  
      replicatorConfig.addCollection(defaultCollection);
      
      const replicator = await Replicator.create(replicatorConfig);
      setReplicator(replicator);
      setListOfLogs(prev => [...prev, `Replicator created with ID: ${replicator.getId()}`]);
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error creating replicator: ${error.message}`]);
    }
  }

  const startStatusChangeListener = async () => {
    try {
      if (!replicator) {
        setErrorLogs(prev => [...prev, 'Replicator not created yet']);
        return;
      }

      setListOfLogs(prev => [...prev, 'Starting status change listener']);
      
      const token = await replicator.addChangeListener((change) => {
        const date = new Date().toISOString();
        const status = change.status;
        
        // Status object has methods (it's a ReplicatorStatus instance in the listener)
        const activityLevel = status.getActivityLevel();
        const progress = status.getProgress();
        const error = status.getError();

        let logMessage = `${date} Status: ${activityLevel}`;
        
        if (progress) {
          logMessage += ` | Progress: ${progress.getCompleted()}/${progress.getTotal()}`;
        }
        
        if (error) {
          setErrorLogs(prev => [...prev, `${date} Replicator Error: ${error}`]);
        }

        setListOfLogs(prev => [...prev, logMessage]);
      });

      setStatusToken(token);
      setListOfLogs(prev => [...prev, `Status change listener started with token: ${token}`]);
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error starting status listener: ${error.message}`]);
    }
  }

  const stopStatusChangeListener = async () => {
    try {
      if (replicator && statusToken) {
        await replicator.removeChangeListener(statusToken);
        setStatusToken('');
        setListOfLogs(prev => [...prev, 'Status change listener stopped']);
      } else {
        setErrorLogs(prev => [...prev, 'No active status listener to stop']);
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error stopping status listener: ${error.message}`]);
    }
  }

  const startDocumentChangeListener = async () => {
    try {
      if (!replicator) {
        setErrorLogs(prev => [...prev, 'Replicator not created yet']);
        return;
      }

      setListOfLogs(prev => [...prev, 'Starting document change listener']);
      
      const token = await replicator.addDocumentChangeListener((documentReplication) => {
        const date = new Date().toISOString();
        const docs = documentReplication.documents;
        const direction = documentReplication.isPush ? 'PUSH' : 'PULL';
        
        docs.forEach(doc => {
          const flags = doc.flags ? doc.flags.join(', ') : 'none';
          const error = doc.error ? ` | Error: ${doc.error}` : '';
          const logMessage = `${date} ${direction} - Scope: ${doc.scopeName}, Collection: ${doc.collectionName}, ID: ${doc.id}, Flags: [${flags}]${error}`;
          setListOfLogs(prev => [...prev, logMessage]);
        });
      });

      setDocumentToken(token);
      setListOfLogs(prev => [...prev, `Document change listener started with token: ${token}`]);
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error starting document listener: ${error.message}`]);
    }
  }

  const stopDocumentChangeListener = async () => {
    try {
      if (replicator && documentToken) {
        await replicator.removeChangeListener(documentToken);
        setDocumentToken('');
        setListOfLogs(prev => [...prev, 'Document change listener stopped']);
      } else {
        setErrorLogs(prev => [...prev, 'No active document listener to stop']);
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error stopping document listener: ${error.message}`]);
    }
  }

  const startReplicator = async () => {
    try {
      if (replicator) {
        setListOfLogs(prev => [...prev, 'Starting replicator']);
        await replicator.start(false);
        setListOfLogs(prev => [...prev, 'Replicator started']);
      } else {
        setErrorLogs(prev => [...prev, 'Replicator not created yet']);
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error starting replicator: ${error.message}`]);
    }
  }

  const stopReplicator = async () => {
    try {
      if (replicator) {
        setListOfLogs(prev => [...prev, 'Stopping replicator']);
        await replicator.stop();
        setListOfLogs(prev => [...prev, 'Replicator stopped']);
      } else {
        setErrorLogs(prev => [...prev, 'Replicator not created yet']);
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error stopping replicator: ${error.message}`]);
    }
  }

  const createDocument = async () => {
    setListOfLogs(prev => [...prev, 'Creating Document']);
    try {
      const defaultCollection = await database?.defaultCollection();
      
      if (!defaultCollection) {
        setErrorLogs(prev => [...prev, 'Could not get default collection']);
        return;
      }

      const doc = new MutableDocument();
      doc.setString('type', 'test-replication');
      doc.setString('name', `Test Doc ${Date.now()}`);
      doc.setString('description', 'This document should replicate to server');
      doc.setNumber('value', Math.floor(Math.random() * 1000));
      doc.setDate('createdAt', new Date());

      await defaultCollection.save(doc);
      setListOfLogs(prev => [...prev, `Document created with ID: ${doc.getId()}`]);
      setListOfDocuments(prev => [...prev, doc.getId()]);
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error creating document: ${error.message}`]);
    }
  }

  const getReplicatorStatus = async () => {
    try {
      if (replicator) {
        const status: any = await replicator.getStatus();
        
        // Status is returned as a plain object from native, not a ReplicatorStatus instance
        const activityLevel = status.activityLevel;
        const progress = status.progress;
        const error = status.error;

        let statusMessage = `Current Status: ${activityLevel}`;
        if (progress) {
          statusMessage += ` | Progress: ${progress.completed}/${progress.total}`;
        }
        if (error) {
          statusMessage += ` | Error: ${error}`;
        }

        setListOfLogs(prev => [...prev, statusMessage]);
      } else {
        setErrorLogs(prev => [...prev, 'Replicator not created yet']);
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error getting status: ${error.message}`]);
    }
  }

  return (
    <SafeAreaView>
      <ScrollView style={{ padding: 10 }}>
        <View style={{ padding: 10 }}>
         

          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Replicator Listeners Test
          </Text>
          
          <Text style={{ marginBottom: 10, fontWeight: 'bold' }}>Setup Steps:</Text>
          <Button title="1. Open Database" onPress={() => openDatabase()} />
          <Button title="2. Create Replicator (uses default collection)" onPress={() => createReplicator()} />
          
          <View style={{ height: 20 }} />
          
          <Text style={{ marginBottom: 10, fontWeight: 'bold' }}>Listener Controls:</Text>
          <Button 
            title="Start Status Change Listener" 
            color="#4CAF50"
            onPress={() => startStatusChangeListener()} 
            disabled={!!statusToken}
          />
          <Button 
            title="Stop Status Change Listener" 
            color="#f44336"
            onPress={() => stopStatusChangeListener()} 
            disabled={!statusToken}
          />
          <Button 
            title="Start Document Change Listener" 
            color="#2196F3"
            onPress={() => startDocumentChangeListener()} 
            disabled={!!documentToken}
          />
          <Button 
            title="Stop Document Change Listener" 
            color="#FF9800"
            onPress={() => stopDocumentChangeListener()} 
            disabled={!documentToken}
          />
          
          <View style={{ height: 20 }} />
          
          <Text style={{ marginBottom: 10, fontWeight: 'bold' }}>Replicator Controls:</Text>
          <Button title="Start Replicator" color="#9C27B0" onPress={() => startReplicator()} />
          <Button title="Stop Replicator" color="#795548" onPress={() => stopReplicator()} />
          <Button title="Get Replicator Status" onPress={() => getReplicatorStatus()} />
          
          <View style={{ height: 20 }} />
          
          <Text style={{ marginBottom: 10, fontWeight: 'bold' }}>Test Actions:</Text>
          <Button title="Create Document" onPress={() => createDocument()} />
          
          <View style={{ height: 20 }} />
          
          <Button 
            title="CLEAR LOGS" 
            color="red" 
            onPress={() => {setListOfLogs([]); setErrorLogs([])}} 
          />

          <View style={{ height: 20 }} />

          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
            Active Listeners:
          </Text>
          <Text>Status Listener: {statusToken ? '✅ Active' : '❌ Inactive'}</Text>
          <Text>Document Listener: {documentToken ? '✅ Active' : '❌ Inactive'}</Text>

          <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 10 }}>
            Documents Created: {listOfDocuments.length}
          </Text>

          {listOfDocuments.length > 0 && (
            <View style={{ marginBottom: 10 }}>
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

          <View style={{ padding: 10, backgroundColor: '#f5f5f5', borderRadius: 5 }}>
            {listOfLogs.map((log, index) => (
              <Text key={index} style={{ fontSize: 12, marginBottom: 5 }}>
                {log}
              </Text>
            ))}
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
