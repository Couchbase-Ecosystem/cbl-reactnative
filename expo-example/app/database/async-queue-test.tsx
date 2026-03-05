import React, { useState } from 'react';
import { SafeAreaView, View, Text, Button, StyleSheet, ScrollView, NativeModules } from 'react-native';
import { useStyleScheme } from '@/components/Themed/Themed';
import { USE_TURBO_MODULES } from 'cbl-reactnative/src/feature-flags';

// Direct imports for Turbo Module
let TurboCollection: any = null;

try {
  TurboCollection = require('cbl-reactnative/src/specs/NativeCblCollection').default;
} catch (e) {
  console.warn('Turbo modules not available:', e);
}

// Legacy module
const LegacyModule = NativeModules.CblReactnative;

/**
 * Async Queue Overhead Test
 * 
 * Compares two performance check functions:
 * 
 * 1. Turbo: collection_PerformanceCheckTurbo()
 *    - Executes directly on JSI thread (NO async queue dispatch)
 *    - Minimal overhead
 * 
 * 2. Legacy: collection_PerformanceCheckLegacy()
 *    - Uses backgroundQueue.async (standard pattern)
 *    - Includes queue dispatch + thread switching overhead
 * 
 * Both do the SAME computation (sum loop), isolating async queue impact.
 */
