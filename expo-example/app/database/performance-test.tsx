import React, { useState } from 'react';
import { SafeAreaView, View, Text, Button, StyleSheet, ScrollView, NativeModules } from 'react-native';
import { useStyleScheme } from '@/components/Themed/Themed';
import { USE_TURBO_MODULES } from 'cbl-reactnative/src/feature-flags';

// Direct imports for both module types to bypass routing
let TurboDatabase: any = null;
let TurboCollection: any = null;

try {
  TurboDatabase = require('cbl-reactnative/src/specs/NativeCblDatabase').default;
  TurboCollection = require('cbl-reactnative/src/specs/NativeCblCollection').default;
} catch (e) {
  console.warn('Turbo modules not available:', e);
}

// Legacy module (direct access via NativeModules)
const LegacyModule = NativeModules.CblReactnative;

/**
 * Collection Read/Write Performance Test Screen
 * 
 * Tests Turbo Module vs Legacy Module performance by:
 * - Directly calling both native modules
 * - Writing 1000 documents to a collection
 * - Reading 1000 documents from a collection
 * - Comparing performance metrics side-by-side
 */
export default function PerformanceTestScreen() {
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
    const themes = ['light', 'dark', 'auto'];
    const languages = ['en', 'es', 'fr', 'de', 'ja', 'zh'];
    
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
      tags: ['customer', Math.random() > 0.5 ? 'premium' : 'standard', 'verified'],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      },
      preferences: {
        theme: themes[Math.floor(Math.random() * themes.length)],
        notifications: Math.random() > 0.5,
        language: languages[Math.floor(Math.random() * languages.length)]
      },
      randomValue: Math.random()
    };
  };

  const runPerformanceTest = async () => {
    setIsLoading(true);
    setResultsMessage([]);
    
    const documentCount = 100000;
    let turboDbName: string | null = null;
    let legacyDbName: string | null = null;
    
    try {
      addResult('==========================================');
      addResult('🚀 STARTING PERFORMANCE TEST');
      addResult('==========================================');
      addResult(`Documents to test: ${documentCount}`);
      addResult(`Turbo Modules Available: ${TurboDatabase ? 'YES' : 'NO'}`);
      addResult(`Legacy Module Available: ${LegacyModule ? 'YES' : 'NO'}`);
      addResult('');

      if (!TurboDatabase || !TurboCollection) {
        addResult('❌ ERROR: Turbo modules not available!');
        addResult('Make sure the app is built with Turbo modules enabled.');
        setIsLoading(false);
        return;
      }

      if (!LegacyModule) {
        addResult('❌ ERROR: Legacy module not available!');
        setIsLoading(false);
        return;
      }

      // ============================================================
      // TURBO MODULE TEST (Direct Turbo Module Calls)
      // ============================================================
      addResult('==========================================');
      addResult('⚡ TURBO MODULES PERFORMANCE TEST');
      addResult('==========================================');
      addResult('(Using direct TurboModule calls)');
      
      // Open database using Turbo
      const turboOpenResult = await TurboDatabase.database_Open(
        'perf-test-turbo',
        null,
        null
      );
      turboDbName = turboOpenResult.databaseUniqueName;
      addResult(`✅ Turbo database opened: ${turboDbName}`);

      // Create collection using Turbo
      await TurboCollection.collection_CreateCollection(
        'test-collection',
        turboDbName,
        '_default'
      );
      addResult('✅ Collection created: test-collection');

      // WRITE TEST - Turbo (Direct calls)
      addResult('📝 Starting write test (Turbo)...');
      const turboWriteStart = performance.now();
      
      for (let i = 0; i < documentCount; i++) {
        const docData = generateRandomDocument(i);
        await TurboCollection.collection_Save(
          JSON.stringify(docData),
          '[]', // no blobs
          `user_turbo_${i}`,
          turboDbName,
          '_default',
          'test-collection',
          -9999 // no concurrency control
        );
      }
      
      const turboWriteEnd = performance.now();
      const turboWriteTime = turboWriteEnd - turboWriteStart;
      const turboWriteDocsPerSec = Math.round((documentCount / turboWriteTime) * 1000);
      addResult(`✍️  Write ${documentCount} docs: ${turboWriteTime.toFixed(0)}ms (${turboWriteDocsPerSec.toLocaleString()} docs/sec)`);

      // READ TEST - Turbo (Direct calls)
      addResult('📖 Starting read test (Turbo)...');
      const turboReadStart = performance.now();
      
      for (let i = 0; i < documentCount; i++) {
        await TurboCollection.collection_GetDocument(
          `user_turbo_${i}`,
          turboDbName,
          '_default',
          'test-collection'
        );
      }
      
      const turboReadEnd = performance.now();
      const turboReadTime = turboReadEnd - turboReadStart;
      const turboReadDocsPerSec = Math.round((documentCount / turboReadTime) * 1000);
      addResult(`📖 Read ${documentCount} docs: ${turboReadTime.toFixed(0)}ms (${turboReadDocsPerSec.toLocaleString()} docs/sec)`);
      
      const turboTotalTime = turboWriteTime + turboReadTime;
      addResult(`⏱️  Total time: ${turboTotalTime.toFixed(0)}ms`);
      addResult('');

      // Delete and close Turbo database
      await LegacyModule.database_Delete(turboDbName);
      turboDbName = null; // Mark as deleted
      addResult('✅ Turbo database deleted');
      addResult('');

      // ============================================================
      // LEGACY MODULE TEST (Direct Legacy Bridge Calls)
      // ============================================================
      addResult('==========================================');
      addResult('🐌 LEGACY BRIDGE PERFORMANCE TEST');
      addResult('==========================================');
      addResult('(Using direct NativeModules.CblReactnative calls)');
      
      // Open database using Legacy
      const legacyOpenResult = await LegacyModule.database_Open(
        'perf-test-legacy',
        null,
        null
      );
      legacyDbName = legacyOpenResult.databaseUniqueName;
      addResult(`✅ Legacy database opened: ${legacyDbName}`);

      // Create collection using Legacy
      await LegacyModule.collection_CreateCollection(
        'test-collection',
        legacyDbName,
        '_default'
      );
      addResult('✅ Collection created: test-collection');

      // WRITE TEST - Legacy (Direct calls)
      addResult('📝 Starting write test (Legacy)...');
      const legacyWriteStart = performance.now();
      
      for (let i = 0; i < documentCount; i++) {
        const docData = generateRandomDocument(i);
        await LegacyModule.collection_Save(
          JSON.stringify(docData),
          '[]', // no blobs
          `user_legacy_${i}`,
          legacyDbName,
          '_default',
          'test-collection',
          -9999 // no concurrency control
        );
      }
      
      const legacyWriteEnd = performance.now();
      const legacyWriteTime = legacyWriteEnd - legacyWriteStart;
      const legacyWriteDocsPerSec = Math.round((documentCount / legacyWriteTime) * 1000);
      addResult(`✍️  Write ${documentCount} docs: ${legacyWriteTime.toFixed(0)}ms (${legacyWriteDocsPerSec.toLocaleString()} docs/sec)`);

      // READ TEST - Legacy (Direct calls)
      addResult('📖 Starting read test (Legacy)...');
      const legacyReadStart = performance.now();
      
      for (let i = 0; i < documentCount; i++) {
        await LegacyModule.collection_GetDocument(
          `user_legacy_${i}`,
          legacyDbName,
          '_default',
          'test-collection'
        );
      }
      
      const legacyReadEnd = performance.now();
      const legacyReadTime = legacyReadEnd - legacyReadStart;
      const legacyReadDocsPerSec = Math.round((documentCount / legacyReadTime) * 1000);
      addResult(`📖 Read ${documentCount} docs: ${legacyReadTime.toFixed(0)}ms (${legacyReadDocsPerSec.toLocaleString()} docs/sec)`);
      
      const legacyTotalTime = legacyWriteTime + legacyReadTime;
      addResult(`⏱️  Total time: ${legacyTotalTime.toFixed(0)}ms`);
      addResult('');

      // Delete and close Legacy database
      await LegacyModule.database_Delete(legacyDbName);
      legacyDbName = null; // Mark as deleted
      addResult('✅ Legacy database deleted');
      addResult('');

      // ============================================================
      // PERFORMANCE COMPARISON
      // ============================================================
      addResult('==========================================');
      addResult('📊 PERFORMANCE COMPARISON');
      addResult('==========================================');
      
      // Calculate improvements (positive = Turbo is faster)
      const writeImprovement = ((legacyWriteTime - turboWriteTime) / legacyWriteTime * 100).toFixed(1);
      const readImprovement = ((legacyReadTime - turboReadTime) / legacyReadTime * 100).toFixed(1);
      const overallImprovement = ((legacyTotalTime - turboTotalTime) / legacyTotalTime * 100).toFixed(1);
      
      const writeSpeedupX = (legacyWriteTime / turboWriteTime).toFixed(2);
      const readSpeedupX = (legacyReadTime / turboReadTime).toFixed(2);
      const overallSpeedupX = (legacyTotalTime / turboTotalTime).toFixed(2);

      addResult('');
      addResult('TURBO vs LEGACY:');
      addResult(`⚡ Write: Turbo ${turboWriteTime.toFixed(0)}ms vs Legacy ${legacyWriteTime.toFixed(0)}ms`);
      addResult(`   → ${Number(writeImprovement) > 0 ? '+' : ''}${writeImprovement}% (${writeSpeedupX}x)`);
      addResult('');
      addResult(`⚡ Read: Turbo ${turboReadTime.toFixed(0)}ms vs Legacy ${legacyReadTime.toFixed(0)}ms`);
      addResult(`   → ${Number(readImprovement) > 0 ? '+' : ''}${readImprovement}% (${readSpeedupX}x)`);
      addResult('');
      addResult(`⚡ Overall: Turbo ${turboTotalTime.toFixed(0)}ms vs Legacy ${legacyTotalTime.toFixed(0)}ms`);
      addResult(`   → ${Number(overallImprovement) > 0 ? '+' : ''}${overallImprovement}% (${overallSpeedupX}x)`);
      addResult('');
      
      if (Number(overallImprovement) > 0) {
        addResult(`🏆 TURBO MODULES are ${overallSpeedupX}x FASTER!`);
      } else {
        addResult(`📝 Note: Legacy slightly faster in this run.`);
        addResult(`   This can happen due to JIT warmup effects.`);
        addResult(`   Run multiple times for accurate comparison.`);
      }
      
      addResult('');
      addResult('==========================================');
      addResult('✨ TEST COMPLETED SUCCESSFULLY');
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
      // Cleanup databases (only if not already deleted)
      try {
        if (turboDbName && LegacyModule) {
          try {
            await LegacyModule.database_Delete(turboDbName);
          } catch (e) {
            // Ignore - database may already be deleted or closed
          }
        }
        if (legacyDbName && LegacyModule) {
          try {
            await LegacyModule.database_Delete(legacyDbName);
          } catch (e) {
            // Ignore - database may already be deleted or closed
          }
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResultsMessage([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={localStyles.header}>
        <Text style={localStyles.title}>Collection Performance Test</Text>
        <Text
          style={[
            localStyles.mode,
            { color: USE_TURBO_MODULES ? '#10b981' : '#f59e0b' },
          ]}
        >
          {USE_TURBO_MODULES ? '⚡ TURBO MODULES ENABLED' : '🐌 LEGACY BRIDGE'}
        </Text>
        <Text style={localStyles.subtitle}>
          Directly compares Turbo Module vs Legacy Bridge calls
        </Text>
      </View>

      <View style={localStyles.buttons}>
        <View style={localStyles.buttonRow}>
          <View style={localStyles.buttonWrapper}>
            <Button
              title={isLoading ? "Running..." : "🚀 Run Performance Test"}
              onPress={runPerformanceTest}
              disabled={isLoading}
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
