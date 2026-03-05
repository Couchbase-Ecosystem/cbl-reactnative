import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import NativeCblSwiftModule from '../../../src/specs/NativeCblSwift';
import * as FileSystem from 'expo-file-system';

/**
 * Minimal Crash Diagnostic Test
 * 
 * Tests each native operation individually to identify which one causes the crash.
 */

export default function CrashDiagnostic() {
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const addLog = (line: string) => {
    console.log(line);
    setLog((prev) => [...prev, line]);
  };

  const getDocsDir = (): string => {
    let dir = FileSystem.documentDirectory || '';
    if (dir.startsWith('file://')) {
      dir = dir.substring(7);
    }
    return dir;
  };

  const testDatabaseOpen = async () => {
    setRunning(true);
    setLog([]);
    try {
      addLog('TEST 1: Opening database...');
      const dir = getDocsDir();
      const result = await NativeCblSwiftModule.database_Open({
        name: 'crash-test-db',
        directory: dir,
        encryptionKey: null,
      });
      addLog(`✅ Database opened: ${result.databaseUniqueName}`);
      
      addLog('TEST 1: Closing database...');
      await NativeCblSwiftModule.database_Close({ name: result.databaseUniqueName });
      addLog('✅ Database closed');
      
      Alert.alert('Success', 'Database open/close works!');
    } catch (error: any) {
      addLog(`❌ ERROR: ${error.message}`);
      Alert.alert('Error', error.message);
    } finally {
      setRunning(false);
    }
  };

  const testCreateCollection = async () => {
    setRunning(true);
    setLog([]);
    try {
      addLog('TEST 2: Opening database...');
      const dir = getDocsDir();
      const result = await NativeCblSwiftModule.database_Open({
        name: 'crash-test-db-2',
        directory: dir,
        encryptionKey: null,
      });
      addLog(`✅ Database opened: ${result.databaseUniqueName}`);
      
      addLog('TEST 2: Creating collection...');
      await NativeCblSwiftModule.collection_CreateCollection({
        name: result.databaseUniqueName,
        scopeName: '_default',
        collectionName: 'items',
      });
      addLog('✅ Collection created');
      
      addLog('TEST 2: Closing database...');
      await NativeCblSwiftModule.database_Close({ name: result.databaseUniqueName });
      addLog('✅ Database closed');
      
      Alert.alert('Success', 'Collection creation works!');
    } catch (error: any) {
      addLog(`❌ ERROR: ${error.message}`);
      Alert.alert('Error', error.message);
    } finally {
      setRunning(false);
    }
  };

  const testSaveSingleDoc = async () => {
    setRunning(true);
    setLog([]);
    try {
      addLog('TEST 3: Opening database...');
      const dir = getDocsDir();
      const result = await NativeCblSwiftModule.database_Open({
        name: 'crash-test-db-3',
        directory: dir,
        encryptionKey: null,
      });
      addLog(`✅ Database opened: ${result.databaseUniqueName}`);
      
      addLog('TEST 3: Creating collection...');
      await NativeCblSwiftModule.collection_CreateCollection({
        name: result.databaseUniqueName,
        scopeName: '_default',
        collectionName: 'items',
      });
      addLog('✅ Collection created');
      
      addLog('TEST 3: Saving single document (100B)...');
      const doc = { id: 1, name: 'Test', value: 'x'.repeat(50) };
      await NativeCblSwiftModule.collection_Save({
        name: result.databaseUniqueName,
        scopeName: '_default',
        collectionName: 'items',
        id: 'doc_1',
        document: JSON.stringify(doc),
        blobs: '',
        concurrencyControl: -9999,
      });
      addLog('✅ Document saved');
      
      addLog('TEST 3: Closing database...');
      await NativeCblSwiftModule.database_Close({ name: result.databaseUniqueName });
      addLog('✅ Database closed');
      
      Alert.alert('Success', 'Single document save works!');
    } catch (error: any) {
      addLog(`❌ ERROR: ${error.message}`);
      Alert.alert('Error', error.message);
    } finally {
      setRunning(false);
    }
  };

  const testSave100Docs = async () => {
    setRunning(true);
    setLog([]);
    try {
      addLog('TEST 4: Opening database...');
      const dir = getDocsDir();
      const result = await NativeCblSwiftModule.database_Open({
        name: 'crash-test-db-4',
        directory: dir,
        encryptionKey: null,
      });
      addLog(`✅ Database opened: ${result.databaseUniqueName}`);
      
      addLog('TEST 4: Creating collection...');
      await NativeCblSwiftModule.collection_CreateCollection({
        name: result.databaseUniqueName,
        scopeName: '_default',
        collectionName: 'items',
      });
      addLog('✅ Collection created');
      
      addLog('TEST 4: Saving 100 documents (100B each) in a loop...');
      for (let i = 0; i < 100; i++) {
        const doc = { id: i, name: `Test${i}`, value: 'x'.repeat(50) };
        await NativeCblSwiftModule.collection_Save({
          name: result.databaseUniqueName,
          scopeName: '_default',
          collectionName: 'items',
          id: `doc_${i}`,
          document: JSON.stringify(doc),
          blobs: '',
          concurrencyControl: -9999,
        });
        if (i % 25 === 0) {
          addLog(`  Progress: ${i}/100 documents saved`);
        }
      }
      addLog('✅ All 100 documents saved');
      
      addLog('TEST 4: Closing database...');
      await NativeCblSwiftModule.database_Close({ name: result.databaseUniqueName });
      addLog('✅ Database closed');
      
      Alert.alert('Success', '100 document saves work!');
    } catch (error: any) {
      addLog(`❌ ERROR: ${error.message}`);
      Alert.alert('Error', error.message);
    } finally {
      setRunning(false);
    }
  };

  const testBatchSave = async () => {
    setRunning(true);
    setLog([]);
    try {
      addLog('TEST 5: Opening database...');
      const dir = getDocsDir();
      const result = await NativeCblSwiftModule.database_Open({
        name: 'crash-test-db-5',
        directory: dir,
        encryptionKey: null,
      });
      addLog(`✅ Database opened: ${result.databaseUniqueName}`);
      
      addLog('TEST 5: Creating collection...');
      await NativeCblSwiftModule.collection_CreateCollection({
        name: result.databaseUniqueName,
        scopeName: '_default',
        collectionName: 'items',
      });
      addLog('✅ Collection created');
      
      addLog('TEST 5: Preparing batch of 100 documents (100B each)...');
      const batch = [];
      for (let i = 0; i < 100; i++) {
        const doc = { id: i, name: `Test${i}`, value: 'x'.repeat(50) };
        batch.push({ id: `doc_${i}`, data: JSON.stringify(doc) });
      }
      addLog(`✅ Batch prepared (${batch.length} docs)`);
      
      addLog('TEST 5: Calling BatchSave...');
      const batchResult = await NativeCblSwiftModule.collection_BatchSave({
        name: result.databaseUniqueName,
        scopeName: '_default',
        collectionName: 'items',
        docsJson: JSON.stringify(batch),
      });
      addLog(`✅ BatchSave completed: ${batchResult.saved} docs saved`);
      
      addLog('TEST 5: Closing database...');
      await NativeCblSwiftModule.database_Close({ name: result.databaseUniqueName });
      addLog('✅ Database closed');
      
      Alert.alert('Success', 'Batch save works!');
    } catch (error: any) {
      addLog(`❌ ERROR: ${error.message}`);
      Alert.alert('Error', error.message);
    } finally {
      setRunning(false);
    }
  };

  const clearLog = () => {
    setLog([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Crash Diagnostic Tests</Text>
        <Text style={styles.subtitle}>Run each test to identify the crash point</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, running && styles.buttonDisabled]}
          onPress={testDatabaseOpen}
          disabled={running}
        >
          <Text style={styles.buttonText}>Test 1: DB Open/Close</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, running && styles.buttonDisabled]}
          onPress={testCreateCollection}
          disabled={running}
        >
          <Text style={styles.buttonText}>Test 2: Create Collection</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, running && styles.buttonDisabled]}
          onPress={testSaveSingleDoc}
          disabled={running}
        >
          <Text style={styles.buttonText}>Test 3: Save 1 Doc (100B)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, running && styles.buttonDisabled]}
          onPress={testSave100Docs}
          disabled={running}
        >
          <Text style={styles.buttonText}>Test 4: Save 100 Docs (Loop)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, running && styles.buttonDisabled]}
          onPress={testBatchSave}
          disabled={running}
        >
          <Text style={styles.buttonText}>Test 5: BatchSave 100 Docs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearLog}
        >
          <Text style={styles.buttonText}>Clear Log</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.logContainer} contentContainerStyle={styles.logContent}>
        {log.length === 0 ? (
          <Text style={styles.placeholder}>Run a test to see the output here</Text>
        ) : (
          log.map((line, idx) => (
            <Text key={idx} style={styles.logLine}>
              {line}
            </Text>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#D32F2F',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#FFCDD2',
    marginTop: 4,
  },
  buttonContainer: {
    padding: 12,
    gap: 8,
  },
  button: {
    backgroundColor: '#1976D2',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  clearButton: {
    backgroundColor: '#757575',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    margin: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  logContent: {
    padding: 12,
  },
  placeholder: {
    color: '#9E9E9E',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 40,
  },
  logLine: {
    fontSize: 12,
    fontFamily: 'Courier',
    color: '#212121',
    marginBottom: 4,
  },
});
