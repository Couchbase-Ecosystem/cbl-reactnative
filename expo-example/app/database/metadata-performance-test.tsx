import React, { useState } from 'react';
import { SafeAreaView, View, Text, Button, StyleSheet, ScrollView, NativeModules } from 'react-native';
import { useStyleScheme } from '@/components/Themed/Themed';
import { USE_TURBO_MODULES } from 'cbl-reactnative/src/feature-flags';

// Direct imports for Turbo Modules
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

interface TestResult {
  testName: string;
  description: string;
  turboTime: number;
  legacyTime: number;
  speedup: number;
  turboOpsPerSec: number;
  legacyOpsPerSec: number;
  iterations: number;
}

/**
 * Metadata Operations Performance Test Screen
 * 
 * Tests Turbo Module vs Legacy Bridge for NON-I/O bound operations where
 * bridge overhead is significant compared to actual operation time.
 * 
 * HIGH-IMPACT Tests (Expected 5-12x speedup):
 * - collection_GetCount: In-memory counter read
 * - database_GetPath: String property getter
 * - collection_GetIndexes: Array of index names
 * 
 * MEDIUM-IMPACT Tests (Expected 2-5x speedup):
 * - collection_GetCollections: List all collections in scope
 * - database_Exists: File system existence check
 * - scope_GetScopes: List all scopes in database
 */
