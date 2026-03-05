import React, { useState } from 'react';
import { SafeAreaView, View, Text, Button, StyleSheet, ScrollView, NativeModules, Alert, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import { useStyleScheme } from '@/components/Themed/Themed';
import {
  captureMemorySnapshot,
  formatBytes,
  forceGarbageCollection,
  wait,
  getBestMemoryValue,
  formatMemorySnapshot,
} from '../../hooks/memory-utils';

// Direct imports for Turbo Modules
let TurboDatabase: any = null;
let TurboCollection: any = null;

try {
  TurboDatabase = require('cbl-reactnative/src/specs/NativeCblDatabase').default;
  TurboCollection = require('cbl-reactnative/src/specs/NativeCblCollection').default;
} catch (e) {
  console.warn('Turbo modules not available:', e);
}

// Legacy module for memory capture
const LegacyModule = NativeModules.CblReactnative;

/**
 * C Library vs SDK Memory Performance Test
 * 
 * Mirrors memory-performance-test.tsx but compares:
 * 1. SDK (Swift/Kotlin) via Turbo Modules
 * 2. C Library (libcblite) via Obj-C++/JNI bridge
 * 
 * Test operations:
 * - Bulk data transfer (save documents)
 * - Rapid calls (echo)
 * - Memory leak detection
 */
export default function CLibraryMemoryTestScreen() {
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

  const generateLargeDocument = (index: number, sizeKB: number = 10) => {
    const baseDoc = {
      id: `doc_${index}`,
      firstName: 'John',
      lastName: 'Doe',
      email: `user${index}@example.com`,
      age: 28,
      address: {
        street: `${Math.floor(Math.random() * 9999)} Main Street`,
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'USA',
        coordinates: { lat: 37.7749, lng: -122.4194 },
      },
      tags: ['customer', 'premium', 'verified', 'active'],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        source: 'mobile-app',
        platform: 'react-native',
      },
      preferences: {
        theme: 'dark',
        notifications: true,
        language: 'en',
        timezone: 'America/Los_Angeles',
      },
      randomValue: Math.random(),
    };

    const baseSize = JSON.stringify(baseDoc).length;
    const targetSize = sizeKB * 1024;
    const paddingSize = Math.max(0, targetSize - baseSize);
    
    return {
      ...baseDoc,
      padding: 'x'.repeat(paddingSize),
    };
  };

  /**
   * TEST 1: Bulk Data Transfer - SDK vs C Library
   */
  const runBulkDataTransferTest = async () => {
    addResult('==========================================');
    addResult('TEST 1: BULK DATA TRANSFER');
    addResult('==========================================');
    addResult('Tests memory overhead for large document saves');
    addResult('Compares: SDK (Swift/Kotlin) vs C Library');
    addResult('');

    const documentCount = 1000;
    const documentSizeKB = 10;
    const directory = getDocumentsDirectory();
    
    let sdkDbName: string | null = null;
    let clibDbHandle: number = 0;
    let clibCollectionHandle: number = 0;

    try {
      // ============================================================
      // SDK TEST (Swift/Kotlin)
      // ============================================================
      addResult('SDK (Swift/Kotlin):');
      
      const sdkMemBefore = await captureMemorySnapshot(LegacyModule);
      const sdkBeforeValue = getBestMemoryValue(sdkMemBefore);
      addResult(`Memory before: ${formatMemorySnapshot(sdkMemBefore)}`);
      
      // Open database
      const sdkOpenResult = await TurboDatabase.database_Open('clib-mem-test-sdk', null, null);
      sdkDbName = sdkOpenResult.databaseUniqueName;
      await TurboCollection.collection_CreateCollection('test-collection', sdkDbName, '_default');
      
      const sdkStart = performance.now();
      let sdkPeakMemory = sdkBeforeValue || 0;
      
      for (let i = 0; i < documentCount; i++) {
        const doc = generateLargeDocument(i, documentSizeKB);
        await TurboCollection.collection_Save(
          JSON.stringify(doc),
          '[]',
          `doc_sdk_${i}`,
          sdkDbName,
          '_default',
          'test-collection',
          -9999
        );
        
        if (i % 100 === 0) {
          const snapshot = await captureMemorySnapshot(LegacyModule);
          const currentMem = getBestMemoryValue(snapshot);
          if (currentMem && currentMem > sdkPeakMemory) {
            sdkPeakMemory = currentMem;
          }
        }
      }
      
      const sdkTime = performance.now() - sdkStart;
      const sdkMemAfter = await captureMemorySnapshot(LegacyModule);
      const sdkAfterValue = getBestMemoryValue(sdkMemAfter);
      const sdkDelta = sdkAfterValue && sdkBeforeValue ? sdkAfterValue - sdkBeforeValue : null;
      
      addResult(`Saved ${documentCount} docs (${documentSizeKB}KB each)`);
      addResult(`Time: ${sdkTime.toFixed(0)}ms`);
      addResult(`Memory after: ${formatMemorySnapshot(sdkMemAfter)}`);
      addResult(`Peak memory: ${formatBytes(sdkPeakMemory)}`);
      addResult(`Memory delta: ${sdkDelta !== null ? formatBytes(sdkDelta) : 'N/A'}`);
      addResult('');

      // Cleanup SDK
      await TurboDatabase.database_Close(sdkDbName);
      await TurboDatabase.database_Delete('clib-mem-test-sdk', directory);
      sdkDbName = null;
      
      await wait(1000);
      forceGarbageCollection();
      await wait(500);

      // ============================================================
      // C LIBRARY TEST
      // ============================================================
      addResult('C LIBRARY (libcblite):');
      
      const clibMemBefore = await captureMemorySnapshot(LegacyModule);
      const clibBeforeValue = getBestMemoryValue(clibMemBefore);
      addResult(`Memory before: ${formatMemorySnapshot(clibMemBefore)}`);
      
      // Open database using C library
      clibDbHandle = TurboCollection.clib_OpenDatabase('clib-mem-test-c', directory);
      if (clibDbHandle === 0) {
        addResult('ERROR: Failed to open C library database');
        return;
      }
      
      clibCollectionHandle = TurboCollection.clib_GetDefaultCollection(clibDbHandle);
      if (clibCollectionHandle === 0) {
        addResult('ERROR: Failed to get default collection');
        TurboCollection.clib_CloseDatabase(clibDbHandle);
        return;
      }
      
      const clibStart = performance.now();
      let clibPeakMemory = clibBeforeValue || 0;
      
      for (let i = 0; i < documentCount; i++) {
        const doc = generateLargeDocument(i, documentSizeKB);
        TurboCollection.clib_SaveDocument(
          clibCollectionHandle,
          `doc_clib_${i}`,
          JSON.stringify(doc)
        );
        
        if (i % 100 === 0) {
          const snapshot = await captureMemorySnapshot(LegacyModule);
          const currentMem = getBestMemoryValue(snapshot);
          if (currentMem && currentMem > clibPeakMemory) {
            clibPeakMemory = currentMem;
          }
        }
      }
      
      const clibTime = performance.now() - clibStart;
      const clibMemAfter = await captureMemorySnapshot(LegacyModule);
      const clibAfterValue = getBestMemoryValue(clibMemAfter);
      const clibDelta = clibAfterValue && clibBeforeValue ? clibAfterValue - clibBeforeValue : null;
      
      addResult(`Saved ${documentCount} docs (${documentSizeKB}KB each)`);
      addResult(`Time: ${clibTime.toFixed(0)}ms`);
      addResult(`Memory after: ${formatMemorySnapshot(clibMemAfter)}`);
      addResult(`Peak memory: ${formatBytes(clibPeakMemory)}`);
      addResult(`Memory delta: ${clibDelta !== null ? formatBytes(clibDelta) : 'N/A'}`);
      addResult('');

      // Cleanup C library
      TurboCollection.clib_CloseDatabase(clibDbHandle);
      TurboCollection.clib_DeleteDatabase('clib-mem-test-c', directory);
      clibDbHandle = 0;

      // ============================================================
      // COMPARISON
      // ============================================================
      addResult('COMPARISON:');
      addResult(`SDK:      ${sdkTime.toFixed(0)}ms, Peak: ${formatBytes(sdkPeakMemory)}`);
      addResult(`C Library: ${clibTime.toFixed(0)}ms, Peak: ${formatBytes(clibPeakMemory)}`);
      
      const speedup = (sdkTime / clibTime).toFixed(2);
      addResult(`Speed: C Library is ${speedup}x ${Number(speedup) > 1 ? 'faster' : 'slower'}`);
      
      if (sdkPeakMemory > 0 && clibPeakMemory > 0) {
        const memorySaving = sdkPeakMemory - clibPeakMemory;
        const memoryPercent = ((memorySaving / sdkPeakMemory) * 100).toFixed(1);
        addResult(`Memory: C Library uses ${formatBytes(memorySaving)} ${Number(memorySaving) > 0 ? 'less' : 'more'} (${memoryPercent}%)`);
      }
      addResult('');

    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
    } finally {
      // Cleanup
      if (sdkDbName) {
        try { await TurboDatabase.database_Delete(sdkDbName, directory); } catch (e) {}
      }
      if (clibDbHandle !== 0) {
        try { 
          TurboCollection.clib_CloseDatabase(clibDbHandle);
          TurboCollection.clib_DeleteDatabase('clib-mem-test-c', directory);
        } catch (e) {}
      }
    }
  };

  /**
   * TEST 2: Rapid Echo Calls - SDK vs C Library
   */
  const runRapidCallsTest = async () => {
    addResult('==========================================');
    addResult('TEST 2: RAPID ECHO CALLS');
    addResult('==========================================');
    addResult('Tests overhead for many small calls');
    addResult('Compares: SDK Echo vs C Library Echo');
    addResult('');

    const callCount = 50000;
    const smallPayload = JSON.stringify({ id: 'test', value: 'small data' });

    try {
      // ============================================================
      // SDK ECHO TEST
      // ============================================================
      addResult('SDK Echo (Turbo Async):');
      
      const sdkMemBefore = await captureMemorySnapshot(LegacyModule);
      const sdkBeforeValue = getBestMemoryValue(sdkMemBefore);
      addResult(`Memory before: ${formatMemorySnapshot(sdkMemBefore)}`);
      
      const sdkStart = performance.now();
      let sdkPeakMemory = sdkBeforeValue || 0;
      
      for (let i = 0; i < callCount; i++) {
        await TurboCollection.collection_Echo(smallPayload);
        
        if (i % 10000 === 0) {
          const snapshot = await captureMemorySnapshot(LegacyModule);
          const currentMem = getBestMemoryValue(snapshot);
          if (currentMem && currentMem > sdkPeakMemory) {
            sdkPeakMemory = currentMem;
          }
        }
      }
      
      const sdkTime = performance.now() - sdkStart;
      const sdkMemAfter = await captureMemorySnapshot(LegacyModule);
      
      addResult(`Made ${callCount.toLocaleString()} calls`);
      addResult(`Time: ${sdkTime.toFixed(0)}ms`);
      addResult(`Memory after: ${formatMemorySnapshot(sdkMemAfter)}`);
      addResult(`Calls/sec: ${Math.round((callCount / sdkTime) * 1000).toLocaleString()}`);
      addResult('');

      await wait(1000);
      forceGarbageCollection();
      await wait(500);

      // ============================================================
      // C LIBRARY ECHO TEST
      // ============================================================
      addResult('C Library Echo (Synchronous):');
      
      const clibMemBefore = await captureMemorySnapshot(LegacyModule);
      const clibBeforeValue = getBestMemoryValue(clibMemBefore);
      addResult(`Memory before: ${formatMemorySnapshot(clibMemBefore)}`);
      
      const clibStart = performance.now();
      let clibPeakMemory = clibBeforeValue || 0;
      
      for (let i = 0; i < callCount; i++) {
        // C library echo is synchronous!
        TurboCollection.clib_Echo(smallPayload);
        
        if (i % 10000 === 0) {
          const snapshot = await captureMemorySnapshot(LegacyModule);
          const currentMem = getBestMemoryValue(snapshot);
          if (currentMem && currentMem > clibPeakMemory) {
            clibPeakMemory = currentMem;
          }
        }
      }
      
      const clibTime = performance.now() - clibStart;
      const clibMemAfter = await captureMemorySnapshot(LegacyModule);
      
      addResult(`Made ${callCount.toLocaleString()} calls`);
      addResult(`Time: ${clibTime.toFixed(0)}ms`);
      addResult(`Memory after: ${formatMemorySnapshot(clibMemAfter)}`);
      addResult(`Calls/sec: ${Math.round((callCount / clibTime) * 1000).toLocaleString()}`);
      addResult('');

      // ============================================================
      // COMPARISON
      // ============================================================
      addResult('COMPARISON:');
      addResult(`SDK:       ${sdkTime.toFixed(0)}ms (${Math.round((callCount / sdkTime) * 1000).toLocaleString()} calls/sec)`);
      addResult(`C Library: ${clibTime.toFixed(0)}ms (${Math.round((callCount / clibTime) * 1000).toLocaleString()} calls/sec)`);
      
      const speedup = (sdkTime / clibTime).toFixed(2);
      addResult(`C Library is ${speedup}x ${Number(speedup) > 1 ? 'faster' : 'slower'}`);
      addResult('');

    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
    }
  };

  /**
   * TEST 3: Memory Leak Detection
   */
  const runMemoryLeakTest = async () => {
    addResult('==========================================');
    addResult('TEST 3: MEMORY LEAK DETECTION');
    addResult('==========================================');
    addResult('Tests for memory leaks over repeated cycles');
    addResult('');

    const cycles = 5;
    const opsPerCycle = 500;
    const directory = getDocumentsDirectory();

    try {
      // ============================================================
      // C LIBRARY LEAK TEST
      // ============================================================
      addResult('C Library (Open/Save/Close cycles):');
      
      const clibBaseline = await captureMemorySnapshot(LegacyModule);
      const clibBaselineValue = getBestMemoryValue(clibBaseline);
      addResult(`Baseline: ${formatMemorySnapshot(clibBaseline)}`);
      
      for (let cycle = 0; cycle < cycles; cycle++) {
        // Open database
        const dbHandle = TurboCollection.clib_OpenDatabase(`leak-test-cycle-${cycle}`, directory);
        if (dbHandle === 0) {
          addResult(`  Cycle ${cycle + 1}: Failed to open database`);
          continue;
        }
        
        const collHandle = TurboCollection.clib_GetDefaultCollection(dbHandle);
        if (collHandle === 0) {
          TurboCollection.clib_CloseDatabase(dbHandle);
          addResult(`  Cycle ${cycle + 1}: Failed to get collection`);
          continue;
        }
        
        // Save documents
        for (let i = 0; i < opsPerCycle; i++) {
          TurboCollection.clib_SaveDocument(
            collHandle,
            `doc_${i}`,
            JSON.stringify({ id: i, data: 'test' })
          );
        }
        
        // Close and delete
        TurboCollection.clib_CloseDatabase(dbHandle);
        TurboCollection.clib_DeleteDatabase(`leak-test-cycle-${cycle}`, directory);
        
        await wait(300);
        forceGarbageCollection();
        await wait(200);
        
        const snapshot = await captureMemorySnapshot(LegacyModule);
        const currentMem = getBestMemoryValue(snapshot);
        if (currentMem) {
          addResult(`  Cycle ${cycle + 1}: ${formatBytes(currentMem)}`);
        }
      }
      
      const clibFinal = await captureMemorySnapshot(LegacyModule);
      const clibFinalValue = getBestMemoryValue(clibFinal);
      const clibDelta = clibFinalValue && clibBaselineValue 
        ? clibFinalValue - clibBaselineValue : null;
      
      addResult(`Final: ${formatMemorySnapshot(clibFinal)}`);
      addResult(`Net change: ${clibDelta !== null ? formatBytes(clibDelta) : 'N/A'}`);
      addResult('');

      // ============================================================
      // LEAK ANALYSIS
      // ============================================================
      addResult('LEAK ANALYSIS:');
      
      const leakThreshold = 1024 * 1024; // 1MB
      
      if (clibDelta !== null) {
        if (Math.abs(clibDelta) < leakThreshold) {
          addResult('C Library: No significant leak detected');
        } else if (clibDelta > 0) {
          addResult(`C Library: WARNING - ${formatBytes(clibDelta)} retained`);
        } else {
          addResult(`C Library: Memory freed: ${formatBytes(Math.abs(clibDelta))}`);
        }
      }
      addResult('');

    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
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
      addResult('C LIBRARY vs SDK MEMORY TEST');
      addResult('==========================================');
      addResult(`Platform: ${Platform.OS}`);
      addResult(`Turbo Modules: ${TurboCollection ? 'YES' : 'NO'}`);
      addResult(`C Library Methods: ${TurboCollection?.clib_OpenDatabase ? 'YES' : 'NO'}`);
      addResult('');

      if (!TurboCollection) {
        addResult('ERROR: Turbo modules not available!');
        setIsLoading(false);
        return;
      }

      if (typeof TurboCollection.clib_OpenDatabase !== 'function') {
        addResult('ERROR: C library methods not available!');
        addResult('Rebuild the app with C library integration.');
        setIsLoading(false);
        return;
      }

      // Check memory availability
      const memCheck = await captureMemorySnapshot(LegacyModule);
      const hasNativeMemory = memCheck.native !== undefined;
      addResult(`Native Memory Tracking: ${hasNativeMemory ? 'YES' : 'NO'}`);
      if (hasNativeMemory) {
        addResult(`Current: ${formatMemorySnapshot(memCheck)}`);
      }
      addResult('');

      await runBulkDataTransferTest();
      await wait(2000);
      
      await runRapidCallsTest();
      await wait(2000);
      
      await runMemoryLeakTest();

      addResult('==========================================');
      addResult('ALL TESTS COMPLETED');
      addResult('==========================================');
      
    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
      if (error.stack) {
        addResult(`Stack: ${error.stack.substring(0, 500)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => setResultsMessage([]);

  const copyResults = async () => {
    if (resultMessage.length === 0) {
      Alert.alert('No Results', 'Run a test first to copy results.');
      return;
    }
    const textToCopy = resultMessage.join('\n');
    await Clipboard.setStringAsync(textToCopy);
    Alert.alert('Copied!', 'Results copied to clipboard.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={localStyles.header}>
        <Text style={localStyles.title}>C Library Memory Test</Text>
        <Text style={localStyles.mode}>Memory: SDK vs C Library</Text>
        <Text style={localStyles.subtitle}>
          Compares memory usage between platform SDK and raw C library
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
              color="#f59e0b"
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
              title="Bulk Transfer"
              onPress={async () => {
                setIsLoading(true);
                setResultsMessage([]);
                await runBulkDataTransferTest();
                setIsLoading(false);
              }}
              disabled={isLoading}
              color="#3b82f6"
            />
          </View>
          <View style={localStyles.buttonWrapper}>
            <Button
              title="Rapid Calls"
              onPress={async () => {
                setIsLoading(true);
                setResultsMessage([]);
                await runRapidCallsTest();
                setIsLoading(false);
              }}
              disabled={isLoading}
              color="#10b981"
            />
          </View>
          <View style={localStyles.buttonWrapper}>
            <Button
              title="Leak Test"
              onPress={async () => {
                setIsLoading(true);
                setResultsMessage([]);
                await runMemoryLeakTest();
                setIsLoading(false);
              }}
              disabled={isLoading}
              color="#ec4899"
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
    gap: 12,
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
    fontSize: 12,
    marginBottom: 2,
    color: '#374151',
  },
});
