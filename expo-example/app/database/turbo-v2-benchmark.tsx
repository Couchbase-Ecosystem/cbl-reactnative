import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import NativeCblSwiftModule from '../../../src/specs/NativeCblSwift';
import NativeCblCModule from '../../../src/specs/NativeCblC';

// These may be null if the native turbo-v2 modules aren't compiled in
const NativeCblSwift = NativeCblSwiftModule;
const NativeCblC = NativeCblCModule;

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME = 'turbo-v2-bench';
const SCOPE = '_default';
const COLLECTION = 'items';

// Document size presets
const DOC_SIZE_OPTIONS = [
  { label: 'Small (~100B)', value: 100 },
  { label: 'Medium (~1KB)', value: 1000 },
  { label: 'Large (~10KB)', value: 10000 },
] as const;

// Default counts
const DEFAULT_SINGLE_DOC_COUNT = 1000;
const DEFAULT_BATCH_DOC_COUNT = 100000;
const DEFAULT_BATCH_GET_COUNT = 10000;

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const getDocumentsDirectory = (): string => {
  let dir = FileSystem.documentDirectory || '';
  if (dir.startsWith('file://')) {
    dir = dir.substring(7);
  }
  return dir;
};

const generateDoc = (index: number, size: number) => {
  const padding = 'x'.repeat(Math.max(0, size - 100));
  return {
    id: `item_${index}`,
    name: `Item ${index}`,
    type: 'product',
    price: Math.random() * 1000,
    quantity: Math.floor(Math.random() * 100),
    category: ['electronics', 'books', 'clothing', 'food'][index % 4],
    tags: ['tag1', 'tag2', 'tag3'],
    timestamp: Date.now(),
    padding,
  };
};

const formatTime = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatThroughput = (count: number, timeMs: number): string => {
  const opsPerSec = Math.round((count / timeMs) * 1000);
  return `${opsPerSec.toLocaleString()} ops/sec`;
};

// Max docs per batch call to avoid Hermes "String length exceeds limit"
const BATCH_CHUNK_SIZE = 5000;

/** Splits an array into chunks and calls collection_BatchSave for each. */
const batchSaveChunked = async (
  mod: any,
  databaseUniqueName: string,
  docs: { id: string; data: string }[],
) => {
  let totalSaved = 0;
  let totalFailed = 0;
  let totalNativeMs = 0;

  for (let offset = 0; offset < docs.length; offset += BATCH_CHUNK_SIZE) {
    const chunk = docs.slice(offset, offset + BATCH_CHUNK_SIZE);
    const result = await mod.collection_BatchSave({
      name: databaseUniqueName,
      scopeName: SCOPE,
      collectionName: COLLECTION,
      docsJson: JSON.stringify(chunk),
    });
    totalSaved += result.saved;
    totalFailed += result.failed;
    totalNativeMs += result.timeMs;
  }
  return { saved: totalSaved, failed: totalFailed, timeMs: totalNativeMs };
};

/** Splits doc IDs into chunks and calls collection_BatchGet for each. */
const batchGetChunked = async (
  mod: any,
  databaseUniqueName: string,
  docIds: string[],
) => {
  const allDocs: any[] = [];

  for (let offset = 0; offset < docIds.length; offset += BATCH_CHUNK_SIZE) {
    const chunk = docIds.slice(offset, offset + BATCH_CHUNK_SIZE);
    const result = await mod.collection_BatchGet({
      name: databaseUniqueName,
      scopeName: SCOPE,
      collectionName: COLLECTION,
      docIdsJson: JSON.stringify(chunk),
    });
    const parsed = JSON.parse(result);
    allDocs.push(...parsed);
  }
  return allDocs;
};

