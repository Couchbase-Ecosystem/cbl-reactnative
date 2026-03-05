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
 * Sync vs Async Fair Comparison Test
 * 
 * This test fairly compares 4 approaches:
 * 1. Swift SDK - Synchronous Save (NEW)
 * 2. Swift SDK - Asynchronous Save (existing)
 * 3. C Library - Synchronous Save (existing)
 * 4. C Library - Asynchronous Save (NEW)
 * 
 * FAIR COMPARISON:
 * - All setup/cleanup operations use ASYNC methods
 * - Only the SAVE operation differs (sync vs async)
 * - This isolates the sync vs async performance difference
 */
export default function SyncAsyncComparisonTestScreen() {
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const styles = useStyleScheme();

  const DOCUMENT_COUNT = 1000;

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

  // ============================================================================
  // TEST 1: Swift SDK - SYNC Save
  // ============================================================================
  const runSwiftSyncTest = async () => {
    const directory = getDocumentsDirectory();
    const dbName = 'swift-sync-test';
    let turboDbName: string | null = null;

    addResult('==========================================');
    addResult('TEST 1: Swift SDK - SYNC Save');
    addResult('==========================================');

    try {
      // 1. Setup (ASYNC - timed)
      addResult('Setup (Async):');
      const setupStart = performance.now();
      const openResult = await TurboDatabase.database_Open(dbName, null, null);
      turboDbName = openResult.databaseUniqueName;
      await TurboCollection.collection_CreateCollection('test-col', turboDbName, '_default');
      const setupTime = performance.now() - setupStart;
      addResult(`  Open + Create Collection: ${setupTime.toFixed(0)}ms`);

      // 2. Save documents (SYNC - timed separately)
      addResult(`Save ${DOCUMENT_COUNT} docs (SYNC):`);
      const saveStart = performance.now();
      for (let i = 0; i < DOCUMENT_COUNT; i++) {
        const doc = generateRandomDocument(i);
        TurboCollection.collection_SaveSync(
          JSON.stringify(doc), '[]', `doc_${i}`,
          turboDbName, '_default', 'test-col', -9999
        );
      }
      const saveTime = performance.now() - saveStart;
      const throughput = Math.round((DOCUMENT_COUNT / saveTime) * 1000);
      addResult(`  ${DOCUMENT_COUNT} docs in ${saveTime.toFixed(0)}ms`);
      addResult(`  Throughput: ${throughput.toLocaleString()} docs/sec`);

      // 3. Cleanup (ASYNC - timed)
      addResult('Cleanup (Async):');
      const cleanupStart = performance.now();
      await TurboDatabase.database_Close(turboDbName);
      await TurboDatabase.database_Delete(dbName, directory);
      const cleanupTime = performance.now() - cleanupStart;
      addResult(`  Close + Delete: ${cleanupTime.toFixed(0)}ms`);

      const totalTime = setupTime + saveTime + cleanupTime;
      addResult(`TOTAL: ${totalTime.toFixed(0)}ms`);
      addResult('');

      return { setupTime, saveTime, cleanupTime, totalTime, throughput };

    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
      // Cleanup on error
      if (turboDbName) {
        try { await TurboDatabase.database_Close(turboDbName); } catch (e) {}
        try { await TurboDatabase.database_Delete(dbName, directory); } catch (e) {}
      }
      return null;
    }
  };

  // ============================================================================
  // TEST 2: Swift SDK - ASYNC Save
  // ============================================================================
  const runSwiftAsyncTest = async () => {
    const directory = getDocumentsDirectory();
    const dbName = 'swift-async-test';
    let turboDbName: string | null = null;

    addResult('==========================================');
    addResult('TEST 2: Swift SDK - ASYNC Save');
    addResult('==========================================');

    try {
      // 1. Setup (ASYNC - timed)
      addResult('Setup (Async):');
      const setupStart = performance.now();
      const openResult = await TurboDatabase.database_Open(dbName, null, null);
      turboDbName = openResult.databaseUniqueName;
      await TurboCollection.collection_CreateCollection('test-col', turboDbName, '_default');
      const setupTime = performance.now() - setupStart;
      addResult(`  Open + Create Collection: ${setupTime.toFixed(0)}ms`);

      // 2. Save documents (ASYNC - timed separately)
      addResult(`Save ${DOCUMENT_COUNT} docs (ASYNC):`);
      const saveStart = performance.now();
      for (let i = 0; i < DOCUMENT_COUNT; i++) {
        const doc = generateRandomDocument(i);
        await TurboCollection.collection_Save(
          JSON.stringify(doc), '[]', `doc_${i}`,
          turboDbName, '_default', 'test-col', -9999
        );
      }
      const saveTime = performance.now() - saveStart;
      const throughput = Math.round((DOCUMENT_COUNT / saveTime) * 1000);
      addResult(`  ${DOCUMENT_COUNT} docs in ${saveTime.toFixed(0)}ms`);
      addResult(`  Throughput: ${throughput.toLocaleString()} docs/sec`);

      // 3. Cleanup (ASYNC - timed)
      addResult('Cleanup (Async):');
      const cleanupStart = performance.now();
      await TurboDatabase.database_Close(turboDbName);
      await TurboDatabase.database_Delete(dbName, directory);
      const cleanupTime = performance.now() - cleanupStart;
      addResult(`  Close + Delete: ${cleanupTime.toFixed(0)}ms`);

      const totalTime = setupTime + saveTime + cleanupTime;
      addResult(`TOTAL: ${totalTime.toFixed(0)}ms`);
      addResult('');

      return { setupTime, saveTime, cleanupTime, totalTime, throughput };

    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
      // Cleanup on error
      if (turboDbName) {
        try { await TurboDatabase.database_Close(turboDbName); } catch (e) {}
        try { await TurboDatabase.database_Delete(dbName, directory); } catch (e) {}
      }
      return null;
    }
  };

  // ============================================================================
  // TEST 3: C Library - SYNC Save
  // ============================================================================
  const runCLibSyncTest = async () => {
    const directory = getDocumentsDirectory();
    const dbName = 'clib-sync-test';
    let dbHandle = 0;
    let collHandle = 0;

    addResult('==========================================');
    addResult('TEST 3: C Library - SYNC Save');
    addResult('==========================================');

    try {
      // 1. Setup (ASYNC - using new async methods for fair comparison)
      addResult('Setup (Async):');
      const setupStart = performance.now();
      dbHandle = await TurboCollection.clib_OpenDatabaseAsync(dbName, directory);
      if (dbHandle === 0) {
        throw new Error('Failed to open C library database');
      }
      collHandle = await TurboCollection.clib_GetDefaultCollectionAsync(dbHandle);
      if (collHandle === 0) {
        throw new Error('Failed to get default collection');
      }
      const setupTime = performance.now() - setupStart;
      addResult(`  Open + Get Collection: ${setupTime.toFixed(0)}ms`);

      // 2. Save documents (SYNC - existing sync method)
      addResult(`Save ${DOCUMENT_COUNT} docs (SYNC):`);
      const saveStart = performance.now();
      for (let i = 0; i < DOCUMENT_COUNT; i++) {
        const doc = generateRandomDocument(i);
        TurboCollection.clib_SaveDocument(collHandle, `doc_${i}`, JSON.stringify(doc));
      }
      const saveTime = performance.now() - saveStart;
      const throughput = Math.round((DOCUMENT_COUNT / saveTime) * 1000);
      addResult(`  ${DOCUMENT_COUNT} docs in ${saveTime.toFixed(0)}ms`);
      addResult(`  Throughput: ${throughput.toLocaleString()} docs/sec`);

      // 3. Cleanup (ASYNC - using new async methods for fair comparison)
      addResult('Cleanup (Async):');
      const cleanupStart = performance.now();
      await TurboCollection.clib_CloseDatabaseAsync(dbHandle);
      await TurboCollection.clib_DeleteDatabaseAsync(dbName, directory);
      const cleanupTime = performance.now() - cleanupStart;
      addResult(`  Close + Delete: ${cleanupTime.toFixed(0)}ms`);

      const totalTime = setupTime + saveTime + cleanupTime;
      addResult(`TOTAL: ${totalTime.toFixed(0)}ms`);
      addResult('');

      return { setupTime, saveTime, cleanupTime, totalTime, throughput };

    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
      // Cleanup on error
      if (dbHandle !== 0) {
        try { await TurboCollection.clib_CloseDatabaseAsync(dbHandle); } catch (e) {}
        try { await TurboCollection.clib_DeleteDatabaseAsync(dbName, directory); } catch (e) {}
      }
      return null;
    }
  };

  // ============================================================================
  // TEST 4: C Library - ASYNC Save
  // ============================================================================
  const runCLibAsyncTest = async () => {
    const directory = getDocumentsDirectory();
    const dbName = 'clib-async-test';
    let dbHandle = 0;
    let collHandle = 0;

    addResult('==========================================');
    addResult('TEST 4: C Library - ASYNC Save');
    addResult('==========================================');

    try {
      // 1. Setup (ASYNC - using new async methods)
      addResult('Setup (Async):');
      const setupStart = performance.now();
      dbHandle = await TurboCollection.clib_OpenDatabaseAsync(dbName, directory);
      if (dbHandle === 0) {
        throw new Error('Failed to open C library database');
      }
      collHandle = await TurboCollection.clib_GetDefaultCollectionAsync(dbHandle);
      if (collHandle === 0) {
        throw new Error('Failed to get default collection');
      }
      const setupTime = performance.now() - setupStart;
      addResult(`  Open + Get Collection: ${setupTime.toFixed(0)}ms`);

      // 2. Save documents (ASYNC - using new async save method)
      addResult(`Save ${DOCUMENT_COUNT} docs (ASYNC):`);
      const saveStart = performance.now();
      for (let i = 0; i < DOCUMENT_COUNT; i++) {
        const doc = generateRandomDocument(i);
        await TurboCollection.clib_SaveDocumentAsync(collHandle, `doc_${i}`, JSON.stringify(doc));
      }
      const saveTime = performance.now() - saveStart;
      const throughput = Math.round((DOCUMENT_COUNT / saveTime) * 1000);
      addResult(`  ${DOCUMENT_COUNT} docs in ${saveTime.toFixed(0)}ms`);
      addResult(`  Throughput: ${throughput.toLocaleString()} docs/sec`);

      // 3. Cleanup (ASYNC - using new async methods)
      addResult('Cleanup (Async):');
      const cleanupStart = performance.now();
      await TurboCollection.clib_CloseDatabaseAsync(dbHandle);
      await TurboCollection.clib_DeleteDatabaseAsync(dbName, directory);
      const cleanupTime = performance.now() - cleanupStart;
      addResult(`  Close + Delete: ${cleanupTime.toFixed(0)}ms`);

      const totalTime = setupTime + saveTime + cleanupTime;
      addResult(`TOTAL: ${totalTime.toFixed(0)}ms`);
      addResult('');

      return { setupTime, saveTime, cleanupTime, totalTime, throughput };

    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
      // Cleanup on error
      if (dbHandle !== 0) {
        try { await TurboCollection.clib_CloseDatabaseAsync(dbHandle); } catch (e) {}
        try { await TurboCollection.clib_DeleteDatabaseAsync(dbName, directory); } catch (e) {}
      }
      return null;
    }
  };

  // ============================================================================
  // Run All Tests
  // ============================================================================
  const runAllTests = async () => {
    setIsLoading(true);
    setResultsMessage([]);

    try {
      addResult('==========================================');
      addResult('SYNC vs ASYNC FAIR COMPARISON TEST');
      addResult('==========================================');
      addResult(`Platform: ${Platform.OS}`);
      addResult(`Documents: ${DOCUMENT_COUNT}`);
      addResult(`Pattern: Save one by one (no transactions)`);
      addResult('');
      addResult('METHODOLOGY:');
      addResult('- Setup/Cleanup: All use ASYNC methods');
      addResult('- Only SAVE operation differs (sync vs async)');
      addResult('- This isolates the sync vs async difference');
      addResult('==========================================');
      addResult('');

      if (!TurboCollection || !TurboDatabase) {
        addResult('ERROR: Turbo modules not available!');
        return;
      }

      // Check if new methods are available
      if (typeof TurboCollection.collection_SaveSync !== 'function') {
        addResult('ERROR: collection_SaveSync not available!');
        addResult('Make sure the native code is updated and app is rebuilt.');
        return;
      }

      if (typeof TurboCollection.clib_SaveDocumentAsync !== 'function') {
        addResult('ERROR: clib_SaveDocumentAsync not available!');
        addResult('Make sure the native code is updated and app is rebuilt.');
        return;
      }

      // Run all 4 tests sequentially
      const swiftSyncResult = await runSwiftSyncTest();
      const swiftAsyncResult = await runSwiftAsyncTest();
      const cLibSyncResult = await runCLibSyncTest();
      const cLibAsyncResult = await runCLibAsyncTest();

      // Display comparison and ranking
      if (swiftSyncResult && swiftAsyncResult && cLibSyncResult && cLibAsyncResult) {
        addResult('==========================================');
        addResult('SAVE TIME RANKING (fastest to slowest):');
        addResult('==========================================');

        const results = [
          { name: 'C Library SYNC', time: cLibSyncResult.saveTime, throughput: cLibSyncResult.throughput },
          { name: 'Swift SDK SYNC', time: swiftSyncResult.saveTime, throughput: swiftSyncResult.throughput },
          { name: 'C Library ASYNC', time: cLibAsyncResult.saveTime, throughput: cLibAsyncResult.throughput },
          { name: 'Swift SDK ASYNC', time: swiftAsyncResult.saveTime, throughput: swiftAsyncResult.throughput },
        ];

        // Sort by save time
        results.sort((a, b) => a.time - b.time);
        const baseline = results[0].time;

        results.forEach((r, i) => {
          const ratio = (r.time / baseline).toFixed(2);
          const label = i === 0 ? '(baseline)' : `(${ratio}x slower)`;
          addResult(`${i + 1}. ${r.name.padEnd(16)} ${r.time.toFixed(0).padStart(6)}ms  ${label}`);
          addResult(`   Throughput: ${r.throughput.toLocaleString()} docs/sec`);
        });

        addResult('');
        addResult('==========================================');
        addResult('KEY INSIGHTS:');
        addResult('==========================================');

        // Sync vs Async comparison
        const swiftSyncVsAsync = (swiftAsyncResult.saveTime / swiftSyncResult.saveTime).toFixed(2);
        const cLibSyncVsAsync = (cLibAsyncResult.saveTime / cLibSyncResult.saveTime).toFixed(2);
        
        addResult('Sync vs Async Impact:');
        addResult(`  Swift: Sync is ${swiftSyncVsAsync}x faster than Async`);
        addResult(`  C Lib: Sync is ${cLibSyncVsAsync}x faster than Async`);
        addResult('');

        // C Library vs Swift SDK comparison
        const syncComparison = (swiftSyncResult.saveTime / cLibSyncResult.saveTime).toFixed(2);
        const asyncComparison = (swiftAsyncResult.saveTime / cLibAsyncResult.saveTime).toFixed(2);
        
        addResult('C Library vs Swift SDK:');
        addResult(`  Sync:  C is ${syncComparison}x faster than Swift`);
        addResult(`  Async: C is ${asyncComparison}x faster than Swift`);
      }

      addResult('');
      addResult('==========================================');
      addResult('ALL TESTS COMPLETED');
      addResult('==========================================');

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
        <Text style={localStyles.title}>Sync vs Async Comparison</Text>
        <Text style={localStyles.mode}>Fair Comparison: Same Setup/Cleanup, Different Save</Text>
        <Text style={localStyles.subtitle}>
          Swift SDK and C Library - Sync vs Async Save Performance
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
