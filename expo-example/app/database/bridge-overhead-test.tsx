import React, { useState } from 'react';
import { SafeAreaView, View, Text, Button, StyleSheet, ScrollView, NativeModules } from 'react-native';
import { useStyleScheme } from '@/components/Themed/Themed';
import { USE_TURBO_MODULES } from 'cbl-reactnative/src/feature-flags';

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
 * Bridge Overhead Test Screen
 * 
 * Measures PURE JS-to-Native bridge overhead by calling a simple echo method
 * that does NO database work - just echoes data back.
 * 
 * This isolates serialization/deserialization costs:
 * - Turbo: JSI direct memory access
 * - Legacy: JSON serialization for each call
 */
export default function BridgeOverheadTestScreen() {
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const styles = useStyleScheme();

  const addResult = (message: string) => {
    setResultsMessage((prev) => [...prev, message]);
  };

  // Generate test data (same complexity as actual documents for realistic comparison)
  const generateTestData = (index: number) => {
    return JSON.stringify({
      id: `test_${index}`,
      firstName: 'John',
      lastName: 'Doe',
      email: `user${index}@example.com`,
      age: 28,
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'USA'
      },
      tags: ['customer', 'premium', 'verified'],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      },
      preferences: {
        theme: 'dark',
        notifications: true,
        language: 'en'
      },
      randomValue: Math.random()
    });
  };

  const runBridgeOverheadTest = async () => {
    setIsLoading(true);
    setResultsMessage([]);
    
    const callCount = 100000; // Number of bridge calls to make
    
    try {
      addResult('==========================================');
      addResult('🔬 BRIDGE OVERHEAD TEST');
      addResult('==========================================');
      addResult(`Bridge calls to test: ${callCount}`);
      addResult('Test: Echo method (no database I/O)');
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
      // TURBO MODULE TEST - Pure Bridge Overhead
      // ============================================================
      addResult('==========================================');
      addResult('⚡ TURBO MODULES (JSI)');
      addResult('==========================================');
      
      const testData = generateTestData(0);
      addResult(`Test payload size: ${testData.length} bytes`);
      addResult('');
      
      addResult('📡 Starting Turbo echo test...');
      const turboStart = performance.now();
      
      for (let i = 0; i < callCount; i++) {
        await TurboCollection.collection_Echo(testData);
      }
      
      const turboEnd = performance.now();
      const turboTime = turboEnd - turboStart;
      const turboCallsPerSec = Math.round((callCount / turboTime) * 1000);
      const turboAvgPerCall = (turboTime / callCount).toFixed(3);
      
      addResult(`✅ Completed ${callCount} calls`);
      addResult(`⏱️  Total time: ${turboTime.toFixed(0)}ms`);
      addResult(`📊 Calls/sec: ${turboCallsPerSec.toLocaleString()}`);
      addResult(`⚡ Avg per call: ${turboAvgPerCall}ms`);
      addResult('');

      // ============================================================
      // LEGACY MODULE TEST - Pure Bridge Overhead
      // ============================================================
      addResult('==========================================');
      addResult('🐌 LEGACY BRIDGE (JSON Serialization)');
      addResult('==========================================');
      
      addResult('📡 Starting Legacy echo test...');
      const legacyStart = performance.now();
      
      for (let i = 0; i < callCount; i++) {
        await LegacyModule.collection_Echo(testData);
      }
      
      const legacyEnd = performance.now();
      const legacyTime = legacyEnd - legacyStart;
      const legacyCallsPerSec = Math.round((callCount / legacyTime) * 1000);
      const legacyAvgPerCall = (legacyTime / callCount).toFixed(3);
      
      addResult(`✅ Completed ${callCount} calls`);
      addResult(`⏱️  Total time: ${legacyTime.toFixed(0)}ms`);
      addResult(`📊 Calls/sec: ${legacyCallsPerSec.toLocaleString()}`);
      addResult(`⚡ Avg per call: ${legacyAvgPerCall}ms`);
      addResult('');

      // ============================================================
      // COMPARISON
      // ============================================================
      addResult('==========================================');
      addResult('📊 BRIDGE OVERHEAD COMPARISON');
      addResult('==========================================');
      
      const improvement = ((legacyTime - turboTime) / legacyTime * 100).toFixed(1);
      const speedupX = (legacyTime / turboTime).toFixed(2);
      const timeSaved = (legacyTime - turboTime).toFixed(0);
      
      addResult('');
      addResult('PURE SERIALIZATION OVERHEAD:');
      addResult(`⚡ Turbo: ${turboTime.toFixed(0)}ms vs Legacy: ${legacyTime.toFixed(0)}ms`);
      addResult(`💾 Time saved: ${timeSaved}ms`);
      addResult(`📈 Improvement: ${improvement}%`);
      addResult(`🚀 Speedup: ${speedupX}x faster`);
      addResult('');
      
      addResult('PER-CALL OVERHEAD:');
      addResult(`⚡ Turbo: ${turboAvgPerCall}ms per call`);
      addResult(`🐌 Legacy: ${legacyAvgPerCall}ms per call`);
      addResult(`💡 Saving: ${(parseFloat(legacyAvgPerCall) - parseFloat(turboAvgPerCall)).toFixed(3)}ms per call`);
      addResult('');
      
      if (Number(improvement) > 0) {
        addResult(`🏆 TURBO MODULES ${speedupX}x FASTER!`);
        addResult('');
        addResult('This is the PURE bridge overhead savings.');
        addResult(`With ${callCount} calls, JSI avoids:`);
        addResult(`- ${callCount} JSON serializations`);
        addResult(`- ${callCount} JSON deserializations`);
        addResult(`- ${callCount} bridge queue operations`);
      } else {
        addResult(`📝 Note: Results vary based on device performance.`);
      }
      
      addResult('');
      addResult('==========================================');
      addResult('✨ TEST COMPLETED');
      addResult('==========================================');
      
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
        <Text style={localStyles.title}>Bridge Overhead Test</Text>
        <Text
          style={[
            localStyles.mode,
            { color: '#8b5cf6' },
          ]}
        >
          🔬 PURE SERIALIZATION OVERHEAD
        </Text>
        <Text style={localStyles.subtitle}>
          Measures JSI vs Legacy bridge overhead (no database I/O)
        </Text>
      </View>

      <View style={localStyles.buttons}>
        <View style={localStyles.buttonRow}>
          <View style={localStyles.buttonWrapper}>
            <Button
              title={isLoading ? "Running..." : "🔬 Run Bridge Test"}
              onPress={runBridgeOverheadTest}
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
