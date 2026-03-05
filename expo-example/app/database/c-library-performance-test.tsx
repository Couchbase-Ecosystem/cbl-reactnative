import React, { useState } from 'react';
import { SafeAreaView, View, Text, Button, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { useStyleScheme } from '@/components/Themed/Themed';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';

// Direct imports for Turbo Modules
let TurboDatabase: any = null;
let TurboCollection: any = null;

try {
  TurboDatabase = require('cbl-reactnative/src/specs/NativeCblDatabase').default;
  TurboCollection = require('cbl-reactnative/src/specs/NativeCblCollection').default;
} catch (e) {
  console.warn('Turbo modules not available:', e);
}

/**
 * C Library vs SDK Performance Test - FAIR COMPARISONS
 * 
 * This test ensures FAIR comparisons by matching calling patterns:
 * 
 * SECTION 1: SYNCHRONOUS vs SYNCHRONOUS (Fair)
 *   - Turbo Sync methods vs C Library Sync methods
 *   - Both execute directly on JS thread via JSI
 * 
 * SECTION 2: ASYNCHRONOUS vs ASYNCHRONOUS (Fair)
 *   - Turbo Async methods (with await) vs C Library with async wrapper
 *   - Both go through Promise/async machinery
 * 
 * This allows accurate measurement of:
 * - Pure implementation performance (sync vs sync)
 * - Async overhead impact on both implementations
 */
export default function CLibraryPerformanceTestScreen() {
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const styles = useStyleScheme();

  const addResult = (message: string) => {
    setResultsMessage((prev) => [...prev, message]);
  };

  const generateRandomDocument = (index: number) => {
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Jennifer'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    const cities = ['San Francisco', 'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];
    const states = ['CA', 'NY', 'IL', 'TX', 'AZ', 'WA'];
    
    return {
      firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
      lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
      email: `user${index}@example.com`,
      age: Math.floor(Math.random() * 50) + 20,
      address: {
        street: `${Math.floor(Math.random() * 9999)} Main St`,
        city: cities[Math.floor(Math.random() * cities.length)],
        state: states[Math.floor(Math.random() * states.length)],
        zipCode: String(Math.floor(Math.random() * 90000) + 10000),
        country: 'USA'
      },
      tags: ['customer', Math.random() > 0.5 ? 'premium' : 'standard'],
      metadata: { createdAt: new Date().toISOString(), version: 1 },
    };
  };

  const getDocumentsDirectory = (): string => {
    let dir = FileSystem.documentDirectory || '';
    if (dir.startsWith('file://')) {
      dir = dir.substring(7);
    }
    if (dir.endsWith('/')) {
      dir = dir.slice(0, -1);
    }
    return dir;
  };

  // Helper to wrap sync C library call in async for fair comparison
  const clibEchoAsync = async (data: string): Promise<string> => {
    return Promise.resolve(TurboCollection.clib_Echo(data));
  };

  const clibSaveDocumentAsync = async (collectionHandle: number, docId: string, json: string): Promise<boolean> => {
    return Promise.resolve(TurboCollection.clib_SaveDocument(collectionHandle, docId, json));
  };

  const clibGetDocumentAsync = async (collectionHandle: number, docId: string): Promise<string | null> => {
    return Promise.resolve(TurboCollection.clib_GetDocument(collectionHandle, docId));
  };

  const clibOpenDatabaseAsync = async (name: string, directory: string): Promise<number> => {
    return Promise.resolve(TurboCollection.clib_OpenDatabase(name, directory));
  };

  const clibCloseDatabaseAsync = async (handle: number): Promise<boolean> => {
    return Promise.resolve(TurboCollection.clib_CloseDatabase(handle));
  };

  /**
   * SECTION 1: SYNCHRONOUS ECHO COMPARISON (Fair)
   * Both use JSI sync calls - no async overhead
   */
  const runSyncEchoTest = async () => {
    const callCount = 10000;
    const testData = JSON.stringify({ id: 'test', value: 'hello world' });

    addResult('==========================================');
    addResult('SYNC vs SYNC: Echo Test');
    addResult('==========================================');
    addResult(`Calls: ${callCount} | Pattern: Synchronous JSI`);
    addResult('');

    // Turbo Sync Echo
    addResult('Turbo Module (Sync):');
    const turboSyncStart = performance.now();
    for (let i = 0; i < callCount; i++) {
      TurboCollection.collection_EchoSync(testData);
    }
    const turboSyncTime = performance.now() - turboSyncStart;
    const turboSyncPerCall = (turboSyncTime / callCount).toFixed(4);
    addResult(`  Total: ${turboSyncTime.toFixed(0)}ms | Per call: ${turboSyncPerCall}ms`);
    addResult(`  Throughput: ${Math.round((callCount / turboSyncTime) * 1000).toLocaleString()} calls/sec`);
    addResult('');

    // C Library Sync Echo
    addResult('C Library (Sync):');
    const clibSyncStart = performance.now();
    for (let i = 0; i < callCount; i++) {
      TurboCollection.clib_Echo(testData);
    }
    const clibSyncTime = performance.now() - clibSyncStart;
    const clibSyncPerCall = (clibSyncTime / callCount).toFixed(4);
    addResult(`  Total: ${clibSyncTime.toFixed(0)}ms | Per call: ${clibSyncPerCall}ms`);
    addResult(`  Throughput: ${Math.round((callCount / clibSyncTime) * 1000).toLocaleString()} calls/sec`);
    addResult('');

    // Comparison
    const syncSpeedup = (turboSyncTime / clibSyncTime).toFixed(2);
    const faster = Number(syncSpeedup) > 1 ? 'C Library' : 'Turbo';
    const ratio = Number(syncSpeedup) > 1 ? syncSpeedup : (1 / Number(syncSpeedup)).toFixed(2);
    addResult(`RESULT: ${faster} is ${ratio}x faster (sync vs sync)`);
    addResult('');

    return { turboSyncTime, clibSyncTime };
  };

  /**
   * SECTION 2: ASYNCHRONOUS ECHO COMPARISON (Fair)
   * Both use async/await pattern
   */
  const runAsyncEchoTest = async () => {
    const callCount = 10000;
    const testData = JSON.stringify({ id: 'test', value: 'hello world' });

    addResult('==========================================');
    addResult('ASYNC vs ASYNC: Echo Test');
    addResult('==========================================');
    addResult(`Calls: ${callCount} | Pattern: Async/Await`);
    addResult('');

    // Turbo Async Echo
    addResult('Turbo Module (Async):');
    const turboAsyncStart = performance.now();
    for (let i = 0; i < callCount; i++) {
      await TurboCollection.collection_Echo(testData);
    }
    const turboAsyncTime = performance.now() - turboAsyncStart;
    const turboAsyncPerCall = (turboAsyncTime / callCount).toFixed(4);
    addResult(`  Total: ${turboAsyncTime.toFixed(0)}ms | Per call: ${turboAsyncPerCall}ms`);
    addResult(`  Throughput: ${Math.round((callCount / turboAsyncTime) * 1000).toLocaleString()} calls/sec`);
    addResult('');

    // C Library Async Echo (wrapped)
    addResult('C Library (Async wrapper):');
    const clibAsyncStart = performance.now();
    for (let i = 0; i < callCount; i++) {
      await clibEchoAsync(testData);
    }
    const clibAsyncTime = performance.now() - clibAsyncStart;
    const clibAsyncPerCall = (clibAsyncTime / callCount).toFixed(4);
    addResult(`  Total: ${clibAsyncTime.toFixed(0)}ms | Per call: ${clibAsyncPerCall}ms`);
    addResult(`  Throughput: ${Math.round((clibAsyncTime / callCount) * 1000).toLocaleString()} calls/sec`);
    addResult('');

    // Comparison
    const asyncSpeedup = (turboAsyncTime / clibAsyncTime).toFixed(2);
    const faster = Number(asyncSpeedup) > 1 ? 'C Library' : 'Turbo';
    const ratio = Number(asyncSpeedup) > 1 ? asyncSpeedup : (1 / Number(asyncSpeedup)).toFixed(2);
    addResult(`RESULT: ${faster} is ${ratio}x faster (async vs async)`);
    addResult('');

    return { turboAsyncTime, clibAsyncTime };
  };

  /**
   * SECTION 3: SYNCHRONOUS Document Operations (Fair)
   * Note: SDK doesn't have sync document ops, so we compare C sync vs C sync baseline
   */
  const runSyncDocumentTest = async () => {
    const documentCount = 1000;
    const directory = getDocumentsDirectory();
    
    addResult('==========================================');
    addResult('SYNC: Document Operations (C Library)');
    addResult('==========================================');
    addResult(`Documents: ${documentCount} | Pattern: Synchronous`);
    addResult('(SDK has no sync document methods - C Library baseline only)');
    addResult('');

    let clibDbHandle = 0;
    let clibCollHandle = 0;

    try {
      // Setup
      clibDbHandle = TurboCollection.clib_OpenDatabase('sync-doc-test', directory);
      if (clibDbHandle === 0) {
        addResult('ERROR: Failed to open C library database');
        return null;
      }
      clibCollHandle = TurboCollection.clib_GetDefaultCollection(clibDbHandle);

      // C Library Sync Save
      addResult('C Library Save (Sync):');
      const clibSaveStart = performance.now();
      for (let i = 0; i < documentCount; i++) {
        const docData = generateRandomDocument(i);
        TurboCollection.clib_SaveDocument(clibCollHandle, `doc_${i}`, JSON.stringify(docData));
      }
      const clibSaveTime = performance.now() - clibSaveStart;
      addResult(`  ${documentCount} docs in ${clibSaveTime.toFixed(0)}ms`);
      addResult(`  Throughput: ${Math.round((documentCount / clibSaveTime) * 1000).toLocaleString()} docs/sec`);
      addResult('');

      // C Library Sync Read
      addResult('C Library Read (Sync):');
      const clibReadStart = performance.now();
      for (let i = 0; i < documentCount; i++) {
        TurboCollection.clib_GetDocument(clibCollHandle, `doc_${i}`);
      }
      const clibReadTime = performance.now() - clibReadStart;
      addResult(`  ${documentCount} docs in ${clibReadTime.toFixed(0)}ms`);
      addResult(`  Throughput: ${Math.round((documentCount / clibReadTime) * 1000).toLocaleString()} docs/sec`);
      addResult('');

      addResult(`TOTAL (Sync): ${(clibSaveTime + clibReadTime).toFixed(0)}ms`);
      addResult('');

      return { clibSaveTime, clibReadTime };

    } finally {
      if (clibDbHandle !== 0) {
        TurboCollection.clib_CloseDatabase(clibDbHandle);
        TurboCollection.clib_DeleteDatabase('sync-doc-test', directory);
      }
    }
  };

  /**
   * SECTION 4: ASYNCHRONOUS Document Operations (Fair)
   * Both use async/await pattern
   */
  const runAsyncDocumentTest = async () => {
    const documentCount = 1000;
    const directory = getDocumentsDirectory();
    
    addResult('==========================================');
    addResult('ASYNC vs ASYNC: Document Operations');
    addResult('==========================================');
    addResult(`Documents: ${documentCount} | Pattern: Async/Await`);
    addResult('');

    let turboDbName: string | null = null;
    let clibDbHandle = 0;
    let clibCollHandle = 0;

    try {
      // ========== TURBO SDK ASYNC ==========
      addResult('--- Turbo Module (Async) ---');
      
      // Setup
      const turboOpenResult = await TurboDatabase.database_Open('async-doc-test-turbo', null, null);
      turboDbName = turboOpenResult.databaseUniqueName;
      await TurboCollection.collection_CreateCollection('test-col', turboDbName, '_default');

      // Turbo Async Save
      addResult('Save:');
      const turboSaveStart = performance.now();
      for (let i = 0; i < documentCount; i++) {
        const docData = generateRandomDocument(i);
        await TurboCollection.collection_Save(
          JSON.stringify(docData), '[]', `doc_${i}`,
          turboDbName, '_default', 'test-col', -9999
        );
      }
      const turboSaveTime = performance.now() - turboSaveStart;
      addResult(`  ${documentCount} docs in ${turboSaveTime.toFixed(0)}ms (${Math.round((documentCount / turboSaveTime) * 1000)} docs/sec)`);

      // Turbo Async Read
      addResult('Read:');
      const turboReadStart = performance.now();
      for (let i = 0; i < documentCount; i++) {
        await TurboCollection.collection_GetDocument(`doc_${i}`, turboDbName, '_default', 'test-col');
      }
      const turboReadTime = performance.now() - turboReadStart;
      addResult(`  ${documentCount} docs in ${turboReadTime.toFixed(0)}ms (${Math.round((documentCount / turboReadTime) * 1000)} docs/sec)`);
      
      const turboTotal = turboSaveTime + turboReadTime;
      addResult(`Total: ${turboTotal.toFixed(0)}ms`);
      addResult('');

      // Cleanup Turbo
      await TurboDatabase.database_Close(turboDbName);
      await TurboDatabase.database_Delete('async-doc-test-turbo', directory);
      turboDbName = null;

      // ========== C LIBRARY ASYNC ==========
      addResult('--- C Library (Async wrapper) ---');
      
      // Setup
      clibDbHandle = await clibOpenDatabaseAsync('async-doc-test-c', directory);
      if (clibDbHandle === 0) {
        addResult('ERROR: Failed to open C library database');
        return null;
      }
      clibCollHandle = TurboCollection.clib_GetDefaultCollection(clibDbHandle);

      // C Library Async Save (wrapped)
      addResult('Save:');
      const clibSaveStart = performance.now();
      for (let i = 0; i < documentCount; i++) {
        const docData = generateRandomDocument(i);
        await clibSaveDocumentAsync(clibCollHandle, `doc_${i}`, JSON.stringify(docData));
      }
      const clibSaveTime = performance.now() - clibSaveStart;
      addResult(`  ${documentCount} docs in ${clibSaveTime.toFixed(0)}ms (${Math.round((documentCount / clibSaveTime) * 1000)} docs/sec)`);

      // C Library Async Read (wrapped)
      addResult('Read:');
      const clibReadStart = performance.now();
      for (let i = 0; i < documentCount; i++) {
        await clibGetDocumentAsync(clibCollHandle, `doc_${i}`);
      }
      const clibReadTime = performance.now() - clibReadStart;
      addResult(`  ${documentCount} docs in ${clibReadTime.toFixed(0)}ms (${Math.round((documentCount / clibReadTime) * 1000)} docs/sec)`);
      
      const clibTotal = clibSaveTime + clibReadTime;
      addResult(`Total: ${clibTotal.toFixed(0)}ms`);
      addResult('');

      // ========== COMPARISON ==========
      addResult('--- COMPARISON (Async vs Async) ---');
      const saveSpeedup = (turboSaveTime / clibSaveTime).toFixed(2);
      const readSpeedup = (turboReadTime / clibReadTime).toFixed(2);
      const totalSpeedup = (turboTotal / clibTotal).toFixed(2);

      addResult(`Save:  Turbo ${turboSaveTime.toFixed(0)}ms vs C ${clibSaveTime.toFixed(0)}ms (${Number(saveSpeedup) > 1 ? 'C' : 'Turbo'} ${Number(saveSpeedup) > 1 ? saveSpeedup : (1/Number(saveSpeedup)).toFixed(2)}x faster)`);
      addResult(`Read:  Turbo ${turboReadTime.toFixed(0)}ms vs C ${clibReadTime.toFixed(0)}ms (${Number(readSpeedup) > 1 ? 'C' : 'Turbo'} ${Number(readSpeedup) > 1 ? readSpeedup : (1/Number(readSpeedup)).toFixed(2)}x faster)`);
      addResult(`Total: Turbo ${turboTotal.toFixed(0)}ms vs C ${clibTotal.toFixed(0)}ms (${Number(totalSpeedup) > 1 ? 'C' : 'Turbo'} ${Number(totalSpeedup) > 1 ? totalSpeedup : (1/Number(totalSpeedup)).toFixed(2)}x faster)`);
      addResult('');

      return { turboSaveTime, turboReadTime, clibSaveTime, clibReadTime };

    } finally {
      if (turboDbName) {
        try { await TurboDatabase.database_Delete('async-doc-test-turbo', directory); } catch (e) {}
      }
      if (clibDbHandle !== 0) {
        await clibCloseDatabaseAsync(clibDbHandle);
        TurboCollection.clib_DeleteDatabase('async-doc-test-c', directory);
      }
    }
  };

  /**
   * Run All Fair Comparison Tests
   */
  const runAllTests = async () => {
    setIsLoading(true);
    setResultsMessage([]);

    try {
      addResult('==========================================');
      addResult('FAIR PERFORMANCE COMPARISON TEST');
      addResult('==========================================');
      addResult(`Platform: ${Platform.OS}`);
      addResult(`Turbo Module: ${TurboCollection ? 'YES' : 'NO'}`);
      addResult(`C Library: ${TurboCollection?.clib_Echo ? 'YES' : 'NO'}`);
      addResult('');
      addResult('Methodology:');
      addResult('- SYNC vs SYNC: Both use synchronous JSI calls');
      addResult('- ASYNC vs ASYNC: Both use async/await pattern');
      addResult('==========================================');
      addResult('');

      if (!TurboCollection || !TurboDatabase) {
        addResult('ERROR: Turbo modules required!');
        return;
      }

      if (typeof TurboCollection.clib_Echo !== 'function') {
        addResult('ERROR: C library methods not available!');
        return;
      }

      // Run all test sections
      await runSyncEchoTest();
      await runAsyncEchoTest();
      await runSyncDocumentTest();
      await runAsyncDocumentTest();

      addResult('==========================================');
      addResult('ALL TESTS COMPLETED');
      addResult('==========================================');
      addResult('');
      addResult('KEY INSIGHTS:');
      addResult('- Sync comparisons show pure implementation speed');
      addResult('- Async comparisons include Promise overhead');
      addResult('- C Library sync calls avoid thread dispatch');
      addResult('- Turbo async dispatches to background queue');

    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
      if (error.stack) {
        addResult(`Stack: ${error.stack.substring(0, 300)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => setResultsMessage([]);

  const copyResults = async () => {
    if (resultMessage.length === 0) {
      Alert.alert('No Results', 'Run a test first.');
      return;
    }
    await Clipboard.setStringAsync(resultMessage.join('\n'));
    Alert.alert('Copied!', 'Results copied to clipboard.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={localStyles.header}>
        <Text style={localStyles.title}>C Library vs SDK Performance</Text>
        <Text style={localStyles.mode}>Fair Comparisons (Sync vs Sync, Async vs Async)</Text>
        <Text style={localStyles.subtitle}>
          Compares matching calling patterns for accurate results
        </Text>
      </View>

      <View style={localStyles.buttons}>
        <View style={localStyles.buttonRow}>
          <View style={localStyles.buttonWrapper}>
            <Button
              title={isLoading ? "Running..." : "Run All Tests"}
              onPress={runAllTests}
              disabled={isLoading}
              color="#8b5cf6"
            />
          </View>
          <View style={localStyles.buttonWrapper}>
            <Button
              title="Copy"
              onPress={copyResults}
              disabled={isLoading || resultMessage.length === 0}
              color="#3b82f6"
            />
          </View>
          <View style={localStyles.buttonWrapper}>
            <Button
              title="Clear"
              onPress={clearResults}
              disabled={isLoading}
              color="#6b7280"
            />
          </View>
        </View>
        <View style={localStyles.buttonRow}>
          <View style={localStyles.buttonWrapper}>
            <Button
              title="Sync Echo"
              onPress={async () => {
                setIsLoading(true);
                setResultsMessage([]);
                await runSyncEchoTest();
                setIsLoading(false);
              }}
              disabled={isLoading}
              color="#10b981"
            />
          </View>
          <View style={localStyles.buttonWrapper}>
            <Button
              title="Async Echo"
              onPress={async () => {
                setIsLoading(true);
                setResultsMessage([]);
                await runAsyncEchoTest();
                setIsLoading(false);
              }}
              disabled={isLoading}
              color="#f59e0b"
            />
          </View>
          <View style={localStyles.buttonWrapper}>
            <Button
              title="Doc Ops"
              onPress={async () => {
                setIsLoading(true);
                setResultsMessage([]);
                await runSyncDocumentTest();
                await runAsyncDocumentTest();
                setIsLoading(false);
              }}
              disabled={isLoading}
              color="#ef4444"
            />
          </View>
        </View>
      </View>

      <View style={localStyles.resultsContainer}>
        <ScrollView style={localStyles.scrollView}>
          {resultMessage.map((message, index) => (
            <Text key={index} style={localStyles.resultText}>
              {message}
            </Text>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  mode: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#8b5cf6',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  buttons: {
    padding: 16,
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  buttonWrapper: {
    flex: 1,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  resultText: {
    fontFamily: 'monospace',
    fontSize: 11,
    marginBottom: 2,
    color: '#374151',
  },
});
