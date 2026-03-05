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
 * Minimal Comparison Test - True Apples-to-Apples
 * 
 * This test compares 6 approaches with FAIR methodology:
 * 
 * GROUP 1: Minimal (Handle-based, like C library)
 *   1. C Library SYNC - baseline
 *   2. C Library ASYNC - async overhead
 *   3. Swift Minimal SYNC - should be very close to C!
 *   4. Swift Minimal ASYNC - should be close to C async
 * 
 * GROUP 2: Full SDK (with lookups)
 *   5. Swift SDK SYNC - has lookup overhead
 *   6. Swift SDK ASYNC - has lookup + async overhead
 * 
 * The key insight: If Swift Minimal ≈ C, then the SDK overhead
 * is from extra logic (lookups), not from Swift vs C difference.
 */
export default function MinimalComparisonTestScreen() {
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const styles = useStyleScheme();

  const DOCUMENT_COUNT = 100000;

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
  // TEST 1: C Library - SYNC Save (Baseline)
  // ============================================================================
  const runCLibSyncTest = async () => {
    const directory = getDocumentsDirectory();
    const dbName = 'clib-sync-test';
    let dbHandle = 0;
    let collHandle = 0;

    addResult('==========================================');
    addResult('TEST 1: C Library - SYNC Save (Baseline)');
    addResult('==========================================');

    try {
      // Setup (ASYNC)
      const setupStart = performance.now();
      dbHandle = await TurboCollection.clib_OpenDatabaseAsync(dbName, directory);
      if (dbHandle === 0) throw new Error('Failed to open database');
      collHandle = await TurboCollection.clib_GetDefaultCollectionAsync(dbHandle);
      if (collHandle === 0) throw new Error('Failed to get collection');
      const setupTime = performance.now() - setupStart;
      addResult(`Setup: ${setupTime.toFixed(0)}ms`);

      // Save (SYNC)
      const saveStart = performance.now();
      for (let i = 0; i < DOCUMENT_COUNT; i++) {
        const doc = generateRandomDocument(i);
        TurboCollection.clib_SaveDocument(collHandle, `doc_${i}`, JSON.stringify(doc));
      }
      const saveTime = performance.now() - saveStart;
      const throughput = Math.round((DOCUMENT_COUNT / saveTime) * 1000);
      addResult(`Save: ${DOCUMENT_COUNT} docs in ${saveTime.toFixed(0)}ms (${throughput.toLocaleString()} docs/sec)`);

      // Cleanup (ASYNC)
      const cleanupStart = performance.now();
      await TurboCollection.clib_CloseDatabaseAsync(dbHandle);
      await TurboCollection.clib_DeleteDatabaseAsync(dbName, directory);
      const cleanupTime = performance.now() - cleanupStart;
      addResult(`Cleanup: ${cleanupTime.toFixed(0)}ms`);
      addResult('');

      return { saveTime, throughput };
    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
      if (dbHandle !== 0) {
        try { await TurboCollection.clib_CloseDatabaseAsync(dbHandle); } catch (e) {}
        try { await TurboCollection.clib_DeleteDatabaseAsync(dbName, directory); } catch (e) {}
      }
      return null;
    }
  };

  // ============================================================================
  // TEST 2: C Library - ASYNC Save
  // ============================================================================
  const runCLibAsyncTest = async () => {
    const directory = getDocumentsDirectory();
    const dbName = 'clib-async-test';
    let dbHandle = 0;
    let collHandle = 0;

    addResult('==========================================');
    addResult('TEST 2: C Library - ASYNC Save');
    addResult('==========================================');

    try {
      // Setup (ASYNC)
      const setupStart = performance.now();
      dbHandle = await TurboCollection.clib_OpenDatabaseAsync(dbName, directory);
      if (dbHandle === 0) throw new Error('Failed to open database');
      collHandle = await TurboCollection.clib_GetDefaultCollectionAsync(dbHandle);
      if (collHandle === 0) throw new Error('Failed to get collection');
      const setupTime = performance.now() - setupStart;
      addResult(`Setup: ${setupTime.toFixed(0)}ms`);

      // Save (ASYNC)
      const saveStart = performance.now();
      for (let i = 0; i < DOCUMENT_COUNT; i++) {
        const doc = generateRandomDocument(i);
        await TurboCollection.clib_SaveDocumentAsync(collHandle, `doc_${i}`, JSON.stringify(doc));
      }
      const saveTime = performance.now() - saveStart;
      const throughput = Math.round((DOCUMENT_COUNT / saveTime) * 1000);
      addResult(`Save: ${DOCUMENT_COUNT} docs in ${saveTime.toFixed(0)}ms (${throughput.toLocaleString()} docs/sec)`);

      // Cleanup (ASYNC)
      const cleanupStart = performance.now();
      await TurboCollection.clib_CloseDatabaseAsync(dbHandle);
      await TurboCollection.clib_DeleteDatabaseAsync(dbName, directory);
      const cleanupTime = performance.now() - cleanupStart;
      addResult(`Cleanup: ${cleanupTime.toFixed(0)}ms`);
      addResult('');

      return { saveTime, throughput };
    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
      if (dbHandle !== 0) {
        try { await TurboCollection.clib_CloseDatabaseAsync(dbHandle); } catch (e) {}
        try { await TurboCollection.clib_DeleteDatabaseAsync(dbName, directory); } catch (e) {}
      }
      return null;
    }
  };

  // ============================================================================
  // TEST 3: Swift Minimal - SYNC Save (Handle-based, like C)
  // ============================================================================
  const runSwiftMinimalSyncTest = async () => {
    const directory = getDocumentsDirectory();
    const dbName = 'swift-minimal-sync-test';
    let turboDbName: string | null = null;
    let collHandle = 0;

    addResult('==========================================');
    addResult('TEST 3: Swift Minimal - SYNC Save');
    addResult('==========================================');

    try {
      // Setup (ASYNC) - Open DB and get collection handle
      const setupStart = performance.now();
      const openResult = await TurboDatabase.database_Open(dbName, null, null);
      turboDbName = openResult.databaseUniqueName;
      await TurboCollection.collection_CreateCollection('test-col', turboDbName, '_default');
      // Get cached collection handle (like C library approach)
      collHandle = TurboCollection.swift_GetCollectionHandle(turboDbName, '_default', 'test-col');
      if (collHandle === 0) throw new Error('Failed to get collection handle');
      const setupTime = performance.now() - setupStart;
      addResult(`Setup: ${setupTime.toFixed(0)}ms (handle: ${collHandle})`);

      // Save (SYNC) - using cached handle, minimal path
      const saveStart = performance.now();
      for (let i = 0; i < DOCUMENT_COUNT; i++) {
        const doc = generateRandomDocument(i);
        TurboCollection.swift_SaveDocumentMinimalSync(collHandle, `doc_${i}`, JSON.stringify(doc));
      }
      const saveTime = performance.now() - saveStart;
      const throughput = Math.round((DOCUMENT_COUNT / saveTime) * 1000);
      addResult(`Save: ${DOCUMENT_COUNT} docs in ${saveTime.toFixed(0)}ms (${throughput.toLocaleString()} docs/sec)`);

      // Cleanup (ASYNC)
      const cleanupStart = performance.now();
      TurboCollection.swift_ReleaseCollectionHandle(collHandle);
      await TurboDatabase.database_Close(turboDbName);
      await TurboDatabase.database_Delete(dbName, directory);
      const cleanupTime = performance.now() - cleanupStart;
      addResult(`Cleanup: ${cleanupTime.toFixed(0)}ms`);
      addResult('');

      return { saveTime, throughput };
    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
      if (collHandle !== 0) {
        try { TurboCollection.swift_ReleaseCollectionHandle(collHandle); } catch (e) {}
      }
      if (turboDbName) {
        try { await TurboDatabase.database_Close(turboDbName); } catch (e) {}
        try { await TurboDatabase.database_Delete(dbName, directory); } catch (e) {}
      }
      return null;
    }
  };

  // ============================================================================
  // TEST 4: Swift Minimal - ASYNC Save (Handle-based, like C)
  // ============================================================================
  const runSwiftMinimalAsyncTest = async () => {
    const directory = getDocumentsDirectory();
    const dbName = 'swift-minimal-async-test';
    let turboDbName: string | null = null;
    let collHandle = 0;

    addResult('==========================================');
    addResult('TEST 4: Swift Minimal - ASYNC Save');
    addResult('==========================================');

    try {
      // Setup (ASYNC)
      const setupStart = performance.now();
      const openResult = await TurboDatabase.database_Open(dbName, null, null);
      turboDbName = openResult.databaseUniqueName;
      await TurboCollection.collection_CreateCollection('test-col', turboDbName, '_default');
      collHandle = TurboCollection.swift_GetCollectionHandle(turboDbName, '_default', 'test-col');
      if (collHandle === 0) throw new Error('Failed to get collection handle');
      const setupTime = performance.now() - setupStart;
      addResult(`Setup: ${setupTime.toFixed(0)}ms (handle: ${collHandle})`);

      // Save (ASYNC) - using cached handle, minimal path
      const saveStart = performance.now();
      for (let i = 0; i < DOCUMENT_COUNT; i++) {
        const doc = generateRandomDocument(i);
        await TurboCollection.swift_SaveDocumentMinimalAsync(collHandle, `doc_${i}`, JSON.stringify(doc));
      }
      const saveTime = performance.now() - saveStart;
      const throughput = Math.round((DOCUMENT_COUNT / saveTime) * 1000);
      addResult(`Save: ${DOCUMENT_COUNT} docs in ${saveTime.toFixed(0)}ms (${throughput.toLocaleString()} docs/sec)`);

      // Cleanup (ASYNC)
      const cleanupStart = performance.now();
      TurboCollection.swift_ReleaseCollectionHandle(collHandle);
      await TurboDatabase.database_Close(turboDbName);
      await TurboDatabase.database_Delete(dbName, directory);
      const cleanupTime = performance.now() - cleanupStart;
      addResult(`Cleanup: ${cleanupTime.toFixed(0)}ms`);
      addResult('');

      return { saveTime, throughput };
    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
      if (collHandle !== 0) {
        try { TurboCollection.swift_ReleaseCollectionHandle(collHandle); } catch (e) {}
      }
      if (turboDbName) {
        try { await TurboDatabase.database_Close(turboDbName); } catch (e) {}
        try { await TurboDatabase.database_Delete(dbName, directory); } catch (e) {}
      }
      return null;
    }
  };

  // ============================================================================
  // TEST 5: Swift SDK - SYNC Save (Full lookup every time)
  // ============================================================================
  const runSwiftSDKSyncTest = async () => {
    const directory = getDocumentsDirectory();
    const dbName = 'swift-sdk-sync-test';
    let turboDbName: string | null = null;

    addResult('==========================================');
    addResult('TEST 5: Swift SDK - SYNC Save (Full Lookup)');
    addResult('==========================================');

    try {
      // Setup (ASYNC)
      const setupStart = performance.now();
      const openResult = await TurboDatabase.database_Open(dbName, null, null);
      turboDbName = openResult.databaseUniqueName;
      await TurboCollection.collection_CreateCollection('test-col', turboDbName, '_default');
      const setupTime = performance.now() - setupStart;
      addResult(`Setup: ${setupTime.toFixed(0)}ms`);

      // Save (SYNC) - full SDK path with lookups
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
      addResult(`Save: ${DOCUMENT_COUNT} docs in ${saveTime.toFixed(0)}ms (${throughput.toLocaleString()} docs/sec)`);

      // Cleanup (ASYNC)
      const cleanupStart = performance.now();
      await TurboDatabase.database_Close(turboDbName);
      await TurboDatabase.database_Delete(dbName, directory);
      const cleanupTime = performance.now() - cleanupStart;
      addResult(`Cleanup: ${cleanupTime.toFixed(0)}ms`);
      addResult('');

      return { saveTime, throughput };
    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
      if (turboDbName) {
        try { await TurboDatabase.database_Close(turboDbName); } catch (e) {}
        try { await TurboDatabase.database_Delete(dbName, directory); } catch (e) {}
      }
      return null;
    }
  };

  // ============================================================================
  // TEST 6: Swift SDK - ASYNC Save (Full lookup every time)
  // ============================================================================
  const runSwiftSDKAsyncTest = async () => {
    const directory = getDocumentsDirectory();
    const dbName = 'swift-sdk-async-test';
    let turboDbName: string | null = null;

    addResult('==========================================');
    addResult('TEST 6: Swift SDK - ASYNC Save (Full Lookup)');
    addResult('==========================================');

    try {
      // Setup (ASYNC)
      const setupStart = performance.now();
      const openResult = await TurboDatabase.database_Open(dbName, null, null);
      turboDbName = openResult.databaseUniqueName;
      await TurboCollection.collection_CreateCollection('test-col', turboDbName, '_default');
      const setupTime = performance.now() - setupStart;
      addResult(`Setup: ${setupTime.toFixed(0)}ms`);

      // Save (ASYNC) - full SDK path with lookups
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
      addResult(`Save: ${DOCUMENT_COUNT} docs in ${saveTime.toFixed(0)}ms (${throughput.toLocaleString()} docs/sec)`);

      // Cleanup (ASYNC)
      const cleanupStart = performance.now();
      await TurboDatabase.database_Close(turboDbName);
      await TurboDatabase.database_Delete(dbName, directory);
      const cleanupTime = performance.now() - cleanupStart;
      addResult(`Cleanup: ${cleanupTime.toFixed(0)}ms`);
      addResult('');

      return { saveTime, throughput };
    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
      if (turboDbName) {
        try { await TurboDatabase.database_Close(turboDbName); } catch (e) {}
        try { await TurboDatabase.database_Delete(dbName, directory); } catch (e) {}
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
      addResult('MINIMAL COMPARISON TEST');
      addResult('True Apples-to-Apples: C vs Swift');
      addResult('==========================================');
      addResult(`Platform: ${Platform.OS}`);
      addResult(`Documents: ${DOCUMENT_COUNT}`);
      addResult('');
      addResult('METHODOLOGY:');
      addResult('- Tests 1-4: Handle-based (cache once, reuse)');
      addResult('- Tests 5-6: SDK path (lookup every time)');
      addResult('==========================================');
      addResult('');

      if (!TurboCollection || !TurboDatabase) {
        addResult('ERROR: Turbo modules not available!');
        return;
      }

      // Check if minimal methods are available
      if (typeof TurboCollection.swift_GetCollectionHandle !== 'function') {
        addResult('ERROR: swift_GetCollectionHandle not available!');
        addResult('Rebuild the app with the new native code.');
        return;
      }

      // Run all 6 tests
      const cLibSync = await runCLibSyncTest();
      const cLibAsync = await runCLibAsyncTest();
      const swiftMinSync = await runSwiftMinimalSyncTest();
      const swiftMinAsync = await runSwiftMinimalAsyncTest();
      const swiftSDKSync = await runSwiftSDKSyncTest();
      const swiftSDKAsync = await runSwiftSDKAsyncTest();

      // Display ranking
      if (cLibSync && cLibAsync && swiftMinSync && swiftMinAsync && swiftSDKSync && swiftSDKAsync) {
        addResult('==========================================');
        addResult('RANKING (fastest to slowest):');
        addResult('==========================================');

        const results = [
          { name: 'C Library SYNC', time: cLibSync.saveTime, throughput: cLibSync.throughput, group: 'minimal' },
          { name: 'C Library ASYNC', time: cLibAsync.saveTime, throughput: cLibAsync.throughput, group: 'minimal' },
          { name: 'Swift Min SYNC', time: swiftMinSync.saveTime, throughput: swiftMinSync.throughput, group: 'minimal' },
          { name: 'Swift Min ASYNC', time: swiftMinAsync.saveTime, throughput: swiftMinAsync.throughput, group: 'minimal' },
          { name: 'Swift SDK SYNC', time: swiftSDKSync.saveTime, throughput: swiftSDKSync.throughput, group: 'sdk' },
          { name: 'Swift SDK ASYNC', time: swiftSDKAsync.saveTime, throughput: swiftSDKAsync.throughput, group: 'sdk' },
        ];

        results.sort((a, b) => a.time - b.time);
        const baseline = results[0].time;

        results.forEach((r, i) => {
          const ratio = (r.time / baseline).toFixed(2);
          const label = i === 0 ? '(baseline)' : `(${ratio}x)`;
          addResult(`${i + 1}. ${r.name.padEnd(16)} ${r.time.toFixed(0).padStart(5)}ms ${label}`);
        });

        addResult('');
        addResult('==========================================');
        addResult('KEY INSIGHTS:');
        addResult('==========================================');

        // C vs Swift Minimal comparison (apples to apples)
        const cVsSwiftMinSync = (swiftMinSync.saveTime / cLibSync.saveTime).toFixed(2);
        const cVsSwiftMinAsync = (swiftMinAsync.saveTime / cLibAsync.saveTime).toFixed(2);
        
        addResult('C vs Swift (Minimal - Fair Comparison):');
        addResult(`  SYNC:  Swift is ${cVsSwiftMinSync}x of C time`);
        addResult(`  ASYNC: Swift is ${cVsSwiftMinAsync}x of C time`);
        addResult('');

        // SDK overhead
        const sdkOverheadSync = (swiftSDKSync.saveTime / swiftMinSync.saveTime).toFixed(2);
        const sdkOverheadAsync = (swiftSDKAsync.saveTime / swiftMinAsync.saveTime).toFixed(2);
        
        addResult('SDK Overhead (lookups, error handling):');
        addResult(`  SYNC:  SDK adds ${sdkOverheadSync}x overhead vs Minimal`);
        addResult(`  ASYNC: SDK adds ${sdkOverheadAsync}x overhead vs Minimal`);
        addResult('');

        // Sync vs Async
        const syncVsAsyncC = (cLibAsync.saveTime / cLibSync.saveTime).toFixed(2);
        const syncVsAsyncSwiftMin = (swiftMinAsync.saveTime / swiftMinSync.saveTime).toFixed(2);
        const syncVsAsyncSwiftSDK = (swiftSDKAsync.saveTime / swiftSDKSync.saveTime).toFixed(2);
        
        addResult('Async Overhead:');
        addResult(`  C Library:    Async is ${syncVsAsyncC}x slower than Sync`);
        addResult(`  Swift Min:    Async is ${syncVsAsyncSwiftMin}x slower than Sync`);
        addResult(`  Swift SDK:    Async is ${syncVsAsyncSwiftSDK}x slower than Sync`);
      }

      addResult('');
      addResult('==========================================');
      addResult('ALL TESTS COMPLETED');
      addResult('==========================================');

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
        <Text style={localStyles.title}>Minimal Comparison Test</Text>
        <Text style={localStyles.mode}>True Apples-to-Apples: C vs Swift</Text>
        <Text style={localStyles.subtitle}>
          Compares handle-based (minimal) vs full SDK paths
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