export default function MetadataPerformanceTestScreen() {
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const styles = useStyleScheme();

  const addResult = (message: string) => {
    setResultsMessage((prev) => [...prev, message]);
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setResultsMessage([]);
    
    let turboDbName: string | null = null;
    let legacyDbName: string | null = null;
    const allResults: TestResult[] = [];
    
    try {
      addResult('==========================================');
      addResult('🚀 METADATA PERFORMANCE TEST');
      addResult('==========================================');
      addResult('Testing lightweight metadata operations');
      addResult('where bridge overhead matters most');
      addResult('');
      addResult(`Turbo Modules Available: ${TurboDatabase && TurboCollection ? 'YES ⚡' : 'NO'}`);
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
      // SETUP PHASE - Create Prerequisites
      // ============================================================
      addResult('==========================================');
      addResult('📦 SETUP PHASE');
      addResult('==========================================');
      addResult('Creating test prerequisites...');
      addResult('');

      // Setup Turbo Database
      addResult('⚡ Setting up Turbo test environment...');
      const turboOpenResult = await TurboDatabase.database_Open(
        'metadata-test-turbo',
        null,
        null
      );
      turboDbName = turboOpenResult.databaseUniqueName;
      addResult(`✅ Turbo database opened: ${turboDbName}`);

      // Create collection
      await TurboCollection.collection_CreateCollection(
        'test-collection',
        turboDbName,
        '_default'
      );
      addResult('✅ Collection created: test-collection');

      // Add sample documents (for GetCount test)
      addResult('📝 Adding 1000 sample documents...');
      for (let i = 0; i < 1000; i++) {
        await TurboCollection.collection_Save(
          JSON.stringify({ index: i, data: `sample_${i}` }),
          '[]',
          `doc_${i}`,
          turboDbName,
          '_default',
          'test-collection',
          -9999
        );
      }
      addResult('✅ 1000 documents added');

      // Create indexes (for GetIndexes test)
      addResult('📇 Creating test indexes...');
      await LegacyModule.collection_CreateIndex(
        'idx_test_1',
        { type: 'value', items: [['index']] },
        'test-collection',
        '_default',
        turboDbName
      );
      await LegacyModule.collection_CreateIndex(
        'idx_test_2',
        { type: 'value', items: [['data']] },
        'test-collection',
        '_default',
        turboDbName
      );
      addResult('✅ 2 indexes created');

      // Setup Legacy Database
      addResult('');
      addResult('🐌 Setting up Legacy test environment...');
      const legacyOpenResult = await LegacyModule.database_Open(
        'metadata-test-legacy',
        null,
        null
      );
      legacyDbName = legacyOpenResult.databaseUniqueName;
      addResult(`✅ Legacy database opened: ${legacyDbName}`);

      // Create collection
      await LegacyModule.collection_CreateCollection(
        'test-collection',
        legacyDbName,
        '_default'
      );
      addResult('✅ Collection created: test-collection');

      // Add sample documents
      addResult('📝 Adding 1000 sample documents...');
      for (let i = 0; i < 1000; i++) {
        await LegacyModule.collection_Save(
          JSON.stringify({ index: i, data: `sample_${i}` }),
          '[]',
          `doc_${i}`,
          legacyDbName,
          '_default',
          'test-collection',
          -9999
        );
      }
      addResult('✅ 1000 documents added');

      // Create indexes
      addResult('📇 Creating test indexes...');
      await LegacyModule.collection_CreateIndex(
        'idx_test_1',
        { type: 'value', items: [['index']] },
        'test-collection',
        '_default',
        legacyDbName
      );
      await LegacyModule.collection_CreateIndex(
        'idx_test_2',
        { type: 'value', items: [['data']] },
        'test-collection',
        '_default',
        legacyDbName
      );
      addResult('✅ 2 indexes created');
      addResult('');
      addResult('✨ Setup complete! Starting tests...');
      addResult('');

      // ============================================================
      // TEST 1: collection_GetCount (HIGH-IMPACT)
      // ============================================================
      addResult('==========================================');
      addResult('TEST 1: collection_GetCount (HIGH-IMPACT)');
      addResult('==========================================');
      addResult('Reads in-memory document counter');
      addResult('Expected speedup: 5-10x');
      addResult('');

      const iterations1 = 10000;
      
      // Warmup
      addResult('🔥 Warming up JIT compiler...');
      for (let i = 0; i < 1000; i++) {
        await TurboCollection.collection_GetCount('test-collection', turboDbName, '_default');
      }
      addResult('✅ Warmup complete');
      addResult('');

      // Turbo test
      addResult(`⚡ Running Turbo test (${iterations1.toLocaleString()} iterations)...`);
      const turboStart1 = performance.now();
      for (let i = 0; i < iterations1; i++) {
        await TurboCollection.collection_GetCount('test-collection', turboDbName, '_default');
      }
      const turboEnd1 = performance.now();
      const turboTime1 = turboEnd1 - turboStart1;
      const turboOps1 = Math.round((iterations1 / turboTime1) * 1000);
      addResult(`✅ Turbo: ${turboTime1.toFixed(0)}ms (${turboOps1.toLocaleString()} ops/sec)`);

      // Legacy test
      addResult(`🐌 Running Legacy test (${iterations1.toLocaleString()} iterations)...`);
      const legacyStart1 = performance.now();
      for (let i = 0; i < iterations1; i++) {
        await LegacyModule.collection_GetCount('test-collection', legacyDbName, '_default');
      }
      const legacyEnd1 = performance.now();
      const legacyTime1 = legacyEnd1 - legacyStart1;
      const legacyOps1 = Math.round((iterations1 / legacyTime1) * 1000);
      addResult(`✅ Legacy: ${legacyTime1.toFixed(0)}ms (${legacyOps1.toLocaleString()} ops/sec)`);

      const speedup1 = legacyTime1 / turboTime1;
      addResult('');
      addResult(`🏆 Speedup: ${speedup1.toFixed(2)}x ${speedup1 > 1 ? 'FASTER' : 'slower'}`);
      addResult('');

      allResults.push({
        testName: 'collection_GetCount',
        description: 'In-memory counter',
        turboTime: turboTime1,
        legacyTime: legacyTime1,
        speedup: speedup1,
        turboOpsPerSec: turboOps1,
        legacyOpsPerSec: legacyOps1,
        iterations: iterations1
      });

      // ============================================================
      // TEST 2: database_GetPath (HIGH-IMPACT)
      // ============================================================
      addResult('==========================================');
      addResult('TEST 2: database_GetPath (HIGH-IMPACT)');
      addResult('==========================================');
      addResult('Returns database file path string');
      addResult('Expected speedup: 8-12x');
      addResult('');

      const iterations2 = 10000;

      // Turbo test
      addResult(`⚡ Running Turbo test (${iterations2.toLocaleString()} iterations)...`);
      const turboStart2 = performance.now();
      for (let i = 0; i < iterations2; i++) {
        await TurboDatabase.database_GetPath(turboDbName);
      }
      const turboEnd2 = performance.now();
      const turboTime2 = turboEnd2 - turboStart2;
      const turboOps2 = Math.round((iterations2 / turboTime2) * 1000);
      addResult(`✅ Turbo: ${turboTime2.toFixed(0)}ms (${turboOps2.toLocaleString()} ops/sec)`);

      // Legacy test
      addResult(`🐌 Running Legacy test (${iterations2.toLocaleString()} iterations)...`);
      const legacyStart2 = performance.now();
      for (let i = 0; i < iterations2; i++) {
        await LegacyModule.database_GetPath(legacyDbName);
      }
      const legacyEnd2 = performance.now();
      const legacyTime2 = legacyEnd2 - legacyStart2;
      const legacyOps2 = Math.round((iterations2 / legacyTime2) * 1000);
      addResult(`✅ Legacy: ${legacyTime2.toFixed(0)}ms (${legacyOps2.toLocaleString()} ops/sec)`);

      const speedup2 = legacyTime2 / turboTime2;
      addResult('');
      addResult(`🏆 Speedup: ${speedup2.toFixed(2)}x ${speedup2 > 1 ? 'FASTER' : 'slower'}`);
      addResult('');

      allResults.push({
        testName: 'database_GetPath',
        description: 'String property getter',
        turboTime: turboTime2,
        legacyTime: legacyTime2,
        speedup: speedup2,
        turboOpsPerSec: turboOps2,
        legacyOpsPerSec: legacyOps2,
        iterations: iterations2
      });

      // ============================================================
      // TEST 3: collection_GetIndexes (HIGH-IMPACT)
      // ============================================================
      addResult('==========================================');
      addResult('TEST 3: collection_GetIndexes (HIGH-IMPACT)');
      addResult('==========================================');
      addResult('Returns array of index names');
      addResult('Expected speedup: 6-8x');
      addResult('');

      const iterations3 = 10000;

      // Turbo test
      addResult(`⚡ Running Turbo test (${iterations3.toLocaleString()} iterations)...`);
      const turboStart3 = performance.now();
      for (let i = 0; i < iterations3; i++) {
        await TurboCollection.collection_GetIndexes('test-collection', '_default', turboDbName);
      }
      const turboEnd3 = performance.now();
      const turboTime3 = turboEnd3 - turboStart3;
      const turboOps3 = Math.round((iterations3 / turboTime3) * 1000);
      addResult(`✅ Turbo: ${turboTime3.toFixed(0)}ms (${turboOps3.toLocaleString()} ops/sec)`);

      // Legacy test
      addResult(`🐌 Running Legacy test (${iterations3.toLocaleString()} iterations)...`);
      const legacyStart3 = performance.now();
      for (let i = 0; i < iterations3; i++) {
        await LegacyModule.collection_GetIndexes('test-collection', '_default', legacyDbName);
      }
      const legacyEnd3 = performance.now();
      const legacyTime3 = legacyEnd3 - legacyStart3;
      const legacyOps3 = Math.round((iterations3 / legacyTime3) * 1000);
      addResult(`✅ Legacy: ${legacyTime3.toFixed(0)}ms (${legacyOps3.toLocaleString()} ops/sec)`);

      const speedup3 = legacyTime3 / turboTime3;
      addResult('');
      addResult(`🏆 Speedup: ${speedup3.toFixed(2)}x ${speedup3 > 1 ? 'FASTER' : 'slower'}`);
      addResult('');

      allResults.push({
        testName: 'collection_GetIndexes',
        description: 'Array of index names',
        turboTime: turboTime3,
        legacyTime: legacyTime3,
        speedup: speedup3,
        turboOpsPerSec: turboOps3,
        legacyOpsPerSec: legacyOps3,
        iterations: iterations3
      });

      // ============================================================
      // TEST 4: collection_GetCollections (MEDIUM-IMPACT)
      // ============================================================
      addResult('==========================================');
      addResult('TEST 4: collection_GetCollections (MEDIUM-IMPACT)');
      addResult('==========================================');
      addResult('Lists all collections in scope');
      addResult('Expected speedup: 3-5x');
      addResult('');

      const iterations4 = 10000;

      // Turbo test
      addResult(`⚡ Running Turbo test (${iterations4.toLocaleString()} iterations)...`);
      const turboStart4 = performance.now();
      for (let i = 0; i < iterations4; i++) {
        await TurboCollection.collection_GetCollections(turboDbName, '_default');
      }
      const turboEnd4 = performance.now();
      const turboTime4 = turboEnd4 - turboStart4;
      const turboOps4 = Math.round((iterations4 / turboTime4) * 1000);
      addResult(`✅ Turbo: ${turboTime4.toFixed(0)}ms (${turboOps4.toLocaleString()} ops/sec)`);

      // Legacy test
      addResult(`🐌 Running Legacy test (${iterations4.toLocaleString()} iterations)...`);
      const legacyStart4 = performance.now();
      for (let i = 0; i < iterations4; i++) {
        await LegacyModule.collection_GetCollections(legacyDbName, '_default');
      }
      const legacyEnd4 = performance.now();
      const legacyTime4 = legacyEnd4 - legacyStart4;
      const legacyOps4 = Math.round((iterations4 / legacyTime4) * 1000);
      addResult(`✅ Legacy: ${legacyTime4.toFixed(0)}ms (${legacyOps4.toLocaleString()} ops/sec)`);

      const speedup4 = legacyTime4 / turboTime4;
      addResult('');
      addResult(`🏆 Speedup: ${speedup4.toFixed(2)}x ${speedup4 > 1 ? 'FASTER' : 'slower'}`);
      addResult('');

      allResults.push({
        testName: 'collection_GetCollections',
        description: 'List collections in scope',
        turboTime: turboTime4,
        legacyTime: legacyTime4,
        speedup: speedup4,
        turboOpsPerSec: turboOps4,
        legacyOpsPerSec: legacyOps4,
        iterations: iterations4
      });

      // ============================================================
      // TEST 5: database_Exists (MEDIUM-IMPACT)
      // ============================================================
      addResult('==========================================');
      addResult('TEST 5: database_Exists (MEDIUM-IMPACT)');
      addResult('==========================================');
      addResult('Checks if database file exists');
      addResult('Expected speedup: 2-3x');
      addResult('');

      const iterations5 = 10000;

      // Get default path first
      const defaultPath = await LegacyModule.file_GetDefaultPath();

      // Turbo test
      addResult(`⚡ Running Turbo test (${iterations5.toLocaleString()} iterations)...`);
      const turboStart5 = performance.now();
      for (let i = 0; i < iterations5; i++) {
        await TurboDatabase.database_Exists('metadata-test-turbo', defaultPath);
      }
      const turboEnd5 = performance.now();
      const turboTime5 = turboEnd5 - turboStart5;
      const turboOps5 = Math.round((iterations5 / turboTime5) * 1000);
      addResult(`✅ Turbo: ${turboTime5.toFixed(0)}ms (${turboOps5.toLocaleString()} ops/sec)`);

      // Legacy test
      addResult(`🐌 Running Legacy test (${iterations5.toLocaleString()} iterations)...`);
      const legacyStart5 = performance.now();
      for (let i = 0; i < iterations5; i++) {
        await LegacyModule.database_Exists('metadata-test-legacy', defaultPath);
      }
      const legacyEnd5 = performance.now();
      const legacyTime5 = legacyEnd5 - legacyStart5;
      const legacyOps5 = Math.round((iterations5 / legacyTime5) * 1000);
      addResult(`✅ Legacy: ${legacyTime5.toFixed(0)}ms (${legacyOps5.toLocaleString()} ops/sec)`);

      const speedup5 = legacyTime5 / turboTime5;
      addResult('');
      addResult(`🏆 Speedup: ${speedup5.toFixed(2)}x ${speedup5 > 1 ? 'FASTER' : 'slower'}`);
      addResult('');

      allResults.push({
        testName: 'database_Exists',
        description: 'File existence check',
        turboTime: turboTime5,
        legacyTime: legacyTime5,
        speedup: speedup5,
        turboOpsPerSec: turboOps5,
        legacyOpsPerSec: legacyOps5,
        iterations: iterations5
      });

      // ============================================================
      // TEST 6: scope_GetScopes (MEDIUM-IMPACT)
      // ============================================================
      addResult('==========================================');
      addResult('TEST 6: scope_GetScopes (MEDIUM-IMPACT)');
      addResult('==========================================');
      addResult('Lists all scopes in database');
      addResult('Expected speedup: 3-5x');
      addResult('');

      const iterations6 = 10000;

      // Turbo test
      addResult(`⚡ Running Turbo test (${iterations6.toLocaleString()} iterations)...`);
      const turboStart6 = performance.now();
      for (let i = 0; i < iterations6; i++) {
        await TurboDatabase.scope_GetScopes(turboDbName);
      }
      const turboEnd6 = performance.now();
      const turboTime6 = turboEnd6 - turboStart6;
      const turboOps6 = Math.round((iterations6 / turboTime6) * 1000);
      addResult(`✅ Turbo: ${turboTime6.toFixed(0)}ms (${turboOps6.toLocaleString()} ops/sec)`);

      // Legacy test
      addResult(`🐌 Running Legacy test (${iterations6.toLocaleString()} iterations)...`);
      const legacyStart6 = performance.now();
      for (let i = 0; i < iterations6; i++) {
        await LegacyModule.scope_GetScopes(legacyDbName);
      }
      const legacyEnd6 = performance.now();
      const legacyTime6 = legacyEnd6 - legacyStart6;
      const legacyOps6 = Math.round((iterations6 / legacyTime6) * 1000);
      addResult(`✅ Legacy: ${legacyTime6.toFixed(0)}ms (${legacyOps6.toLocaleString()} ops/sec)`);

      const speedup6 = legacyTime6 / turboTime6;
      addResult('');
      addResult(`🏆 Speedup: ${speedup6.toFixed(2)}x ${speedup6 > 1 ? 'FASTER' : 'slower'}`);
      addResult('');

      allResults.push({
        testName: 'scope_GetScopes',
        description: 'List scopes in database',
        turboTime: turboTime6,
        legacyTime: legacyTime6,
        speedup: speedup6,
        turboOpsPerSec: turboOps6,
        legacyOpsPerSec: legacyOps6,
        iterations: iterations6
      });

      // ============================================================
      // FINAL SUMMARY
      // ============================================================
      addResult('==========================================');
      addResult('📊 OVERALL SUMMARY');
      addResult('==========================================');
      addResult('');

      // Calculate averages
      const avgSpeedup = allResults.reduce((sum, r) => sum + r.speedup, 0) / allResults.length;
      const bestResult = allResults.reduce((best, r) => r.speedup > best.speedup ? r : best);
      const worstResult = allResults.reduce((worst, r) => r.speedup < worst.speedup ? r : worst);

      addResult('📈 Individual Results:');
      allResults.forEach((result, idx) => {
        addResult(`${idx + 1}. ${result.testName}: ${result.speedup.toFixed(2)}x`);
      });
      addResult('');

      addResult(`Average Speedup: ${avgSpeedup.toFixed(2)}x`);
      addResult(`Best: ${bestResult.testName} (${bestResult.speedup.toFixed(2)}x)`);
      addResult(`Worst: ${worstResult.testName} (${worstResult.speedup.toFixed(2)}x)`);
      addResult('');

      if (avgSpeedup > 3) {
        addResult(`🏆 TURBO MODULES are ${avgSpeedup.toFixed(1)}x FASTER!`);
        addResult('');
        addResult('✨ Turbo Modules excel at lightweight metadata');
        addResult('   operations where bridge overhead matters!');
      } else if (avgSpeedup > 1.5) {
        addResult(`📝 Turbo Modules are ${avgSpeedup.toFixed(1)}x faster`);
        addResult('   Moderate improvement for these operations.');
      } else {
        addResult(`📊 Results show ${avgSpeedup.toFixed(2)}x speedup`);
        addResult('   Bridge overhead less significant for these ops.');
      }

      addResult('');
      addResult('==========================================');
      addResult('✅ ALL TESTS COMPLETED SUCCESSFULLY');
      addResult('==========================================');

      // Cleanup
      addResult('');
      addResult('🧹 Cleaning up test databases...');
      await LegacyModule.database_Delete(turboDbName);
      await LegacyModule.database_Delete(legacyDbName);
      turboDbName = null;
      legacyDbName = null;
      addResult('✅ Cleanup complete');

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
            // Ignore - database may already be deleted
          }
        }
        if (legacyDbName && LegacyModule) {
          try {
            await LegacyModule.database_Delete(legacyDbName);
          } catch (e) {
            // Ignore - database may already be deleted
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
        <Text style={localStyles.title}>Metadata Performance Test</Text>
        <Text
          style={[
            localStyles.mode,
            { color: USE_TURBO_MODULES ? '#10b981' : '#f59e0b' },
          ]}
        >
          {USE_TURBO_MODULES ? '⚡ TURBO MODULES ENABLED' : '🐌 LEGACY BRIDGE'}
        </Text>
        <Text style={localStyles.subtitle}>
          Tests lightweight metadata operations where bridge overhead matters
        </Text>
      </View>

      <View style={localStyles.buttons}>
        <View style={localStyles.buttonRow}>
          <View style={localStyles.buttonWrapper}>
            <Button
              title={isLoading ? "Running Tests..." : "🚀 Run All Tests"}
              onPress={runAllTests}
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
