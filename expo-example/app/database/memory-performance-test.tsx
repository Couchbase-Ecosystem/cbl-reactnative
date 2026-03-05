import React, { useState } from 'react';
import { SafeAreaView, View, Text, Button, StyleSheet, ScrollView, NativeModules, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useStyleScheme } from '@/components/Themed/Themed';
import { USE_TURBO_MODULES } from 'cbl-reactnative/src/feature-flags';
import {
  captureMemorySnapshot,
  formatBytes,
  calculateMemoryDelta,
  forceGarbageCollection,
  wait,
  MemorySnapshot,
  getBestMemoryValue,
  formatMemorySnapshot,
} from '../../hooks/memory-utils';

// Direct imports for both module types
let TurboDatabase: any = null;
let TurboCollection: any = null;

try {
  TurboDatabase = require('cbl-reactnative/src/specs/NativeCblDatabase').default;
  TurboCollection = require('cbl-reactnative/src/specs/NativeCblCollection').default;
} catch (e) {
  console.warn('Turbo modules not available:', e);
}

// Legacy module
const LegacyModule = NativeModules.CblReactnative;

/**
 * Memory Performance Test Screen
 * 
 * Tests memory usage differences between Turbo Modules and Legacy Modules:
 * - Test 1: Bulk Data Transfer (large payloads)
 * - Test 2: Rapid Calls (many small calls)
 * - Test 3: Memory Leak Detection (repeated cycles)
 * - Test 4: Peak Memory Under Load
 */
