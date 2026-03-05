import React, { useState } from 'react';
import { SafeAreaView, View, Text, Button, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import { useStyleScheme } from '@/components/Themed/Themed';

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
 * C Library Sync vs Turbo Sync - FAIR COMPARISON TEST
 * 
 * This test ensures FAIR comparisons by matching calling patterns:
 * 
 * SECTION 1: SYNCHRONOUS vs SYNCHRONOUS
 *   - Turbo EchoSync vs C Library clib_Echo
 *   - Both execute directly on JS thread via JSI
 *   - No async/await, no Promises, no thread dispatch
 * 
 * SECTION 2: ASYNCHRONOUS vs ASYNCHRONOUS
 *   - Turbo Echo (async) vs C Library clib_Echo (async wrapped)
 *   - Both go through Promise machinery
 * 
 * This provides accurate measurement of:
 * - Pure JSI performance (sync vs sync)
 * - Async overhead impact (async vs async)
 */
export default function CLibrarySyncTestScreen() {
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const styles = useStyleScheme();

  const addResult = (message: string) => {
    setResultsMessage((prev) => [...prev, message]);
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

  // Async wrappers for C library to enable fair async comparisons
  const clibEchoAsync = async (data: string): Promise<string> => {
    return Promise.resolve(TurboCollection.clib_Echo(data));
  };

  const clibOpenDatabaseAsync = async (name: string, directory: string): Promise<number> => {
    return Promise.resolve(TurboCollection.clib_OpenDatabase(name, directory));
  };

  const clibCloseDatabaseAsync = async (handle: number): Promise<boolean> => {
    return Promise.resolve(TurboCollection.clib_CloseDatabase(handle));
  };

  /**
   * Test 1: SYNC vs SYNC Echo Comparison
   */
  const runSyncEchoTest = async () => {
    addResult('==========================================');
    addResult('TEST 1: SYNC vs SYNC Echo');
    addResult('==========================================');
    addResult('Both use synchronous JSI - no async overhead');
    addResult('');

    const callCount = 10000;
    const testData = JSON.stringify({ id: 'test', value: 'hello world' });

    try {
      // ========================================
      // TURBO SYNC ECHO
      // ========================================
      addResult('Turbo Module (Sync - collection_EchoSync):');
      
      const turboStart = performance.now();
      for (let i = 0; i < callCount; i++) {
        TurboCollection.collection_EchoSync(testData);
      }
      const turboTime = performance.now() - turboStart;
      const turboPerCall = (turboTime / callCount).toFixed(4);
      
      addResult(`  ${callCount} calls in ${turboTime.toFixed(0)}ms`);
      addResult(`  Per call: ${turboPerCall}ms`);
      addResult(`  Throughput: ${Math.round((callCount / turboTime) * 1000).toLocaleString()} calls/sec`);
      addResult('');

      // ========================================
      // C LIBRARY SYNC ECHO
      // ========================================
      addResult('C Library (Sync - clib_Echo):');
      
      const clibStart = performance.now();
      for (let i = 0; i < callCount; i++) {
        TurboCollection.clib_Echo(testData);
      }
      const clibTime = performance.now() - clibStart;
      const clibPerCall = (clibTime / callCount).toFixed(4);
      
      addResult(`  ${callCount} calls in ${clibTime.toFixed(0)}ms`);
      addResult(`  Per call: ${clibPerCall}ms`);
      addResult(`  Throughput: ${Math.round((callCount / clibTime) * 1000).toLocaleString()} calls/sec`);
      addResult('');

      // ========================================
      // COMPARISON
      // ========================================
      addResult('SYNC vs SYNC RESULT:');
      const speedup = turboTime / clibTime;
      if (speedup > 1) {
        addResult(`  C Library is ${speedup.toFixed(2)}x FASTER`);
      } else {
        addResult(`  Turbo is ${(1/speedup).toFixed(2)}x FASTER`);
      }
      addResult(`  Time diff: ${Math.abs(turboTime - clibTime).toFixed(0)}ms`);
      addResult(`  Per-call: Turbo ${turboPerCall}ms vs C ${clibPerCall}ms`);
      addResult('');

    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
    }
  };

  /**
   * Test 2: ASYNC vs ASYNC Echo Comparison
   */
  const runAsyncEchoTest = async () => {
    addResult('==========================================');
    addResult('TEST 2: ASYNC vs ASYNC Echo');
    addResult('==========================================');
    addResult('Both use async/await - includes Promise overhead');
    addResult('');

    const callCount = 10000;
    const testData = JSON.stringify({ id: 'test', value: 'hello world' });

    try {
      // ========================================
      // TURBO ASYNC ECHO
      // ========================================
      addResult('Turbo Module (Async - collection_Echo):');
      
      const turboStart = performance.now();
      for (let i = 0; i < callCount; i++) {
        await TurboCollection.collection_Echo(testData);
      }
      const turboTime = performance.now() - turboStart;
      const turboPerCall = (turboTime / callCount).toFixed(4);
      
      addResult(`  ${callCount} calls in ${turboTime.toFixed(0)}ms`);
      addResult(`  Per call: ${turboPerCall}ms`);
      addResult(`  Throughput: ${Math.round((callCount / turboTime) * 1000).toLocaleString()} calls/sec`);
      addResult('');

      // ========================================
      // C LIBRARY ASYNC ECHO (wrapped)
      // ========================================
      addResult('C Library (Async wrapped - clib_Echo in Promise):');
      
      const clibStart = performance.now();
      for (let i = 0; i < callCount; i++) {
        await clibEchoAsync(testData);
      }
      const clibTime = performance.now() - clibStart;
      const clibPerCall = (clibTime / callCount).toFixed(4);
      
      addResult(`  ${callCount} calls in ${clibTime.toFixed(0)}ms`);
      addResult(`  Per call: ${clibPerCall}ms`);
      addResult(`  Throughput: ${Math.round((callCount / clibTime) * 1000).toLocaleString()} calls/sec`);
      addResult('');

      // ========================================
      // COMPARISON
      // ========================================
      addResult('ASYNC vs ASYNC RESULT:');
      const speedup = turboTime / clibTime;
      if (speedup > 1) {
        addResult(`  C Library is ${speedup.toFixed(2)}x FASTER`);
      } else {
        addResult(`  Turbo is ${(1/speedup).toFixed(2)}x FASTER`);
      }
      addResult(`  Time diff: ${Math.abs(turboTime - clibTime).toFixed(0)}ms`);
      addResult(`  Per-call: Turbo ${turboPerCall}ms vs C ${clibPerCall}ms`);
      addResult('');

    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
    }
  };

  /**
   * Test 3: Database Open/Close - ASYNC vs ASYNC
   */
  const runDatabaseOpsTest = async () => {
    addResult('==========================================');
    addResult('TEST 3: ASYNC vs ASYNC Database Ops');
    addResult('==========================================');
    addResult('Both use async/await for fair comparison');
    addResult('');

    const iterations = 10;
    const directory = getDocumentsDirectory();

    try {
      // ========================================
      // TURBO ASYNC DATABASE OPS
      // ========================================
      addResult('Turbo Module (Async):');
      
      const turboOpenTimes: number[] = [];
      const turboCloseTimes: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const openStart = performance.now();
        const result = await TurboDatabase.database_Open(`db-test-turbo-${i}`, null, null);
        turboOpenTimes.push(performance.now() - openStart);
        
        const closeStart = performance.now();
        await TurboDatabase.database_Close(result.databaseUniqueName);
        turboCloseTimes.push(performance.now() - closeStart);
        
        await TurboDatabase.database_Delete(`db-test-turbo-${i}`, directory);
      }
      
      const turboAvgOpen = turboOpenTimes.reduce((a, b) => a + b, 0) / iterations;
      const turboAvgClose = turboCloseTimes.reduce((a, b) => a + b, 0) / iterations;
      
      addResult(`  ${iterations} cycles`);
      addResult(`  Avg Open: ${turboAvgOpen.toFixed(2)}ms | Avg Close: ${turboAvgClose.toFixed(2)}ms`);
      addResult(`  Avg Total: ${(turboAvgOpen + turboAvgClose).toFixed(2)}ms`);
      addResult('');

      // ========================================
      // C LIBRARY ASYNC DATABASE OPS (wrapped)
      // ========================================
      addResult('C Library (Async wrapped):');
      
      const clibOpenTimes: number[] = [];
      const clibCloseTimes: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const openStart = performance.now();
        const handle = await clibOpenDatabaseAsync(`db-test-c-${i}`, directory);
        clibOpenTimes.push(performance.now() - openStart);
        
        const closeStart = performance.now();
        await clibCloseDatabaseAsync(handle);
        clibCloseTimes.push(performance.now() - closeStart);
        
        TurboCollection.clib_DeleteDatabase(`db-test-c-${i}`, directory);
      }
      
      const clibAvgOpen = clibOpenTimes.reduce((a, b) => a + b, 0) / iterations;
      const clibAvgClose = clibCloseTimes.reduce((a, b) => a + b, 0) / iterations;
      
      addResult(`  ${iterations} cycles`);
      addResult(`  Avg Open: ${clibAvgOpen.toFixed(2)}ms | Avg Close: ${clibAvgClose.toFixed(2)}ms`);
      addResult(`  Avg Total: ${(clibAvgOpen + clibAvgClose).toFixed(2)}ms`);
      addResult('');

      // ========================================
      // COMPARISON
      // ========================================
      addResult('ASYNC vs ASYNC RESULT:');
      const openSpeedup = turboAvgOpen / clibAvgOpen;
      const closeSpeedup = turboAvgClose / clibAvgClose;
      const totalSpeedup = (turboAvgOpen + turboAvgClose) / (clibAvgOpen + clibAvgClose);
      
      addResult(`  Open: ${openSpeedup > 1 ? 'C' : 'Turbo'} is ${openSpeedup > 1 ? openSpeedup.toFixed(2) : (1/openSpeedup).toFixed(2)}x faster`);
      addResult(`  Close: ${closeSpeedup > 1 ? 'C' : 'Turbo'} is ${closeSpeedup > 1 ? closeSpeedup.toFixed(2) : (1/closeSpeedup).toFixed(2)}x faster`);
      addResult(`  Total: ${totalSpeedup > 1 ? 'C' : 'Turbo'} is ${totalSpeedup > 1 ? totalSpeedup.toFixed(2) : (1/totalSpeedup).toFixed(2)}x faster`);
      addResult('');

    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
    }
  };

  /**
   * Test 4: Document Save/Read - ASYNC vs ASYNC
   */
  const runDocumentOpsTest = async () => {
    addResult('==========================================');
    addResult('TEST 4: ASYNC vs ASYNC Document Ops');
    addResult('==========================================');
    addResult('Both use async/await for fair comparison');
    addResult('');

    const documentCount = 1000;
    const directory = getDocumentsDirectory();
    const testDoc = JSON.stringify({
      firstName: 'John', lastName: 'Doe',
      email: 'john@example.com', age: 30,
    });

    let turboDbName: string | null = null;
    let clibDbHandle: number = 0;

    try {
      // ========================================
      // TURBO ASYNC DOCUMENT OPS
      // ========================================
      addResult('Turbo Module (Async):');
      
      const turboOpenResult = await TurboDatabase.database_Open('doc-ops-turbo', null, null);
      turboDbName = turboOpenResult.databaseUniqueName;
      await TurboCollection.collection_CreateCollection('test-col', turboDbName, '_default');
      
      // Save
      const turboSaveStart = performance.now();
      for (let i = 0; i < documentCount; i++) {
        await TurboCollection.collection_Save(testDoc, '[]', `doc_${i}`, turboDbName, '_default', 'test-col', -9999);
      }
      const turboSaveTime = performance.now() - turboSaveStart;
      
      // Read
      const turboReadStart = performance.now();
      for (let i = 0; i < documentCount; i++) {
        await TurboCollection.collection_GetDocument(`doc_${i}`, turboDbName, '_default', 'test-col');
      }
      const turboReadTime = performance.now() - turboReadStart;
      
      addResult(`  Save: ${turboSaveTime.toFixed(0)}ms (${Math.round((documentCount / turboSaveTime) * 1000)} docs/sec)`);
      addResult(`  Read: ${turboReadTime.toFixed(0)}ms (${Math.round((documentCount / turboReadTime) * 1000)} docs/sec)`);
      addResult(`  Total: ${(turboSaveTime + turboReadTime).toFixed(0)}ms`);
      addResult('');
      
      await TurboDatabase.database_Close(turboDbName);
      await TurboDatabase.database_Delete('doc-ops-turbo', directory);
      turboDbName = null;

      // ========================================
      // C LIBRARY ASYNC DOCUMENT OPS (wrapped)
      // ========================================
      addResult('C Library (Async wrapped):');
      
      clibDbHandle = await clibOpenDatabaseAsync('doc-ops-c', directory);
      const clibCollHandle = TurboCollection.clib_GetDefaultCollection(clibDbHandle);
      
      // Save (async wrapped)
      const clibSaveStart = performance.now();
      for (let i = 0; i < documentCount; i++) {
        await Promise.resolve(TurboCollection.clib_SaveDocument(clibCollHandle, `doc_${i}`, testDoc));
      }
      const clibSaveTime = performance.now() - clibSaveStart;
      
      // Read (async wrapped)
      const clibReadStart = performance.now();
      for (let i = 0; i < documentCount; i++) {
        await Promise.resolve(TurboCollection.clib_GetDocument(clibCollHandle, `doc_${i}`));
      }
      const clibReadTime = performance.now() - clibReadStart;
      
      addResult(`  Save: ${clibSaveTime.toFixed(0)}ms (${Math.round((documentCount / clibSaveTime) * 1000)} docs/sec)`);
      addResult(`  Read: ${clibReadTime.toFixed(0)}ms (${Math.round((documentCount / clibReadTime) * 1000)} docs/sec)`);
      addResult(`  Total: ${(clibSaveTime + clibReadTime).toFixed(0)}ms`);
      addResult('');
      
      await clibCloseDatabaseAsync(clibDbHandle);
      TurboCollection.clib_DeleteDatabase('doc-ops-c', directory);
      clibDbHandle = 0;

      // ========================================
      // COMPARISON
      // ========================================
      addResult('ASYNC vs ASYNC RESULT:');
      const saveSpeedup = turboSaveTime / clibSaveTime;
      const readSpeedup = turboReadTime / clibReadTime;
      const totalSpeedup = (turboSaveTime + turboReadTime) / (clibSaveTime + clibReadTime);
      
      addResult(`  Save: ${saveSpeedup > 1 ? 'C' : 'Turbo'} is ${saveSpeedup > 1 ? saveSpeedup.toFixed(2) : (1/saveSpeedup).toFixed(2)}x faster`);
      addResult(`  Read: ${readSpeedup > 1 ? 'C' : 'Turbo'} is ${readSpeedup > 1 ? readSpeedup.toFixed(2) : (1/readSpeedup).toFixed(2)}x faster`);
      addResult(`  Total: ${totalSpeedup > 1 ? 'C' : 'Turbo'} is ${totalSpeedup > 1 ? totalSpeedup.toFixed(2) : (1/totalSpeedup).toFixed(2)}x faster`);
      addResult('');

    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
    } finally {
      if (turboDbName) {
        try { await TurboDatabase.database_Delete('doc-ops-turbo', directory); } catch (e) {}
      }
      if (clibDbHandle !== 0) {
        try {
          TurboCollection.clib_CloseDatabase(clibDbHandle);
          TurboCollection.clib_DeleteDatabase('doc-ops-c', directory);
        } catch (e) {}
      }
    }
  };

  /**
   * Run all tests
   */
  const runAllTests = async () => {
    setIsLoading(true);
    setResultsMessage([]);
    
    try {
      addResult('==========================================');
      addResult('FAIR COMPARISON: SYNC vs SYNC, ASYNC vs ASYNC');
      addResult('==========================================');
      addResult(`Platform: ${Platform.OS}`);
      addResult(`Turbo Module: ${TurboCollection ? 'YES' : 'NO'}`);
      addResult(`C Library: ${TurboCollection?.clib_Echo ? 'YES' : 'NO'}`);
      addResult('');
      addResult('Methodology:');
      addResult('- SYNC tests: No await, no Promises');
      addResult('- ASYNC tests: Both use await/Promise');
      addResult('- This ensures apples-to-apples comparison');
      addResult('');
      
      if (!TurboCollection || !TurboDatabase) {
        addResult('ERROR: Turbo modules required!');
        setIsLoading(false);
        return;
      }

      if (typeof TurboCollection.clib_Echo !== 'function') {
        addResult('ERROR: C library methods not available!');
        setIsLoading(false);
        return;
      }

      await runSyncEchoTest();
      await runAsyncEchoTest();
      await runDatabaseOpsTest();
      await runDocumentOpsTest();

      addResult('==========================================');
      addResult('ALL TESTS COMPLETED');
      addResult('==========================================');
      addResult('');
      addResult('SUMMARY:');
      addResult('- SYNC vs SYNC: Pure JSI performance');
      addResult('- ASYNC vs ASYNC: Includes Promise overhead');
      addResult('- C Library avoids SDK wrapper overhead');
      addResult('- Turbo SDK provides higher-level APIs');
      
    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
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
        <Text style={localStyles.title}>Fair Sync/Async Comparison</Text>
        <Text style={localStyles.mode}>Turbo vs C Library</Text>
        <Text style={localStyles.subtitle}>
          Sync vs Sync, Async vs Async - Apples to Apples
        </Text>
      </View>

      <View style={localStyles.buttons}>
        <View style={localStyles.buttonRow}>
          <View style={localStyles.buttonWrapper}>
            <Button
              title={isLoading ? "Running..." : "Run All Tests"}
              onPress={runAllTests}
              disabled={isLoading}
              color="#f59e0b"
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
              color="#8b5cf6"
            />
          </View>
        </View>
        <View style={localStyles.buttonRow}>
          <View style={localStyles.buttonWrapper}>
            <Button
              title="DB Ops"
              onPress={async () => {
                setIsLoading(true);
                setResultsMessage([]);
                await runDatabaseOpsTest();
                setIsLoading(false);
              }}
              disabled={isLoading}
              color="#ef4444"
            />
          </View>
          <View style={localStyles.buttonWrapper}>
            <Button
              title="Doc Ops"
              onPress={async () => {
                setIsLoading(true);
                setResultsMessage([]);
                await runDocumentOpsTest();
                setIsLoading(false);
              }}
              disabled={isLoading}
              color="#06b6d4"
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#f59e0b',
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