export default function AsyncQueueTestScreen() {
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const styles = useStyleScheme();

  const addResult = (message: string) => {
    setResultsMessage((prev) => [...prev, message]);
  };

  const runAsyncQueueTest = async () => {
    setIsLoading(true);
    setResultsMessage([]);
    
    const bridgeCalls = 10000; // Number of times to call the performance check
    const iterations = 1000; // Computation iterations inside each call
    
    try {
      addResult('==========================================');
      addResult('⚙️  ASYNC QUEUE OVERHEAD TEST');
      addResult('==========================================');
      addResult('Compares direct JSI vs async queue dispatch');
      addResult('');
      addResult(`Bridge calls: ${bridgeCalls.toLocaleString()}`);
      addResult(`Iterations per call: ${iterations.toLocaleString()}`);
      addResult('');

      if (!TurboCollection) {
        addResult('❌ ERROR: Turbo modules not available!');
        setIsLoading(false);
        return;
      }

      if (!LegacyModule) {
        addResult('❌ ERROR: Legacy module not available!');
        setIsLoading(false);
        return;
      }

      // ============================================================
      // TURBO SYNC TEST - TRUE SYNCHRONOUS (No Promise, No Queue)
      // ============================================================
      addResult('==========================================');
      addResult('🚀 TURBO SYNC: TRUE SYNCHRONOUS');
      addResult('==========================================');
      addResult('No Promise, no queue - direct JSI return');
      addResult('');
      
      let turboSyncTotalTime = 0;
      let turboSyncNativeTime = 0;
      
      if (TurboCollection?.collection_PerformanceCheckTurboSync) {
        addResult(`🚀 Running ${bridgeCalls.toLocaleString()} SYNC calls...`);
        const turboSyncStart = performance.now();
        
        for (let i = 0; i < bridgeCalls; i++) {
          // TRUE SYNCHRONOUS - no await needed!
          const result = TurboCollection.collection_PerformanceCheckTurboSync(iterations);
          turboSyncNativeTime += result.timeMs;
        }
        
        const turboSyncEnd = performance.now();
        turboSyncTotalTime = turboSyncEnd - turboSyncStart;
        const turboSyncCallsPerSec = Math.round((bridgeCalls / turboSyncTotalTime) * 1000);
        const turboSyncAvgPerCall = (turboSyncTotalTime / bridgeCalls).toFixed(3);
        const turboSyncAvgNativeTime = (turboSyncNativeTime / bridgeCalls).toFixed(3);
        const turboSyncBridgeOverhead = turboSyncTotalTime - turboSyncNativeTime;
        const turboSyncAvgBridgeOverhead = (turboSyncBridgeOverhead / bridgeCalls).toFixed(3);
        
        addResult(`✅ Completed ${bridgeCalls.toLocaleString()} calls`);
        addResult(`⏱️  Total time: ${turboSyncTotalTime.toFixed(0)}ms`);
        addResult(`📊 Calls/sec: ${turboSyncCallsPerSec.toLocaleString()}`);
        addResult(`⚡ Avg per call: ${turboSyncAvgPerCall}ms`);
        addResult(`   - Native execution: ${turboSyncAvgNativeTime}ms`);
        addResult(`   - Bridge overhead: ${turboSyncAvgBridgeOverhead}ms`);
      } else {
        addResult('❌ Sync method not available - rebuild app');
      }
      addResult('');

      // ============================================================
      // TURBO ASYNC TEST - Promise-based (Still on JSI)
      // ============================================================
      addResult('==========================================');
      addResult('⚡ TURBO ASYNC: Promise-based JSI');
      addResult('==========================================');
      addResult('Executes on JSI thread with Promise');
      addResult('');
      
      addResult(`🚀 Running ${bridgeCalls.toLocaleString()} Turbo calls...`);
      const turboTestStart = performance.now();
      
      let turboNativeTime = 0;
      for (let i = 0; i < bridgeCalls; i++) {
        const result = await TurboCollection.collection_PerformanceCheckTurbo(iterations);
        turboNativeTime += result.timeMs;
      }
      
      const turboTestEnd = performance.now();
      const turboTotalTime = turboTestEnd - turboTestStart;
      const turboCallsPerSec = Math.round((bridgeCalls / turboTotalTime) * 1000);
      const turboAvgPerCall = (turboTotalTime / bridgeCalls).toFixed(3);
      const turboAvgNativeTime = (turboNativeTime / bridgeCalls).toFixed(3);
      const turboBridgeOverhead = turboTotalTime - turboNativeTime;
      const turboAvgBridgeOverhead = (turboBridgeOverhead / bridgeCalls).toFixed(3);
      
      addResult(`✅ Completed ${bridgeCalls.toLocaleString()} calls`);
      addResult(`⏱️  Total time: ${turboTotalTime.toFixed(0)}ms`);
      addResult(`📊 Calls/sec: ${turboCallsPerSec.toLocaleString()}`);
      addResult(`⚡ Avg per call: ${turboAvgPerCall}ms`);
      addResult(`   - Native execution: ${turboAvgNativeTime}ms`);
      addResult(`   - Bridge overhead: ${turboAvgBridgeOverhead}ms`);
      addResult('');

      // ============================================================
      // LEGACY TEST - Async Queue Dispatch Pattern
      // ============================================================
      addResult('==========================================');
      addResult('🐌 LEGACY: Async Queue Dispatch');
      addResult('==========================================');
      addResult('Uses backgroundQueue.async (standard pattern)');
      addResult('');
      
      addResult(`🔄 Running ${bridgeCalls.toLocaleString()} Legacy calls...`);
      const legacyTestStart = performance.now();
      
      let legacyNativeTime = 0;
      for (let i = 0; i < bridgeCalls; i++) {
        const result = await LegacyModule.collection_PerformanceCheckLegacy(iterations);
        legacyNativeTime += result.timeMs;
      }
      
      const legacyTestEnd = performance.now();
      const legacyTotalTime = legacyTestEnd - legacyTestStart;
      const legacyCallsPerSec = Math.round((bridgeCalls / legacyTotalTime) * 1000);
      const legacyAvgPerCall = (legacyTotalTime / bridgeCalls).toFixed(3);
      const legacyAvgNativeTime = (legacyNativeTime / bridgeCalls).toFixed(3);
      const legacyBridgeOverhead = legacyTotalTime - legacyNativeTime;
      const legacyAvgBridgeOverhead = (legacyBridgeOverhead / bridgeCalls).toFixed(3);
      
      addResult(`✅ Completed ${bridgeCalls.toLocaleString()} calls`);
      addResult(`⏱️  Total time: ${legacyTotalTime.toFixed(0)}ms`);
      addResult(`📊 Calls/sec: ${legacyCallsPerSec.toLocaleString()}`);
      addResult(`⚡ Avg per call: ${legacyAvgPerCall}ms`);
      addResult(`   - Native execution: ${legacyAvgNativeTime}ms`);
      addResult(`   - Bridge overhead: ${legacyAvgBridgeOverhead}ms`);
      addResult('');

      // ============================================================
      // DETAILED COMPARISON
      // ============================================================
      addResult('==========================================');
      addResult('📊 DETAILED COMPARISON');
      addResult('==========================================');
      addResult('');
      
      const asyncSpeedup = legacyTotalTime / turboTotalTime;
      const timeSaved = (legacyTotalTime - turboTotalTime).toFixed(0);
      
      addResult('TOTAL TIME:');
      if (turboSyncTotalTime > 0) {
        addResult(`🚀 Turbo SYNC: ${turboSyncTotalTime.toFixed(0)}ms`);
      }
      addResult(`⚡ Turbo Async: ${turboTotalTime.toFixed(0)}ms`);
      addResult(`🐌 Legacy:      ${legacyTotalTime.toFixed(0)}ms`);
      addResult('');
      
      addResult('SPEEDUP COMPARISON:');
      addResult(`⚡ Turbo Async vs Legacy: ${asyncSpeedup.toFixed(2)}x`);
      
      if (turboSyncTotalTime > 0) {
        const syncVsLegacySpeedup = (legacyTotalTime / turboSyncTotalTime).toFixed(2);
        const syncVsAsyncSpeedup = (turboTotalTime / turboSyncTotalTime).toFixed(2);
        addResult(`🚀 Turbo SYNC vs Legacy:  ${syncVsLegacySpeedup}x`);
        addResult(`🚀 Turbo SYNC vs Async:   ${syncVsAsyncSpeedup}x`);
      }
      addResult('');
      
      addResult('PER-CALL OVERHEAD:');
      if (turboSyncTotalTime > 0) {
        addResult(`🚀 Turbo SYNC: ${(turboSyncTotalTime / bridgeCalls).toFixed(3)}ms`);
      }
      addResult(`⚡ Turbo Async: ${turboAvgPerCall}ms`);
      addResult(`🐌 Legacy:      ${legacyAvgPerCall}ms`);
      addResult('');
      
      addResult('BRIDGE OVERHEAD BREAKDOWN:');
      addResult(`⚡ Turbo bridge:  ${turboAvgBridgeOverhead}ms/call`);
      addResult(`🐌 Legacy bridge: ${legacyAvgBridgeOverhead}ms/call`);
      const bridgeSpeedup = parseFloat(turboAvgBridgeOverhead) > 0 
        ? (parseFloat(legacyAvgBridgeOverhead) / parseFloat(turboAvgBridgeOverhead)).toFixed(2)
        : 'N/A';
      addResult(`🎯 Bridge speedup: ${bridgeSpeedup}x`);
      addResult('');
      
      addResult('ASYNC QUEUE OVERHEAD:');
      const queueOverhead = parseFloat(legacyAvgBridgeOverhead) - parseFloat(turboAvgBridgeOverhead);
      const queuePercent = parseFloat(legacyAvgBridgeOverhead) > 0
        ? (queueOverhead / parseFloat(legacyAvgBridgeOverhead) * 100).toFixed(1)
        : '0';
      addResult(`📦 Queue dispatch cost: ${queueOverhead.toFixed(3)}ms/call`);
      addResult(`📊 Queue as % of Legacy: ${queuePercent}%`);
      addResult('');
      
      // Final verdict
      if (turboSyncTotalTime > 0) {
        const syncSpeedup = legacyTotalTime / turboSyncTotalTime;
        if (syncSpeedup > 2) {
          addResult(`🏆 TURBO SYNC ${syncSpeedup.toFixed(1)}x FASTER!`);
          addResult('');
          addResult('✨ TRUE SYNC wins by eliminating:');
          addResult('   - Promise/async overhead');
          addResult('   - Async queue dispatch');
          addResult('   - Thread context switching');
          addResult('   - Event loop scheduling');
        } else if (syncSpeedup > 1.2) {
          addResult(`📈 Turbo SYNC ${syncSpeedup.toFixed(2)}x faster`);
        } else {
          addResult(`📊 Results: ${syncSpeedup.toFixed(2)}x speedup`);
        }
      } else if (asyncSpeedup > 1.2) {
        addResult(`📈 Turbo Async ${asyncSpeedup.toFixed(2)}x faster`);
      } else {
        addResult(`📊 Results: ${asyncSpeedup.toFixed(2)}x speedup`);
        addResult('');
        addResult('Note: Async methods have similar overhead.');
        addResult('Try Sync vs Async test for bigger difference!');
      }
      
      addResult('');
      addResult('==========================================');
      addResult('✅ TEST COMPLETED');
      addResult('==========================================');
      addResult('');
      addResult('💡 KEY INSIGHT:');
      addResult('TRUE SYNCHRONOUS calls (no Promise) eliminate');
      addResult('ALL bridge overhead - this is the real power');
      addResult('of Turbo Modules with JSI!');
      
    } catch (error: any) {
      addResult('');
      addResult('==========================================');
      addResult('❌ ERROR');
      addResult('==========================================');
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={localStyles.header}>
        <Text style={localStyles.title}>Async Queue Overhead Test</Text>
        <Text
          style={[
            localStyles.mode,
            { color: '#8b5cf6' },
          ]}
        >
          ⚙️  ASYNC QUEUE vs DIRECT EXECUTION
        </Text>
        <Text style={localStyles.subtitle}>
          Isolates async queue dispatch overhead
        </Text>
      </View>

      <View style={localStyles.buttons}>
        <View style={localStyles.buttonRow}>
          <View style={localStyles.buttonWrapper}>
            <Button
              title={isLoading ? "Running..." : "⚙️  Run Queue Test"}
              onPress={runAsyncQueueTest}
              disabled={isLoading}
              color="#8b5cf6"
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
