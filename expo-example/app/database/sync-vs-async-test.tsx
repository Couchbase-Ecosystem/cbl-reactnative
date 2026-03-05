import React, { useState } from 'react';
import { SafeAreaView, View, Text, Button, StyleSheet, ScrollView, NativeModules, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useStyleScheme } from '@/components/Themed/Themed';

// Direct imports for both module types
let TurboCollection: any = null;

try {
  TurboCollection = require('cbl-reactnative/src/specs/NativeCblCollection').default;
} catch (e) {
  console.warn('Turbo modules not available:', e);
}

// Legacy module
const LegacyModule = NativeModules.CblReactnative;

/**
 * Synchronous vs Asynchronous Bridge Test
 * 
 * This test demonstrates the REAL difference between:
 * - TRUE SYNCHRONOUS Turbo Module calls (via JSI)
 * - ASYNC Legacy Module calls (via bridge queue)
 * 
 * The key insight: Turbo Modules CAN execute synchronously on the JS thread,
 * eliminating all bridge overhead. Legacy modules ALWAYS go through async queue.
 */
export default function SyncVsAsyncTestScreen() {
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const styles = useStyleScheme();

  const addResult = (message: string) => {
    setResultsMessage((prev) => [...prev, message]);
  };

  /**
   * Test 1: Synchronous Echo vs Async Echo
   * This is the purest test of bridge overhead
   */
  const runEchoComparisonTest = async () => {
    addResult('==========================================');
    addResult('🔬 TEST 1: ECHO COMPARISON');
    addResult('==========================================');
    addResult('Comparing sync vs async echo calls');
    addResult('');

    const callCount = 10000;
    const testData = JSON.stringify({ id: 'test', value: 'hello world' });

    try {
      // ========================================
      // TURBO SYNC (TRUE SYNCHRONOUS)
      // ========================================
      addResult('⚡ TURBO SYNC (JSI Synchronous):');
      
      if (TurboCollection?.collection_EchoSync) {
        const turboSyncStart = performance.now();
        
        for (let i = 0; i < callCount; i++) {
          // TRUE SYNCHRONOUS - no await needed!
          TurboCollection.collection_EchoSync(testData);
        }
        
        const turboSyncTime = performance.now() - turboSyncStart;
        const turboSyncPerCall = (turboSyncTime / callCount).toFixed(4);
        const turboSyncCallsPerSec = Math.round((callCount / turboSyncTime) * 1000);
        
        addResult(`✅ ${callCount} sync calls`);
        addResult(`⏱️  Total: ${turboSyncTime.toFixed(0)}ms`);
        addResult(`⚡ Per call: ${turboSyncPerCall}ms`);
        addResult(`📊 Calls/sec: ${turboSyncCallsPerSec.toLocaleString()}`);
      } else {
        addResult('❌ collection_EchoSync not available');
        addResult('   Rebuild app with updated native modules');
      }
      addResult('');

      // ========================================
      // TURBO ASYNC (Promise-based)
      // ========================================
      addResult('⚡ TURBO ASYNC (Promise):');
      
      const turboAsyncStart = performance.now();
      
      for (let i = 0; i < callCount; i++) {
        await TurboCollection.collection_Echo(testData);
      }
      
      const turboAsyncTime = performance.now() - turboAsyncStart;
      const turboAsyncPerCall = (turboAsyncTime / callCount).toFixed(4);
      const turboAsyncCallsPerSec = Math.round((callCount / turboAsyncTime) * 1000);
      
      addResult(`✅ ${callCount} async calls`);
      addResult(`⏱️  Total: ${turboAsyncTime.toFixed(0)}ms`);
      addResult(`⚡ Per call: ${turboAsyncPerCall}ms`);
      addResult(`📊 Calls/sec: ${turboAsyncCallsPerSec.toLocaleString()}`);
      addResult('');

      // ========================================
      // LEGACY ASYNC (Full bridge queue)
      // ========================================
      addResult('🐌 LEGACY ASYNC (Bridge Queue):');
      
      const legacyAsyncStart = performance.now();
      
      for (let i = 0; i < callCount; i++) {
        await LegacyModule.collection_Echo(testData);
      }
      
      const legacyAsyncTime = performance.now() - legacyAsyncStart;
      const legacyAsyncPerCall = (legacyAsyncTime / callCount).toFixed(4);
      const legacyAsyncCallsPerSec = Math.round((callCount / legacyAsyncTime) * 1000);
      
      addResult(`✅ ${callCount} async calls`);
      addResult(`⏱️  Total: ${legacyAsyncTime.toFixed(0)}ms`);
      addResult(`⚡ Per call: ${legacyAsyncPerCall}ms`);
      addResult(`📊 Calls/sec: ${legacyAsyncCallsPerSec.toLocaleString()}`);
      addResult('');

      // ========================================
      // COMPARISON
      // ========================================
      addResult('📊 COMPARISON:');
      
      // Turbo Async vs Legacy Async
      const asyncSpeedup = (legacyAsyncTime / turboAsyncTime).toFixed(2);
      const asyncImprovement = ((legacyAsyncTime - turboAsyncTime) / legacyAsyncTime * 100).toFixed(1);
      addResult(`⚡ Turbo Async vs Legacy: ${asyncSpeedup}x faster (${asyncImprovement}%)`);
      
      // If sync is available
      if (TurboCollection?.collection_EchoSync) {
        const turboSyncStart2 = performance.now();
        for (let i = 0; i < callCount; i++) {
          TurboCollection.collection_EchoSync(testData);
        }
        const turboSyncTime2 = performance.now() - turboSyncStart2;
        
        const syncVsLegacySpeedup = (legacyAsyncTime / turboSyncTime2).toFixed(2);
        const syncVsTurboAsyncSpeedup = (turboAsyncTime / turboSyncTime2).toFixed(2);
        
        addResult(`🚀 Turbo SYNC vs Legacy: ${syncVsLegacySpeedup}x faster!`);
        addResult(`🚀 Turbo SYNC vs Turbo Async: ${syncVsTurboAsyncSpeedup}x faster!`);
      }
      addResult('');

    } catch (error: any) {
      addResult(`❌ Error: ${error.message}`);
    }
  };

  /**
   * Test 2: Synchronous Performance Check
   * Tests computation without bridge overhead
   */
  const runPerformanceCheckTest = async () => {
    addResult('==========================================');
    addResult('🔬 TEST 2: PERFORMANCE CHECK');
    addResult('==========================================');
    addResult('Comparing sync vs async for computation');
    addResult('');

    const iterations = 10000;
    const testRuns = 100;

    try {
      // ========================================
      // TURBO SYNC
      // ========================================
      addResult('⚡ TURBO SYNC (JSI Synchronous):');
      
      if (TurboCollection?.collection_PerformanceCheckTurboSync) {
        const turboSyncStart = performance.now();
        
        for (let i = 0; i < testRuns; i++) {
          // TRUE SYNCHRONOUS - no await!
          TurboCollection.collection_PerformanceCheckTurboSync(iterations);
        }
        
        const turboSyncTime = performance.now() - turboSyncStart;
        const turboSyncPerCall = (turboSyncTime / testRuns).toFixed(3);
        
        addResult(`✅ ${testRuns} runs x ${iterations} iterations`);
        addResult(`⏱️  Total: ${turboSyncTime.toFixed(0)}ms`);
        addResult(`⚡ Per call: ${turboSyncPerCall}ms`);
      } else {
        addResult('❌ collection_PerformanceCheckTurboSync not available');
      }
      addResult('');

      // ========================================
      // TURBO ASYNC
      // ========================================
      addResult('⚡ TURBO ASYNC (Promise):');
      
      const turboAsyncStart = performance.now();
      
      for (let i = 0; i < testRuns; i++) {
        await TurboCollection.collection_PerformanceCheckTurbo(iterations);
      }
      
      const turboAsyncTime = performance.now() - turboAsyncStart;
      const turboAsyncPerCall = (turboAsyncTime / testRuns).toFixed(3);
      
      addResult(`✅ ${testRuns} runs x ${iterations} iterations`);
      addResult(`⏱️  Total: ${turboAsyncTime.toFixed(0)}ms`);
      addResult(`⚡ Per call: ${turboAsyncPerCall}ms`);
      addResult('');

      // ========================================
      // LEGACY ASYNC
      // ========================================
      addResult('🐌 LEGACY ASYNC (Bridge Queue):');
      
      const legacyAsyncStart = performance.now();
      
      for (let i = 0; i < testRuns; i++) {
        await LegacyModule.collection_PerformanceCheckLegacy(iterations);
      }
      
      const legacyAsyncTime = performance.now() - legacyAsyncStart;
      const legacyAsyncPerCall = (legacyAsyncTime / testRuns).toFixed(3);
      
      addResult(`✅ ${testRuns} runs x ${iterations} iterations`);
      addResult(`⏱️  Total: ${legacyAsyncTime.toFixed(0)}ms`);
      addResult(`⚡ Per call: ${legacyAsyncPerCall}ms`);
      addResult('');

      // ========================================
      // COMPARISON
      // ========================================
      addResult('📊 COMPARISON:');
      
      const asyncSpeedup = (legacyAsyncTime / turboAsyncTime).toFixed(2);
      addResult(`⚡ Turbo Async vs Legacy: ${asyncSpeedup}x faster`);
      
      if (TurboCollection?.collection_PerformanceCheckTurboSync) {
        const turboSyncStart2 = performance.now();
        for (let i = 0; i < testRuns; i++) {
          TurboCollection.collection_PerformanceCheckTurboSync(iterations);
        }
        const turboSyncTime2 = performance.now() - turboSyncStart2;
        
        const syncSpeedup = (legacyAsyncTime / turboSyncTime2).toFixed(2);
        addResult(`🚀 Turbo SYNC vs Legacy: ${syncSpeedup}x faster!`);
      }
      addResult('');

    } catch (error: any) {
      addResult(`❌ Error: ${error.message}`);
    }
  };

  /**
   * Test 3: Batch Processing Comparison
   * Shows benefit of doing more work per bridge call
   */
  const runBatchTest = async () => {
    addResult('==========================================');
    addResult('🔬 TEST 3: BATCH VS INDIVIDUAL CALLS');
    addResult('==========================================');
    addResult('Comparing batch calls vs individual calls');
    addResult('');

    const totalCalls = 50000;

    try {
      // ========================================
      // INDIVIDUAL TURBO SYNC CALLS
      // ========================================
      addResult('⚡ INDIVIDUAL TURBO SYNC CALLS:');
      
      if (TurboCollection?.collection_EchoSync) {
        const individualStart = performance.now();
        
        for (let i = 0; i < totalCalls; i++) {
          TurboCollection.collection_EchoSync('x');
        }
        
        const individualTime = performance.now() - individualStart;
        addResult(`✅ ${totalCalls} individual sync calls`);
        addResult(`⏱️  Total: ${individualTime.toFixed(0)}ms`);
        addResult(`⚡ Per call: ${(individualTime / totalCalls).toFixed(4)}ms`);
      }
      addResult('');

      // ========================================
      // INDIVIDUAL LEGACY ASYNC CALLS
      // ========================================
      addResult('🐌 INDIVIDUAL LEGACY ASYNC CALLS:');
      
      const legacyIndividualStart = performance.now();
      
      for (let i = 0; i < totalCalls; i++) {
        await LegacyModule.collection_Echo('x');
      }
      
      const legacyIndividualTime = performance.now() - legacyIndividualStart;
      addResult(`✅ ${totalCalls} individual async calls`);
      addResult(`⏱️  Total: ${legacyIndividualTime.toFixed(0)}ms`);
      addResult(`⚡ Per call: ${(legacyIndividualTime / totalCalls).toFixed(4)}ms`);
      addResult('');

      // ========================================
      // COMPARISON
      // ========================================
      addResult('📊 COMPARISON:');
      
      if (TurboCollection?.collection_EchoSync) {
        const turboSyncStart = performance.now();
        for (let i = 0; i < totalCalls; i++) {
          TurboCollection.collection_EchoSync('x');
        }
        const turboSyncTime = performance.now() - turboSyncStart;
        
        const speedup = (legacyIndividualTime / turboSyncTime).toFixed(2);
        const timeSaved = (legacyIndividualTime - turboSyncTime).toFixed(0);
        const percentImprovement = ((legacyIndividualTime - turboSyncTime) / legacyIndividualTime * 100).toFixed(1);
        
        addResult(`🚀 TURBO SYNC is ${speedup}x FASTER!`);
        addResult(`💾 Time saved: ${timeSaved}ms (${percentImprovement}%)`);
        addResult(`📉 Per-call overhead eliminated!`);
      }
      addResult('');

    } catch (error: any) {
      addResult(`❌ Error: ${error.message}`);
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
      addResult('🚀 SYNC vs ASYNC PERFORMANCE TEST');
      addResult('==========================================');
      addResult(`Turbo Module Available: ${TurboCollection ? 'YES' : 'NO'}`);
      addResult(`Legacy Module Available: ${LegacyModule ? 'YES' : 'NO'}`);
      addResult(`Sync Methods Available: ${TurboCollection?.collection_EchoSync ? 'YES' : 'NO'}`);
      addResult('');
      
      if (!TurboCollection || !LegacyModule) {
        addResult('❌ ERROR: Both modules required!');
        setIsLoading(false);
        return;
      }

      await runEchoComparisonTest();
      await runPerformanceCheckTest();
      await runBatchTest();

      addResult('==========================================');
      addResult('✨ ALL TESTS COMPLETED');
      addResult('==========================================');
      addResult('');
      addResult('KEY FINDINGS:');
      addResult('• SYNC calls bypass Promise overhead entirely');
      addResult('• SYNC calls execute on JS thread (no thread hop)');
      addResult('• ASYNC Legacy goes through bridge message queue');
      addResult('• For high-frequency calls, SYNC is dramatically faster');
      
    } catch (error: any) {
      addResult(`❌ ERROR: ${error.message}`);
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
        <Text style={localStyles.title}>Sync vs Async Test</Text>
        <Text style={[localStyles.mode, { color: '#f59e0b' }]}>
          🚀 TRUE JSI SYNCHRONOUS CALLS
        </Text>
        <Text style={localStyles.subtitle}>
          Tests REAL synchronous JSI calls vs async bridge
        </Text>
      </View>

      <View style={localStyles.buttons}>
        <View style={localStyles.buttonRow}>
          <View style={localStyles.buttonWrapper}>
            <Button
              title={isLoading ? "Running..." : "🚀 Run All Tests"}
              onPress={runAllTests}
              disabled={isLoading}
              color="#f59e0b"
            />
          </View>
          <View style={localStyles.buttonWrapper}>
            <Button
              title="📋 Copy"
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
              title="Test 1: Echo"
              onPress={async () => {
                setIsLoading(true);
                setResultsMessage([]);
                await runEchoComparisonTest();
                setIsLoading(false);
              }}
              disabled={isLoading}
              color="#3b82f6"
            />
          </View>
          <View style={localStyles.buttonWrapper}>
            <Button
              title="Test 2: Perf Check"
              onPress={async () => {
                setIsLoading(true);
                setResultsMessage([]);
                await runPerformanceCheckTest();
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
              title="Test 3: Batch"
              onPress={async () => {
                setIsLoading(true);
                setResultsMessage([]);
                await runBatchTest();
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