export default function MemoryPerformanceTestScreen() {
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const styles = useStyleScheme();

  const addResult = (message: string) => {
    setResultsMessage((prev) => [...prev, message]);
  };

  const generateLargeDocument = (index: number, sizeKB: number = 10) => {
    // Generate a document of approximately sizeKB kilobytes
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
        coordinates: {
          lat: 37.7749,
          lng: -122.4194,
        },
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

    // Add padding to reach desired size
    const baseSize = JSON.stringify(baseDoc).length;
    const targetSize = sizeKB * 1024;
    const paddingSize = Math.max(0, targetSize - baseSize);
    
    return {
      ...baseDoc,
      padding: 'x'.repeat(paddingSize),
    };
  };

  /**
   * TEST 1: Bulk Data Transfer Test
   * Measures memory overhead when passing large amounts of data across the bridge
   * NOW INCLUDES SYNC vs ASYNC comparison!
   */
  const runBulkDataTransferTest = async () => {
    addResult('==========================================');
    addResult('🔬 TEST 1: BULK DATA TRANSFER');
    addResult('==========================================');
    addResult('Tests memory overhead for large data transfers');
    addResult('Compares: SYNC Turbo vs ASYNC Turbo vs Legacy');
    addResult('');

    const documentCount = 1000;
    const documentSizeKB = 10;
    
    // Store results for comparison
    let turboSyncTime = 0;
    let turboSyncPeakMemory = 0;
    let turboSyncDelta: number | null = null;
    
    let turboAsyncTime = 0;
    let turboAsyncPeakMemory = 0;
    let turboAsyncDelta: number | null = null;
    
    let legacyTime = 0;
    let legacyPeakMemory = 0;
    let legacyDelta: number | null = null;
    
    try {
      // ============================================================
      // TURBO SYNC TEST (TRUE SYNCHRONOUS - No Promise!)
      // ============================================================
      if (TurboCollection?.collection_EchoSync) {
        addResult('🚀 TURBO SYNC (True Synchronous):');
        
        const turboSyncMemBefore = await captureMemorySnapshot(LegacyModule);
        const turboSyncBeforeValue = getBestMemoryValue(turboSyncMemBefore);
        addResult(`📊 Memory before: ${formatMemorySnapshot(turboSyncMemBefore)}`);
        
        const turboSyncStart = performance.now();
        turboSyncPeakMemory = turboSyncBeforeValue || 0;
        
        for (let i = 0; i < documentCount; i++) {
          const doc = generateLargeDocument(i, documentSizeKB);
          // TRUE SYNCHRONOUS - no await!
          TurboCollection.collection_EchoSync(JSON.stringify(doc));
          
          // Sample memory every 100 documents
          if (i % 100 === 0) {
            const snapshot = await captureMemorySnapshot(LegacyModule);
            const currentMem = getBestMemoryValue(snapshot);
            if (currentMem && currentMem > turboSyncPeakMemory) {
              turboSyncPeakMemory = currentMem;
            }
          }
        }
        
        turboSyncTime = performance.now() - turboSyncStart;
        const turboSyncMemAfter = await captureMemorySnapshot(LegacyModule);
        const turboSyncAfterValue = getBestMemoryValue(turboSyncMemAfter);
        turboSyncDelta = turboSyncAfterValue && turboSyncBeforeValue ? turboSyncAfterValue - turboSyncBeforeValue : null;
        
        addResult(`✅ Transferred ${documentCount} docs (${documentSizeKB}KB each)`);
        addResult(`⏱️  Time: ${turboSyncTime.toFixed(0)}ms`);
        addResult(`📊 Memory after: ${formatMemorySnapshot(turboSyncMemAfter)}`);
        addResult(`📈 Peak memory: ${formatBytes(turboSyncPeakMemory)}`);
        addResult(`💾 Memory delta: ${turboSyncDelta !== null ? formatBytes(turboSyncDelta) : 'N/A'}`);
        addResult('');

        // Wait and force GC
        await wait(1000);
        forceGarbageCollection();
        await wait(500);
      } else {
        addResult('⚠️  Turbo Sync not available - rebuild app');
        addResult('');
      }

      // ============================================================
      // TURBO ASYNC TEST (Promise-based)
      // ============================================================
      addResult('⚡ TURBO ASYNC (Promise-based):');
      
      const turboAsyncMemBefore = await captureMemorySnapshot(LegacyModule);
      const turboAsyncBeforeValue = getBestMemoryValue(turboAsyncMemBefore);
      addResult(`📊 Memory before: ${formatMemorySnapshot(turboAsyncMemBefore)}`);
      
      const turboAsyncStart = performance.now();
      turboAsyncPeakMemory = turboAsyncBeforeValue || 0;
      
      for (let i = 0; i < documentCount; i++) {
        const doc = generateLargeDocument(i, documentSizeKB);
        await TurboCollection.collection_Echo(JSON.stringify(doc));
        
        // Sample memory every 100 documents
        if (i % 100 === 0) {
          const snapshot = await captureMemorySnapshot(LegacyModule);
          const currentMem = getBestMemoryValue(snapshot);
          if (currentMem && currentMem > turboAsyncPeakMemory) {
            turboAsyncPeakMemory = currentMem;
          }
        }
      }
      
      turboAsyncTime = performance.now() - turboAsyncStart;
      const turboAsyncMemAfter = await captureMemorySnapshot(LegacyModule);
      const turboAsyncAfterValue = getBestMemoryValue(turboAsyncMemAfter);
      turboAsyncDelta = turboAsyncAfterValue && turboAsyncBeforeValue ? turboAsyncAfterValue - turboAsyncBeforeValue : null;
      
      addResult(`✅ Transferred ${documentCount} docs (${documentSizeKB}KB each)`);
      addResult(`⏱️  Time: ${turboAsyncTime.toFixed(0)}ms`);
      addResult(`📊 Memory after: ${formatMemorySnapshot(turboAsyncMemAfter)}`);
      addResult(`📈 Peak memory: ${formatBytes(turboAsyncPeakMemory)}`);
      addResult(`💾 Memory delta: ${turboAsyncDelta !== null ? formatBytes(turboAsyncDelta) : 'N/A'}`);
      addResult('');

      // Wait and force GC
      await wait(1000);
      forceGarbageCollection();
      await wait(500);

      // ============================================================
      // LEGACY ASYNC TEST (Full Bridge Queue)
      // ============================================================
      addResult('🐌 LEGACY ASYNC (Bridge Queue):');
      
      const legacyMemBefore = await captureMemorySnapshot(LegacyModule);
      const legacyBeforeValue = getBestMemoryValue(legacyMemBefore);
      addResult(`📊 Memory before: ${formatMemorySnapshot(legacyMemBefore)}`);
      
      const legacyStart = performance.now();
      legacyPeakMemory = legacyBeforeValue || 0;
      
      for (let i = 0; i < documentCount; i++) {
        const doc = generateLargeDocument(i, documentSizeKB);
        await LegacyModule.collection_Echo(JSON.stringify(doc));
        
        // Sample memory every 100 documents
        if (i % 100 === 0) {
          const snapshot = await captureMemorySnapshot(LegacyModule);
          const currentMem = getBestMemoryValue(snapshot);
          if (currentMem && currentMem > legacyPeakMemory) {
            legacyPeakMemory = currentMem;
          }
        }
      }
      
      legacyTime = performance.now() - legacyStart;
      const legacyMemAfter = await captureMemorySnapshot(LegacyModule);
      const legacyAfterValue = getBestMemoryValue(legacyMemAfter);
      legacyDelta = legacyAfterValue && legacyBeforeValue ? legacyAfterValue - legacyBeforeValue : null;
      
      addResult(`✅ Transferred ${documentCount} docs (${documentSizeKB}KB each)`);
      addResult(`⏱️  Time: ${legacyTime.toFixed(0)}ms`);
      addResult(`📊 Memory after: ${formatMemorySnapshot(legacyMemAfter)}`);
      addResult(`📈 Peak memory: ${formatBytes(legacyPeakMemory)}`);
      addResult(`💾 Memory delta: ${legacyDelta !== null ? formatBytes(legacyDelta) : 'N/A'}`);
      addResult('');

      // ============================================================
      // COMPARISON
      // ============================================================
      addResult('📊 SPEED COMPARISON:');
      addResult(`🚀 Turbo SYNC:  ${turboSyncTime.toFixed(0)}ms`);
      addResult(`⚡ Turbo Async: ${turboAsyncTime.toFixed(0)}ms`);
      addResult(`🐌 Legacy:      ${legacyTime.toFixed(0)}ms`);
      addResult('');
      
      if (turboSyncTime > 0) {
        const syncVsLegacy = (legacyTime / turboSyncTime).toFixed(2);
        const syncVsAsync = (turboAsyncTime / turboSyncTime).toFixed(2);
        addResult(`🚀 Turbo SYNC vs Legacy: ${syncVsLegacy}x faster`);
        addResult(`🚀 Turbo SYNC vs Async:  ${syncVsAsync}x faster`);
      }
      
      const asyncVsLegacy = (legacyTime / turboAsyncTime).toFixed(2);
      addResult(`⚡ Turbo Async vs Legacy: ${asyncVsLegacy}x`);
      addResult('');
      
      addResult('📊 MEMORY COMPARISON:');
      if (turboSyncPeakMemory > 0) {
        addResult(`🚀 Turbo SYNC peak:  ${formatBytes(turboSyncPeakMemory)}`);
      }
      addResult(`⚡ Turbo Async peak: ${formatBytes(turboAsyncPeakMemory)}`);
      addResult(`🐌 Legacy peak:      ${formatBytes(legacyPeakMemory)}`);
      addResult('');
      
      if (turboSyncPeakMemory > 0 && legacyPeakMemory > 0) {
        const syncPeakSavings = legacyPeakMemory - turboSyncPeakMemory;
        const syncPeakPercent = ((syncPeakSavings / legacyPeakMemory) * 100).toFixed(1);
        addResult(`🚀 SYNC peak savings: ${formatBytes(syncPeakSavings)} (${syncPeakPercent}%)`);
      }
      
      if (turboAsyncPeakMemory > 0 && legacyPeakMemory > 0) {
        const asyncPeakSavings = legacyPeakMemory - turboAsyncPeakMemory;
        const asyncPeakPercent = ((asyncPeakSavings / legacyPeakMemory) * 100).toFixed(1);
        addResult(`⚡ Async peak savings: ${formatBytes(asyncPeakSavings)} (${asyncPeakPercent}%)`);
      }
      addResult('');

    } catch (error: any) {
      addResult(`❌ Error: ${error.message}`);
    }
  };

  /**
   * TEST 2: Rapid Calls Test
   * Measures memory overhead from many small bridge calls
   * NOW INCLUDES SYNC vs ASYNC comparison!
   */
  const runRapidCallsTest = async () => {
    addResult('==========================================');
    addResult('🔬 TEST 2: RAPID CALLS');
    addResult('==========================================');
    addResult('Tests memory overhead for many small calls');
    addResult('Compares: SYNC Turbo vs ASYNC Turbo vs Legacy');
    addResult('');

    const callCount = 50000;
    const smallPayload = JSON.stringify({ id: 'test', value: 'small data' });
    
    // Store results
    let turboSyncTime = 0;
    let turboAsyncTime = 0;
    let legacyTime = 0;
    
    try {
      // ============================================================
      // TURBO SYNC TEST (TRUE SYNCHRONOUS)
      // ============================================================
      if (TurboCollection?.collection_EchoSync) {
        addResult('🚀 TURBO SYNC (True Synchronous):');
        
        const turboSyncMemBefore = await captureMemorySnapshot(LegacyModule);
        const turboSyncBeforeValue = getBestMemoryValue(turboSyncMemBefore);
        addResult(`📊 Memory before: ${formatMemorySnapshot(turboSyncMemBefore)}`);
        
        const turboSyncStart = performance.now();
        let turboSyncPeakMemory = turboSyncBeforeValue || 0;
        
        for (let i = 0; i < callCount; i++) {
          // TRUE SYNCHRONOUS - no await!
          TurboCollection.collection_EchoSync(smallPayload);
          
          // Sample memory every 10000 calls
          if (i % 10000 === 0) {
            const snapshot = await captureMemorySnapshot(LegacyModule);
            const currentMem = getBestMemoryValue(snapshot);
            if (currentMem && currentMem > turboSyncPeakMemory) {
              turboSyncPeakMemory = currentMem;
            }
          }
        }
        
        turboSyncTime = performance.now() - turboSyncStart;
        const turboSyncMemAfter = await captureMemorySnapshot(LegacyModule);
        const turboSyncAfterValue = getBestMemoryValue(turboSyncMemAfter);
        const turboSyncDelta = turboSyncAfterValue && turboSyncBeforeValue ? turboSyncAfterValue - turboSyncBeforeValue : null;
        
        addResult(`✅ Made ${callCount.toLocaleString()} calls`);
        addResult(`⏱️  Time: ${turboSyncTime.toFixed(0)}ms`);
        addResult(`📊 Memory after: ${formatMemorySnapshot(turboSyncMemAfter)}`);
        addResult(`📈 Peak memory: ${formatBytes(turboSyncPeakMemory)}`);
        addResult(`💾 Memory delta: ${turboSyncDelta !== null ? formatBytes(turboSyncDelta) : 'N/A'}`);
        addResult(`⚡ Calls/sec: ${Math.round((callCount / turboSyncTime) * 1000).toLocaleString()}`);
        addResult('');

        // Wait and force GC
        await wait(1000);
        forceGarbageCollection();
        await wait(500);
      } else {
        addResult('⚠️  Turbo Sync not available - rebuild app');
        addResult('');
      }

      // ============================================================
      // TURBO ASYNC TEST
      // ============================================================
      addResult('⚡ TURBO ASYNC (Promise-based):');
      
      const turboAsyncMemBefore = await captureMemorySnapshot(LegacyModule);
      const turboAsyncBeforeValue = getBestMemoryValue(turboAsyncMemBefore);
      addResult(`📊 Memory before: ${formatMemorySnapshot(turboAsyncMemBefore)}`);
      
      const turboAsyncStart = performance.now();
      let turboAsyncPeakMemory = turboAsyncBeforeValue || 0;
      
      for (let i = 0; i < callCount; i++) {
        await TurboCollection.collection_Echo(smallPayload);
        
        // Sample memory every 10000 calls
        if (i % 10000 === 0) {
          const snapshot = await captureMemorySnapshot(LegacyModule);
          const currentMem = getBestMemoryValue(snapshot);
          if (currentMem && currentMem > turboAsyncPeakMemory) {
            turboAsyncPeakMemory = currentMem;
          }
        }
      }
      
      turboAsyncTime = performance.now() - turboAsyncStart;
      const turboAsyncMemAfter = await captureMemorySnapshot(LegacyModule);
      const turboAsyncAfterValue = getBestMemoryValue(turboAsyncMemAfter);
      const turboAsyncDelta = turboAsyncAfterValue && turboAsyncBeforeValue ? turboAsyncAfterValue - turboAsyncBeforeValue : null;
      
      addResult(`✅ Made ${callCount.toLocaleString()} calls`);
      addResult(`⏱️  Time: ${turboAsyncTime.toFixed(0)}ms`);
      addResult(`📊 Memory after: ${formatMemorySnapshot(turboAsyncMemAfter)}`);
      addResult(`📈 Peak memory: ${formatBytes(turboAsyncPeakMemory)}`);
      addResult(`💾 Memory delta: ${turboAsyncDelta !== null ? formatBytes(turboAsyncDelta) : 'N/A'}`);
      addResult(`⚡ Calls/sec: ${Math.round((callCount / turboAsyncTime) * 1000).toLocaleString()}`);
      addResult('');

      // Wait and force GC
      await wait(1000);
      forceGarbageCollection();
      await wait(500);

      // ============================================================
      // LEGACY ASYNC TEST
      // ============================================================
      addResult('🐌 LEGACY ASYNC (Bridge Queue):');
      
      const legacyMemBefore = await captureMemorySnapshot(LegacyModule);
      const legacyBeforeValue = getBestMemoryValue(legacyMemBefore);
      addResult(`📊 Memory before: ${formatMemorySnapshot(legacyMemBefore)}`);
      
      const legacyStart = performance.now();
      let legacyPeakMemory = legacyBeforeValue || 0;
      
      for (let i = 0; i < callCount; i++) {
        await LegacyModule.collection_Echo(smallPayload);
        
        // Sample memory every 10000 calls
        if (i % 10000 === 0) {
          const snapshot = await captureMemorySnapshot(LegacyModule);
          const currentMem = getBestMemoryValue(snapshot);
          if (currentMem && currentMem > legacyPeakMemory) {
            legacyPeakMemory = currentMem;
          }
        }
      }
      
      legacyTime = performance.now() - legacyStart;
      const legacyMemAfter = await captureMemorySnapshot(LegacyModule);
      const legacyAfterValue = getBestMemoryValue(legacyMemAfter);
      const legacyDelta = legacyAfterValue && legacyBeforeValue ? legacyAfterValue - legacyBeforeValue : null;
      
      addResult(`✅ Made ${callCount.toLocaleString()} calls`);
      addResult(`⏱️  Time: ${legacyTime.toFixed(0)}ms`);
      addResult(`📊 Memory after: ${formatMemorySnapshot(legacyMemAfter)}`);
      addResult(`📈 Peak memory: ${formatBytes(legacyPeakMemory)}`);
      addResult(`💾 Memory delta: ${legacyDelta !== null ? formatBytes(legacyDelta) : 'N/A'}`);
      addResult(`⚡ Calls/sec: ${Math.round((callCount / legacyTime) * 1000).toLocaleString()}`);
      addResult('');

      // ============================================================
      // COMPARISON
      // ============================================================
      addResult('📊 SPEED COMPARISON:');
      if (turboSyncTime > 0) {
        addResult(`🚀 Turbo SYNC:  ${turboSyncTime.toFixed(0)}ms (${Math.round((callCount / turboSyncTime) * 1000).toLocaleString()} calls/sec)`);
      }
      addResult(`⚡ Turbo Async: ${turboAsyncTime.toFixed(0)}ms (${Math.round((callCount / turboAsyncTime) * 1000).toLocaleString()} calls/sec)`);
      addResult(`🐌 Legacy:      ${legacyTime.toFixed(0)}ms (${Math.round((callCount / legacyTime) * 1000).toLocaleString()} calls/sec)`);
      addResult('');
      
      if (turboSyncTime > 0) {
        const syncVsLegacy = (legacyTime / turboSyncTime).toFixed(2);
        const syncVsAsync = (turboAsyncTime / turboSyncTime).toFixed(2);
        addResult(`🚀 Turbo SYNC vs Legacy: ${syncVsLegacy}x faster`);
        addResult(`🚀 Turbo SYNC vs Async:  ${syncVsAsync}x faster`);
      }
      
      const asyncVsLegacy = (legacyTime / turboAsyncTime).toFixed(2);
      addResult(`⚡ Turbo Async vs Legacy: ${asyncVsLegacy}x`);
      addResult('');

    } catch (error: any) {
      addResult(`❌ Error: ${error.message}`);
    }
  };

  /**
   * TEST 3: Memory Leak Detection
   * Repeated allocation/deallocation cycles to check for memory leaks
   * NOW INCLUDES SYNC and uses native memory tracking!
   */
  const runMemoryLeakTest = async () => {
    addResult('==========================================');
    addResult('🔬 TEST 3: MEMORY LEAK DETECTION');
    addResult('==========================================');
    addResult('Tests for memory leaks over repeated cycles');
    addResult('Compares: SYNC Turbo vs ASYNC Turbo vs Legacy');
    addResult('');

    const cycles = 5;
    const opsPerCycle = 1000;
    const smallPayload = JSON.stringify({ id: 'test', value: 'leak test data' });
    
    try {
      // ============================================================
      // TURBO SYNC TEST
      // ============================================================
      if (TurboCollection?.collection_EchoSync) {
        addResult('🚀 TURBO SYNC:');
        
        const turboSyncBaseline = await captureMemorySnapshot(LegacyModule);
        const turboSyncBaselineValue = getBestMemoryValue(turboSyncBaseline);
        addResult(`📊 Baseline: ${formatMemorySnapshot(turboSyncBaseline)}`);
        
        for (let cycle = 0; cycle < cycles; cycle++) {
          for (let i = 0; i < opsPerCycle; i++) {
            // TRUE SYNCHRONOUS - no await
            TurboCollection.collection_EchoSync(smallPayload);
          }
          
          // Force GC and measure
          await wait(300);
          forceGarbageCollection();
          await wait(200);
          
          const snapshot = await captureMemorySnapshot(LegacyModule);
          const currentMem = getBestMemoryValue(snapshot);
          if (currentMem) {
            addResult(`  Cycle ${cycle + 1}: ${formatBytes(currentMem)}`);
          }
        }
        
        const turboSyncFinal = await captureMemorySnapshot(LegacyModule);
        const turboSyncFinalValue = getBestMemoryValue(turboSyncFinal);
        const turboSyncDelta = turboSyncFinalValue && turboSyncBaselineValue 
          ? turboSyncFinalValue - turboSyncBaselineValue : null;
        
        addResult(`📊 Final: ${formatMemorySnapshot(turboSyncFinal)}`);
        addResult(`💾 Net change: ${turboSyncDelta !== null ? formatBytes(turboSyncDelta) : 'N/A'}`);
        addResult('');

        await wait(1000);
        forceGarbageCollection();
        await wait(500);
      }

      // ============================================================
      // TURBO ASYNC TEST
      // ============================================================
      addResult('⚡ TURBO ASYNC:');
      
      const turboAsyncBaseline = await captureMemorySnapshot(LegacyModule);
      const turboAsyncBaselineValue = getBestMemoryValue(turboAsyncBaseline);
      addResult(`📊 Baseline: ${formatMemorySnapshot(turboAsyncBaseline)}`);
      
      for (let cycle = 0; cycle < cycles; cycle++) {
        for (let i = 0; i < opsPerCycle; i++) {
          await TurboCollection.collection_Echo(smallPayload);
        }
        
        await wait(300);
        forceGarbageCollection();
        await wait(200);
        
        const snapshot = await captureMemorySnapshot(LegacyModule);
        const currentMem = getBestMemoryValue(snapshot);
        if (currentMem) {
          addResult(`  Cycle ${cycle + 1}: ${formatBytes(currentMem)}`);
        }
      }
      
      const turboAsyncFinal = await captureMemorySnapshot(LegacyModule);
      const turboAsyncFinalValue = getBestMemoryValue(turboAsyncFinal);
      const turboAsyncDelta = turboAsyncFinalValue && turboAsyncBaselineValue 
        ? turboAsyncFinalValue - turboAsyncBaselineValue : null;
      
      addResult(`📊 Final: ${formatMemorySnapshot(turboAsyncFinal)}`);
      addResult(`💾 Net change: ${turboAsyncDelta !== null ? formatBytes(turboAsyncDelta) : 'N/A'}`);
      addResult('');

      await wait(1000);
      forceGarbageCollection();
      await wait(500);

      // ============================================================
      // LEGACY ASYNC TEST
      // ============================================================
      addResult('🐌 LEGACY ASYNC:');
      
      const legacyBaseline = await captureMemorySnapshot(LegacyModule);
      const legacyBaselineValue = getBestMemoryValue(legacyBaseline);
      addResult(`📊 Baseline: ${formatMemorySnapshot(legacyBaseline)}`);
      
      for (let cycle = 0; cycle < cycles; cycle++) {
        for (let i = 0; i < opsPerCycle; i++) {
          await LegacyModule.collection_Echo(smallPayload);
        }
        
        await wait(300);
        forceGarbageCollection();
        await wait(200);
        
        const snapshot = await captureMemorySnapshot(LegacyModule);
        const currentMem = getBestMemoryValue(snapshot);
        if (currentMem) {
          addResult(`  Cycle ${cycle + 1}: ${formatBytes(currentMem)}`);
        }
      }
      
      const legacyFinal = await captureMemorySnapshot(LegacyModule);
      const legacyFinalValue = getBestMemoryValue(legacyFinal);
      const legacyDelta = legacyFinalValue && legacyBaselineValue 
        ? legacyFinalValue - legacyBaselineValue : null;
      
      addResult(`📊 Final: ${formatMemorySnapshot(legacyFinal)}`);
      addResult(`💾 Net change: ${legacyDelta !== null ? formatBytes(legacyDelta) : 'N/A'}`);
      addResult('');

      // ============================================================
      // COMPARISON
      // ============================================================
      addResult('📊 LEAK ANALYSIS:');
      addResult('(Smaller net change = better memory management)');
      addResult('');
      
      // Check for leaks (if net change is > 1MB after GC, might be a leak)
      const leakThreshold = 1024 * 1024; // 1MB
      
      if (turboAsyncDelta !== null) {
        if (Math.abs(turboAsyncDelta) < leakThreshold) {
          addResult('✅ Turbo Async: No significant leak');
        } else {
          addResult(`⚠️  Turbo Async: ${formatBytes(turboAsyncDelta)} retained`);
        }
      }
      
      if (legacyDelta !== null) {
        if (Math.abs(legacyDelta) < leakThreshold) {
          addResult('✅ Legacy: No significant leak');
        } else {
          addResult(`⚠️  Legacy: ${formatBytes(legacyDelta)} retained`);
        }
      }
      addResult('');

    } catch (error: any) {
      addResult(`❌ Error: ${error.message}`);
    }
  };

  /**
   * Run all memory tests in sequence
   */
  const runAllTests = async () => {
    setIsLoading(true);
    setResultsMessage([]);
    
    try {
      addResult('==========================================');
      addResult('🧪 MEMORY PERFORMANCE TEST SUITE');
      addResult('==========================================');
      addResult(`Turbo Modules Available: ${TurboCollection ? 'YES' : 'NO'}`);
      addResult(`Legacy Module Available: ${LegacyModule ? 'YES' : 'NO'}`);
      addResult(`GC Available: ${typeof (global as any).gc === 'function' ? 'YES' : 'NO'}`);
      
      const hasJSMemory = typeof (performance as any).memory !== 'undefined';
      addResult(`JS Heap Memory (performance.memory): ${hasJSMemory ? 'YES' : 'NO'}`);
      addResult('');

      // Check native memory
      const nativeMemCheck = await captureMemorySnapshot(LegacyModule);
      const hasNativeMemory = nativeMemCheck.native !== undefined;
      addResult(`Native Memory Tracking: ${hasNativeMemory ? 'YES' : 'NO'}`);
      if (hasNativeMemory) {
        addResult(`  Current: ${formatMemorySnapshot(nativeMemCheck)}`);
      }
      addResult('');

      if (!TurboCollection || !LegacyModule) {
        addResult('❌ ERROR: Both Turbo and Legacy modules required!');
        setIsLoading(false);
        return;
      }

      if (!hasJSMemory && !hasNativeMemory) {
        addResult('⚠️  WARNING: No memory tracking available!');
        addResult('');
        addResult('📋 HOW TO ENABLE MEMORY TRACKING:');
        addResult('');
        addResult('Option 1: Chrome DevTools (JS Heap)');
        addResult('  1. Run: npx expo start');
        addResult('  2. Press "j" to open debugger');
        addResult('  3. Or go to chrome://inspect');
        addResult('');
        addResult('Option 2: Xcode Instruments (iOS)');
        addResult('  1. Open Xcode → Product → Profile');
        addResult('  2. Select "Allocations" instrument');
        addResult('  3. Run app and monitor memory');
        addResult('');
        addResult('Option 3: Android Profiler');
        addResult('  1. Open Android Studio');
        addResult('  2. View → Tool Windows → Profiler');
        addResult('  3. Select Memory profiler');
        addResult('');
        addResult('The tests will still run to measure SPEED,');
        addResult('but memory values will show as N/A.');
        addResult('');
      } else if (!hasJSMemory) {
        addResult('ℹ️  Using Native memory tracking only');
        addResult('   For JS heap stats, use Chrome debugger');
        addResult('');
      }

      // Run all tests
      await runBulkDataTransferTest();
      await wait(3000); // Stabilization between tests
      
      await runRapidCallsTest();
      await wait(3000);
      
      await runMemoryLeakTest();

      addResult('==========================================');
      addResult('✨ ALL TESTS COMPLETED');
      addResult('==========================================');
      addResult('');
      addResult('💡 NOTE: Memory results are most accurate when:');
      addResult('   - Running with Chrome DevTools attached');
      addResult('   - Or using Xcode/Android Studio profilers');
      
    } catch (error: any) {
      addResult('');
      addResult('❌ ERROR');
      addResult(`Error: ${error.message}`);
      if (error.stack) {
        addResult(`Stack: ${error.stack.substring(0, 500)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResultsMessage([]);
  };

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
        <Text style={localStyles.title}>Memory Performance Test</Text>
        <Text
          style={[
            localStyles.mode,
            { color: '#ec4899' },
          ]}
        >
          🧪 MEMORY PROFILING
        </Text>
        <Text style={localStyles.subtitle}>
          Compares memory usage: Turbo Modules vs Legacy Bridge
        </Text>
      </View>

      <View style={localStyles.buttons}>
        <View style={localStyles.buttonRow}>
          <View style={localStyles.buttonWrapper}>
            <Button
              title={isLoading ? "Running..." : "🧪 Run All Tests"}
              onPress={runAllTests}
              disabled={isLoading}
              color="#ec4899"
            />
          </View>
          <View style={localStyles.buttonWrapper}>
            <Button
              title="📋 Copy"
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
              title="Test 1: Bulk Transfer"
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
              title="Test 2: Rapid Calls"
              onPress={async () => {
                setIsLoading(true);
                setResultsMessage([]);
                await runRapidCallsTest();
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
              title="Test 3: Leak Detection"
              onPress={async () => {
                setIsLoading(true);
                setResultsMessage([]);
                await runMemoryLeakTest();
                setIsLoading(false);
              }}
              disabled={isLoading}
              color="#10b981"
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
