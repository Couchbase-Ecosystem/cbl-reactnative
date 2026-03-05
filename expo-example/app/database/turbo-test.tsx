import React, { useState } from 'react';
import { SafeAreaView, View, Text, Button, StyleSheet } from 'react-native';
import { useStyleScheme } from '@/components/Themed/Themed';
import ResultListView from '@/components/ResultsListView/ResultsListView';
import { Database, DatabaseConfiguration } from 'cbl-reactnative';
import { USE_TURBO_MODULES } from 'cbl-reactnative/src/feature-flags';

/**
 * Phase 1 Turbo Module Test Screen
 * Tests the three core database operations with Turbo Module routing
 */
export default function TurboTestScreen() {
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const [db, setDb] = useState<Database | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const styles = useStyleScheme();

  const addResult = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setResultsMessage((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const testDatabaseOpen = async () => {
    setIsLoading(true);
    try {
      addResult('🧪 Testing database_Open...');
      const start = performance.now();

      const config = new DatabaseConfiguration();
      config.setEncryptionKey('test-turbo-key-12345');

      const database = new Database('test-turbo-db', config);
      await database.open();

      const end = performance.now();
      const duration = (end - start).toFixed(2);
      addResult(`✅ Database opened in ${duration}ms`);

      setDb(database);
    } catch (error: any) {
      addResult(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDatabaseGetPath = async () => {
    if (!db) {
      addResult('❌ Open database first');
      return;
    }

    setIsLoading(true);
    try {
      addResult('🧪 Testing database_GetPath...');
      const start = performance.now();

      const path = await db.getPath();

      const end = performance.now();
      const duration = (end - start).toFixed(2);
      addResult(`✅ Got path in ${duration}ms`);
      addResult(`📁 Path: ${path}`);
    } catch (error: any) {
      addResult(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDatabaseClose = async () => {
    if (!db) {
      addResult('❌ Open database first');
      return;
    }

    setIsLoading(true);
    try {
      addResult('🧪 Testing database_Close...');
      const start = performance.now();

      await db.close();

      const end = performance.now();
      const duration = (end - start).toFixed(2);
      addResult(`✅ Database closed in ${duration}ms`);

      setDb(null);
    } catch (error: any) {
      addResult(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResultsMessage([]);
  };

  const runAllTests = async () => {
    clearResults();
    addResult('🚀 Running all Phase 1 tests...');
    addResult('');

    // Test 1: Open
    await testDatabaseOpen();
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Test 2: Get Path (only if db opened successfully)
    if (db) {
      await testDatabaseGetPath();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Test 3: Close
      await testDatabaseClose();
    }

    addResult('');
    addResult('✨ All tests completed!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={localStyles.header}>
        <Text style={localStyles.title}>Phase 1: Turbo Module Test</Text>
        <Text
          style={[
            localStyles.mode,
            { color: USE_TURBO_MODULES ? '#10b981' : '#f59e0b' },
          ]}
        >
          {USE_TURBO_MODULES ? '⚡ TURBO MODULES' : '🐌 LEGACY BRIDGE'}
        </Text>
        <Text style={localStyles.subtitle}>
          Tests: database_Open, database_GetPath, database_Close
        </Text>
      </View>

      <View style={localStyles.buttons}>
        <View style={localStyles.buttonRow}>
          <View style={localStyles.buttonWrapper}>
            <Button
              title="1. Open DB"
              onPress={testDatabaseOpen}
              disabled={isLoading || db !== null}
            />
          </View>
          <View style={localStyles.buttonWrapper}>
            <Button
              title="2. Get Path"
              onPress={testDatabaseGetPath}
              disabled={isLoading || !db}
            />
          </View>
        </View>

        <View style={localStyles.buttonRow}>
          <View style={localStyles.buttonWrapper}>
            <Button
              title="3. Close DB"
              onPress={testDatabaseClose}
              disabled={isLoading || !db}
            />
          </View>
          <View style={localStyles.buttonWrapper}>
            <Button title="Clear" onPress={clearResults} color="#6b7280" />
          </View>
        </View>

        <View style={localStyles.runAllButton}>
          <Button
            title="▶️ Run All Tests"
            onPress={runAllTests}
            disabled={isLoading}
            color="#3b82f6"
          />
        </View>
      </View>

      <ResultListView messages={resultMessage} />
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
  runAllButton: {
    marginTop: 8,
  },
});