/** Splits doc IDs into chunks and calls collection_BatchDelete for each. */
const batchDeleteChunked = async (
  mod: any,
  databaseUniqueName: string,
  docIds: string[],
) => {
  let totalDeleted = 0;
  let totalFailed = 0;
  let totalNativeMs = 0;

  for (let offset = 0; offset < docIds.length; offset += BATCH_CHUNK_SIZE) {
    const chunk = docIds.slice(offset, offset + BATCH_CHUNK_SIZE);
    const result = await mod.collection_BatchDelete({
      name: databaseUniqueName,
      scopeName: SCOPE,
      collectionName: COLLECTION,
      docIdsJson: JSON.stringify(chunk),
    });
    totalDeleted += result.deleted;
    totalFailed += result.failed;
    totalNativeMs += result.timeMs;
  }
  return { deleted: totalDeleted, failed: totalFailed, timeMs: totalNativeMs };
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TurboV2Benchmark() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');

  // Configurable parameters
  const [docSize, setDocSize] = useState<number>(DOC_SIZE_OPTIONS[1].value); // Medium
  const [singleDocCount, setSingleDocCount] = useState(String(DEFAULT_SINGLE_DOC_COUNT));
  const [batchDocCount, setBatchDocCount] = useState(String(DEFAULT_BATCH_DOC_COUNT));
  const [batchGetCount, setBatchGetCount] = useState(String(DEFAULT_BATCH_GET_COUNT));

  const parsedSingleCount = Math.max(1, parseInt(singleDocCount, 10) || DEFAULT_SINGLE_DOC_COUNT);
  const parsedBatchCount = Math.max(1, parseInt(batchDocCount, 10) || DEFAULT_BATCH_DOC_COUNT);
  const parsedBatchGetCount = Math.max(1, parseInt(batchGetCount, 10) || DEFAULT_BATCH_GET_COUNT);

  const addResult = (message: string) => {
    setResults((prev) => [...prev, message]);
  };

  const clearResults = () => {
    setResults([]);
    setCurrentTest('');
  };

  const copyResults = async () => {
    const text = results.join('\n');
    await Clipboard.setStringAsync(text);
    addResult('\n📋 Results copied to clipboard!');
  };

  const docSizeLabel = DOC_SIZE_OPTIONS.find(o => o.value === docSize)?.label ?? 'Custom';

  // ───────────────────────────────────────────────────────────────────────────
  // Test 1: Single Document Save
  // ───────────────────────────────────────────────────────────────────────────

  const testSingleSave = async (mod: any, engineName: string) => {
    const dir = getDocumentsDirectory();

    const { databaseUniqueName } = await mod.database_Open({
      name: DB_NAME,
      directory: dir,
      encryptionKey: null,
    });

    await mod.collection_CreateCollection({
      name: databaseUniqueName,
      scopeName: SCOPE,
      collectionName: COLLECTION,
    });

    const start = performance.now();
    for (let i = 0; i < parsedSingleCount; i++) {
      const doc = generateDoc(i, docSize);
      await mod.collection_Save({
        name: databaseUniqueName,
        scopeName: SCOPE,
        collectionName: COLLECTION,
        id: `doc_${i}`,
        document: JSON.stringify(doc),
        blobs: '',
        concurrencyControl: -9999,
      });
    }
    const timeMs = performance.now() - start;

    const { count } = await mod.collection_GetCount({
      name: databaseUniqueName,
      scopeName: SCOPE,
      collectionName: COLLECTION,
    });

    await mod.database_Close({ name: databaseUniqueName });
    await mod.database_DeleteWithPath({ databaseName: DB_NAME, directory: dir });

    return { timeMs, count };
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Test 2: Batch Document Save
  // ───────────────────────────────────────────────────────────────────────────

  const testBatchSave = async (mod: any, engineName: string) => {
    const dir = getDocumentsDirectory();

    const { databaseUniqueName } = await mod.database_Open({
      name: DB_NAME,
      directory: dir,
      encryptionKey: null,
    });

    await mod.collection_CreateCollection({
      name: databaseUniqueName,
      scopeName: SCOPE,
      collectionName: COLLECTION,
    });

    // Build all docs
    const docs = [];
    for (let i = 0; i < parsedBatchCount; i++) {
      docs.push({ id: `doc_${i}`, data: JSON.stringify(generateDoc(i, docSize)) });
    }

    const start = performance.now();
    const result = await batchSaveChunked(mod, databaseUniqueName, docs);
    const timeMs = performance.now() - start;

    const { count } = await mod.collection_GetCount({
      name: databaseUniqueName,
      scopeName: SCOPE,
      collectionName: COLLECTION,
    });

    addResult(
      `  ${engineName} - Saved: ${result.saved}, Failed: ${result.failed}, Native: ${result.timeMs.toFixed(0)}ms`
    );

    await mod.database_Close({ name: databaseUniqueName });
    await mod.database_DeleteWithPath({ databaseName: DB_NAME, directory: dir });

    return { timeMs, count };
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Test 3: Single Document Get
  // ───────────────────────────────────────────────────────────────────────────

  const testSingleGet = async (mod: any, engineName: string) => {
    const dir = getDocumentsDirectory();

    const { databaseUniqueName } = await mod.database_Open({
      name: DB_NAME,
      directory: dir,
      encryptionKey: null,
    });

    await mod.collection_CreateCollection({
      name: databaseUniqueName,
      scopeName: SCOPE,
      collectionName: COLLECTION,
    });

    // Pre-populate
    for (let i = 0; i < parsedSingleCount; i++) {
      const doc = generateDoc(i, docSize);
      await mod.collection_Save({
        name: databaseUniqueName,
        scopeName: SCOPE,
        collectionName: COLLECTION,
        id: `doc_${i}`,
        document: JSON.stringify(doc),
        blobs: '',
        concurrencyControl: -9999,
      });
    }

    // Benchmark reads
    const start = performance.now();
    let retrieved = 0;
    for (let i = 0; i < parsedSingleCount; i++) {
      const doc = await mod.collection_GetDocument({
        name: databaseUniqueName,
        scopeName: SCOPE,
        collectionName: COLLECTION,
        docId: `doc_${i}`,
      });
      if (doc) retrieved++;
    }
    const timeMs = performance.now() - start;

    await mod.database_Close({ name: databaseUniqueName });
    await mod.database_DeleteWithPath({ databaseName: DB_NAME, directory: dir });

    return { timeMs, count: retrieved };
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Test 4: Batch Document Get
  // ───────────────────────────────────────────────────────────────────────────

  const testBatchGet = async (mod: any, engineName: string) => {
    const dir = getDocumentsDirectory();

    const { databaseUniqueName } = await mod.database_Open({
      name: DB_NAME,
      directory: dir,
      encryptionKey: null,
    });

    await mod.collection_CreateCollection({
      name: databaseUniqueName,
      scopeName: SCOPE,
      collectionName: COLLECTION,
    });

    // Pre-populate using chunked batch save
    const docs = [];
    for (let i = 0; i < parsedBatchGetCount; i++) {
      docs.push({ id: `doc_${i}`, data: JSON.stringify(generateDoc(i, docSize)) });
    }
    await batchSaveChunked(mod, databaseUniqueName, docs);

    // Benchmark batch read
    const docIds = [];
    for (let i = 0; i < parsedBatchGetCount; i++) {
      docIds.push(`doc_${i}`);
    }

    const start = performance.now();
    const retrievedDocs = await batchGetChunked(mod, databaseUniqueName, docIds);
    const timeMs = performance.now() - start;

    addResult(
      `  ${engineName} - Retrieved: ${retrievedDocs.length} docs`
    );

    await mod.database_Close({ name: databaseUniqueName });
    await mod.database_DeleteWithPath({ databaseName: DB_NAME, directory: dir });

    return { timeMs, count: retrievedDocs.length };
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Test 5: Single Document Update
  // ───────────────────────────────────────────────────────────────────────────

  const testSingleUpdate = async (mod: any, engineName: string) => {
    const dir = getDocumentsDirectory();

    const { databaseUniqueName } = await mod.database_Open({
      name: DB_NAME,
      directory: dir,
      encryptionKey: null,
    });

    await mod.collection_CreateCollection({
      name: databaseUniqueName,
      scopeName: SCOPE,
      collectionName: COLLECTION,
    });

    // Pre-populate
    for (let i = 0; i < parsedSingleCount; i++) {
      const doc = generateDoc(i, docSize);
      await mod.collection_Save({
        name: databaseUniqueName,
        scopeName: SCOPE,
        collectionName: COLLECTION,
        id: `doc_${i}`,
        document: JSON.stringify(doc),
        blobs: '',
        concurrencyControl: -9999,
      });
    }

    // Benchmark updates
    const start = performance.now();
    for (let i = 0; i < parsedSingleCount; i++) {
      const doc = { ...generateDoc(i, docSize), updated: true };
      await mod.collection_Save({
        name: databaseUniqueName,
        scopeName: SCOPE,
        collectionName: COLLECTION,
        id: `doc_${i}`,
        document: JSON.stringify(doc),
        blobs: '',
        concurrencyControl: -9999,
      });
    }
    const timeMs = performance.now() - start;

    await mod.database_Close({ name: databaseUniqueName });
    await mod.database_DeleteWithPath({ databaseName: DB_NAME, directory: dir });

    return { timeMs, count: parsedSingleCount };
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Test 6: Batch Document Update
  // ───────────────────────────────────────────────────────────────────────────

  const testBatchUpdate = async (mod: any, engineName: string) => {
    const dir = getDocumentsDirectory();

    const { databaseUniqueName } = await mod.database_Open({
      name: DB_NAME,
      directory: dir,
      encryptionKey: null,
    });

    await mod.collection_CreateCollection({
      name: databaseUniqueName,
      scopeName: SCOPE,
      collectionName: COLLECTION,
    });

    // Pre-populate using chunked batch save
    const originalDocs = [];
    for (let i = 0; i < parsedBatchCount; i++) {
      originalDocs.push({ id: `doc_${i}`, data: JSON.stringify(generateDoc(i, docSize)) });
    }
    await batchSaveChunked(mod, databaseUniqueName, originalDocs);

    // Benchmark batch update
    const updatedDocs = [];
    for (let i = 0; i < parsedBatchCount; i++) {
      updatedDocs.push({
        id: `doc_${i}`,
        data: JSON.stringify({ ...generateDoc(i, docSize), updated: true }),
      });
    }

    const start = performance.now();
    const result = await batchSaveChunked(mod, databaseUniqueName, updatedDocs);
    const timeMs = performance.now() - start;

    addResult(
      `  ${engineName} - Updated: ${result.saved}, Native: ${result.timeMs.toFixed(0)}ms`
    );

    await mod.database_Close({ name: databaseUniqueName });
    await mod.database_DeleteWithPath({ databaseName: DB_NAME, directory: dir });

    return { timeMs, count: result.saved };
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Test 7: Single Document Delete
  // ───────────────────────────────────────────────────────────────────────────

  const testSingleDelete = async (mod: any, engineName: string) => {
    const dir = getDocumentsDirectory();

    const { databaseUniqueName } = await mod.database_Open({
      name: DB_NAME,
      directory: dir,
      encryptionKey: null,
    });

    await mod.collection_CreateCollection({
      name: databaseUniqueName,
      scopeName: SCOPE,
      collectionName: COLLECTION,
    });

    // Pre-populate
    for (let i = 0; i < parsedSingleCount; i++) {
      const doc = generateDoc(i, docSize);
      await mod.collection_Save({
        name: databaseUniqueName,
        scopeName: SCOPE,
        collectionName: COLLECTION,
        id: `doc_${i}`,
        document: JSON.stringify(doc),
        blobs: '',
        concurrencyControl: -9999,
      });
    }

    // Benchmark deletes
    const start = performance.now();
    for (let i = 0; i < parsedSingleCount; i++) {
      await mod.collection_DeleteDocument({
        name: databaseUniqueName,
        scopeName: SCOPE,
        collectionName: COLLECTION,
        docId: `doc_${i}`,
        concurrencyControl: -9999,
      });
    }
    const timeMs = performance.now() - start;

    const { count } = await mod.collection_GetCount({
      name: databaseUniqueName,
      scopeName: SCOPE,
      collectionName: COLLECTION,
    });

    addResult(`  ${engineName} - Remaining: ${count}`);

    await mod.database_Close({ name: databaseUniqueName });
    await mod.database_DeleteWithPath({ databaseName: DB_NAME, directory: dir });

    return { timeMs, count: parsedSingleCount };
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Test 8: Batch Document Delete
  // ───────────────────────────────────────────────────────────────────────────

  const testBatchDelete = async (mod: any, engineName: string) => {
    const dir = getDocumentsDirectory();

    const { databaseUniqueName } = await mod.database_Open({
      name: DB_NAME,
      directory: dir,
      encryptionKey: null,
    });

    await mod.collection_CreateCollection({
      name: databaseUniqueName,
      scopeName: SCOPE,
      collectionName: COLLECTION,
    });

    // Pre-populate using chunked batch save
    const docs = [];
    for (let i = 0; i < parsedBatchCount; i++) {
      docs.push({ id: `doc_${i}`, data: JSON.stringify(generateDoc(i, docSize)) });
    }
    await batchSaveChunked(mod, databaseUniqueName, docs);

    // Benchmark batch delete
    const docIds = [];
    for (let i = 0; i < parsedBatchCount; i++) {
      docIds.push(`doc_${i}`);
    }

    const start = performance.now();
    const result = await batchDeleteChunked(mod, databaseUniqueName, docIds);
    const timeMs = performance.now() - start;

    addResult(
      `  ${engineName} - Deleted: ${result.deleted}, Native: ${result.timeMs.toFixed(0)}ms`
    );

    const { count } = await mod.collection_GetCount({
      name: databaseUniqueName,
      scopeName: SCOPE,
      collectionName: COLLECTION,
    });

    addResult(`  ${engineName} - Remaining: ${count}`);

    await mod.database_Close({ name: databaseUniqueName });
    await mod.database_DeleteWithPath({ databaseName: DB_NAME, directory: dir });

    return { timeMs, count: result.deleted };
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Test 9: Query Execution
  // ───────────────────────────────────────────────────────────────────────────

  const testQuery = async (mod: any, engineName: string) => {
    const dir = getDocumentsDirectory();

    const { databaseUniqueName } = await mod.database_Open({
      name: DB_NAME,
      directory: dir,
      encryptionKey: null,
    });

    await mod.collection_CreateCollection({
      name: databaseUniqueName,
      scopeName: SCOPE,
      collectionName: COLLECTION,
    });

    // Pre-populate
    const docs = [];
    for (let i = 0; i < parsedBatchGetCount; i++) {
      docs.push({ id: `doc_${i}`, data: JSON.stringify(generateDoc(i, docSize)) });
    }
    await batchSaveChunked(mod, databaseUniqueName, docs);

    // Benchmark query
    const queryString = `SELECT * FROM ${COLLECTION} WHERE price > $minPrice LIMIT 100`;
    const parameters = { minPrice: 500 };

    const start = performance.now();
    const result = await mod.query_Execute({
      query: queryString,
      parameters,
      name: databaseUniqueName,
    });
    const timeMs = performance.now() - start;

    const resultArray = JSON.parse(result);
    addResult(`  ${engineName} - Found: ${resultArray.length} docs`);

    await mod.database_Close({ name: databaseUniqueName });
    await mod.database_DeleteWithPath({ databaseName: DB_NAME, directory: dir });

    return { timeMs, count: resultArray.length };
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Run All Tests
  // ───────────────────────────────────────────────────────────────────────────

  const runAllTests = async () => {
    setIsRunning(true);
    clearResults();

    try {
      if (!NativeCblSwift || !NativeCblC) {
        addResult('❌ Turbo V2 native modules are not available.');
        addResult('The CblSwift and/or CblC native modules are not compiled into this build.');
        addResult('Please ensure the turbo-v2 native code is included and codegen has been run.');
        setIsRunning(false);
        return;
      }

      addResult('🚀 Turbo V2 Performance Benchmark (Fair)\n');
      addResult(`Platform: ${Platform.OS}`);
      addResult(`Doc Size: ${docSizeLabel}`);
      addResult(`Single Ops: ${parsedSingleCount.toLocaleString()}`);
      addResult(`Batch Ops: ${parsedBatchCount.toLocaleString()}`);
      addResult(`Batch Get: ${parsedBatchGetCount.toLocaleString()}`);
      addResult('Note: Test order alternates to eliminate ordering bias.');
      addResult('Each test runs a warm-up round first.\n');
      addResult('─'.repeat(50) + '\n');

      const tests = [
        { name: 'Single Save', fn: testSingleSave, count: parsedSingleCount },
        { name: 'Batch Save', fn: testBatchSave, count: parsedBatchCount },
        { name: 'Single Get', fn: testSingleGet, count: parsedSingleCount },
        { name: 'Batch Get', fn: testBatchGet, count: parsedBatchGetCount },
        { name: 'Single Update', fn: testSingleUpdate, count: parsedSingleCount },
        { name: 'Batch Update', fn: testBatchUpdate, count: parsedBatchCount },
        { name: 'Single Delete', fn: testSingleDelete, count: parsedSingleCount },
        { name: 'Batch Delete', fn: testBatchDelete, count: parsedBatchCount },
        { name: 'Query', fn: testQuery, count: 100 },
      ];

      for (let testIdx = 0; testIdx < tests.length; testIdx++) {
        const test = tests[testIdx];
        setCurrentTest(test.name);
        addResult(`\n📊 Test: ${test.name}`);

        // Warm-up: run each engine once (results discarded) to prime caches/JIT
        addResult('  Warm-up round...');
        await test.fn(NativeCblSwift, 'Swift-warmup');
        await test.fn(NativeCblC, 'C-warmup');

        // Alternate order: even-indexed tests run Swift first, odd run C first
        const swiftFirst = testIdx % 2 === 0;
        const firstLabel = swiftFirst ? 'Swift' : 'C';
        const secondLabel = swiftFirst ? 'C' : 'Swift';
        const firstMod = swiftFirst ? NativeCblSwift : NativeCblC;
        const secondMod = swiftFirst ? NativeCblC : NativeCblSwift;

        addResult(`  Order: ${firstLabel} → ${secondLabel}`);

        // Run first engine
        addResult(`  Running ${firstLabel} engine...`);
        const firstStart = performance.now();
        await test.fn(firstMod, firstLabel);
        const firstTime = performance.now() - firstStart;
        addResult(
          `  ✅ ${firstLabel}: ${formatTime(firstTime)} - ${formatThroughput(test.count, firstTime)}`
        );

        // Run second engine
        addResult(`  Running ${secondLabel} engine...`);
        const secondStart = performance.now();
        await test.fn(secondMod, secondLabel);
        const secondTime = performance.now() - secondStart;
        addResult(
          `  ✅ ${secondLabel}: ${formatTime(secondTime)} - ${formatThroughput(test.count, secondTime)}`
        );

        // Comparison (map back to Swift/C times)
        const swiftTime = swiftFirst ? firstTime : secondTime;
        const cTime = swiftFirst ? secondTime : firstTime;
        const faster = swiftTime < cTime ? 'Swift' : 'C';
        const speedup = ((Math.max(swiftTime, cTime) / Math.min(swiftTime, cTime)) * 100 - 100).toFixed(1);
        addResult(`  🏆 ${faster} is ${speedup}% faster\n`);
      }

      addResult('─'.repeat(50));
      addResult('\n✅ All tests completed!');
      addResult('\nTip: Tap "Copy Results" to share these results.');

    } catch (error: any) {
      addResult(`\n❌ Error: ${error.message}`);
      console.error(error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // UI Rendering
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Turbo V2 Benchmark</Text>
        <Text style={styles.subtitle}>
          Swift SDK vs C Library Performance Comparison
        </Text>
      </View>

      {/* Configuration Panel */}
      <View style={styles.configPanel}>
        {/* Doc Size Selector */}
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>Doc Size</Text>
          <View style={styles.segmentedControl}>
            {DOC_SIZE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.segmentButton,
                  docSize === option.value && styles.segmentButtonActive,
                ]}
                onPress={() => setDocSize(option.value)}
                disabled={isRunning}
              >
                <Text
                  style={[
                    styles.segmentText,
                    docSize === option.value && styles.segmentTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Count Inputs */}
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>Single Ops</Text>
          <TextInput
            style={[styles.configInput, isRunning && styles.configInputDisabled]}
            value={singleDocCount}
            onChangeText={setSingleDocCount}
            keyboardType="number-pad"
            editable={!isRunning}
            selectTextOnFocus
          />
        </View>

        <View style={styles.configRow}>
          <Text style={styles.configLabel}>Batch Ops</Text>
          <TextInput
            style={[styles.configInput, isRunning && styles.configInputDisabled]}
            value={batchDocCount}
            onChangeText={setBatchDocCount}
            keyboardType="number-pad"
            editable={!isRunning}
            selectTextOnFocus
          />
        </View>

        <View style={styles.configRow}>
          <Text style={styles.configLabel}>Batch Get</Text>
          <TextInput
            style={[styles.configInput, isRunning && styles.configInputDisabled]}
            value={batchGetCount}
            onChangeText={setBatchGetCount}
            keyboardType="number-pad"
            editable={!isRunning}
            selectTextOnFocus
          />
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, isRunning && styles.buttonDisabled]}
          onPress={runAllTests}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? 'Running...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, results.length === 0 && styles.buttonDisabled]}
          onPress={copyResults}
          disabled={results.length === 0}
        >
          <Text style={styles.buttonText}>Copy Results</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {isRunning && currentTest && (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.progressText}>Running: {currentTest}</Text>
        </View>
      )}

      <ScrollView
        style={styles.resultsContainer}
        contentContainerStyle={styles.resultsContent}
      >
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#E0E0E0',
  },
  configPanel: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
    gap: 10,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  configLabel: {
    width: 80,
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  segmentedControl: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  segmentButtonActive: {
    backgroundColor: '#007AFF',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  configInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#333333',
    backgroundColor: '#FAFAFA',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  configInputDisabled: {
    backgroundColor: '#EEEEEE',
    color: '#999999',
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: '#5856D6',
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#E8F4FD',
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 8,
    gap: 10,
  },
  progressText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  resultsContent: {
    padding: 15,
  },
  resultText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#333333',
    lineHeight: 20,
  },
});
