import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import NativeCblSwiftModule from '../../../src/specs/NativeCblSwift';
import NativeCblCModule from '../../../src/specs/NativeCblC';
import { generateNestedDoc } from '../../lib/benchmark/generators';
import { MAX_BATCH_CHUNK_DOCS } from '../../lib/benchmark/types';
import { copyToClipboard } from '../../lib/benchmark/export';

// ─────────────────────────────────────────────────────────────────────────────
// Config — hardcoded for local Docker Sync Gateway
// ─────────────────────────────────────────────────────────────────────────────

const ENDPOINT = Platform.OS === 'android'
  ? 'ws://10.0.2.2:4984/repl-bench'
  : 'ws://localhost:4984/repl-bench';

const USERNAME = 'jayantdhingra';
const PASSWORD = 'f9yu5QT4B5jpZep@';
const SCOPE = 'replicator';
const COLLECTION = 'bench_100b_swift';
const DB_NAME = 'repl-bench';
const DB_NAME_STAGE = 'repl-bench-stage';
const DOC_COUNT = 100;
const DOC_SIZE = 100;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVITY = { STOPPED: 0, OFFLINE: 1, CONNECTING: 2, IDLE: 3, BUSY: 4 } as const;
const ACTIVITY_LABELS: Record<number, string> = {
  0: 'Stopped', 1: 'Offline', 2: 'Connecting', 3: 'Idle', 4: 'Busy',
};
const REPLICATOR_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 500;
const LOCAL_VERIFY_MAX_WAIT_MS = 60_000;
const LOCAL_VERIFY_POLL_MS = 2_000;
const SERVER_PROPAGATION_DELAY_MS = 1_000;

const TEST_TYPES = [
  'push_create', 'push_update', 'push_delete',
  'pull_create', 'pull_update', 'pull_delete',
  'bidirectional',
] as const;

type TestType = typeof TEST_TYPES[number];

const TEST_LABELS: Record<TestType, string> = {
  push_create: 'Push-Create',
  push_update: 'Push-Update',
  push_delete: 'Push-Delete',
  pull_create: 'Pull-Create',
  pull_update: 'Pull-Update',
  pull_delete: 'Pull-Delete',
  bidirectional: 'Bidirectional',
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const getDocumentsDirectory = (): string => {
  let dir = FileSystem.documentDirectory || '';
  if (dir.startsWith('file://')) dir = dir.substring(7);
  return dir;
};

const makeRunId = () => Math.random().toString(36).substring(2, 6);

// ─────────────────────────────────────────────────────────────────────────────
// Database Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function openDatabase(mod: any, dbNameOverride?: string): Promise<string> {
  const dir = getDocumentsDirectory();
  const name = dbNameOverride || DB_NAME;
  try { await mod.database_DeleteWithPath({ databaseName: name, directory: dir }); } catch { /* OK */ }
  const { databaseUniqueName } = await mod.database_Open({
    name, directory: dir, encryptionKey: null,
  });
  await mod.collection_CreateCollection({
    name: databaseUniqueName, scopeName: SCOPE, collectionName: COLLECTION,
  });
  return databaseUniqueName;
}

async function closeAndDeleteDatabase(mod: any, databaseUniqueName: string, dbNameOverride?: string): Promise<void> {
  const dir = getDocumentsDirectory();
  try { await mod.database_Close({ name: databaseUniqueName }); } catch { /* ok */ }
  try { await mod.database_DeleteWithPath({ databaseName: dbNameOverride || DB_NAME, directory: dir }); } catch { /* ok */ }
}

async function batchSaveChunked(
  mod: any, dbName: string, docs: { id: string; data: string }[],
): Promise<{ saved: number; failed: number }> {
  let totalSaved = 0;
  let totalFailed = 0;
  for (let offset = 0; offset < docs.length; offset += MAX_BATCH_CHUNK_DOCS) {
    const chunk = docs.slice(offset, offset + MAX_BATCH_CHUNK_DOCS);
    const result = await mod.collection_BatchSave({
      name: dbName, scopeName: SCOPE, collectionName: COLLECTION,
      docsJson: JSON.stringify(chunk),
    });
    totalSaved += result.saved;
    totalFailed += result.failed;
  }
  return { saved: totalSaved, failed: totalFailed };
}

async function batchDeleteChunked(
  mod: any, dbName: string, docIds: string[],
): Promise<{ deleted: number; failed: number }> {
  let totalDeleted = 0;
  let totalFailed = 0;
  for (let offset = 0; offset < docIds.length; offset += MAX_BATCH_CHUNK_DOCS) {
    const chunk = docIds.slice(offset, offset + MAX_BATCH_CHUNK_DOCS);
    const result = await mod.collection_BatchDelete({
      name: dbName, scopeName: SCOPE, collectionName: COLLECTION,
      docIdsJson: JSON.stringify(chunk),
    });
    totalDeleted += result.deleted;
    totalFailed += result.failed;
  }
  return { deleted: totalDeleted, failed: totalFailed };
}

function generateDocs(count: number, prefix: string = 'doc'): { id: string; data: string }[] {
  const docs: { id: string; data: string }[] = [];
  for (let i = 0; i < count; i++) {
    const doc = generateNestedDoc(i, DOC_SIZE);
    docs.push({ id: `${prefix}_${i}`, data: JSON.stringify(doc) });
  }
  return docs;
}

function generateUpdatedDocs(count: number, prefix: string = 'doc'): { id: string; data: string }[] {
  const docs: { id: string; data: string }[] = [];
  for (let i = 0; i < count; i++) {
    const doc = generateNestedDoc(i, DOC_SIZE) as any;
    doc.__updated = true;
    doc.__updateTs = Date.now();
    doc.__updateIter = Math.random();
    docs.push({ id: `${prefix}_${i}`, data: JSON.stringify(doc) });
  }
  return docs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Replicator Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildReplicatorConfig(
  databaseName: string, type: 'push' | 'pull' | 'pushAndPull',
  continuous: boolean = false,
): string {
  return JSON.stringify({
    databaseName, endpoint: ENDPOINT, username: USERNAME, password: PASSWORD,
    replicatorType: type, continuous,
    collections: [{ scope: SCOPE, name: COLLECTION }],
  });
}

async function waitForReplicatorDone(
  mod: any, replicatorId: string,
): Promise<{ activity: number; progress: { completed: number; total: number }; error: string | null; elapsedMs: number }> {
  const start = performance.now();
  while (performance.now() - start < REPLICATOR_TIMEOUT_MS) {
    const status = await mod.replicator_GetStatus({ replicatorId });
    if (status.error && typeof status.error === 'string' && status.error.length > 0) {
      throw new Error(`Replicator error: ${status.error}`);
    }
    if (status.activity === ACTIVITY.STOPPED || status.activity === ACTIVITY.IDLE) {
      return { ...status, elapsedMs: performance.now() - start };
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Replicator timed out after ${REPLICATOR_TIMEOUT_MS / 1000}s`);
}

async function runReplicator(
  mod: any, dbName: string, type: 'push' | 'pull' | 'pushAndPull',
): Promise<{ elapsedMs: number; activity: number; progress: { completed: number; total: number } }> {
  const config = buildReplicatorConfig(dbName, type);
  const { replicatorId } = await mod.replicator_Create({ config });
  await mod.replicator_Start({ replicatorId });
  const result = await waitForReplicatorDone(mod, replicatorId);
  await mod.replicator_Cleanup({ replicatorId });
  return result;
}

async function waitForServerReady(
  mod: any, expectedCount: number, log: (msg: string) => void,
): Promise<boolean> {
  const verifyDbName = 'repl-bench-verify';
  const dbName = await openDatabase(mod, verifyDbName);
  try {
    const config = buildReplicatorConfig(dbName, 'pull', true);
    const { replicatorId } = await mod.replicator_Create({ config });
    await mod.replicator_Start({ replicatorId });

    const start = performance.now();
    let lastCount = 0;
    let lastLogAt = 0;

    while (performance.now() - start < LOCAL_VERIFY_MAX_WAIT_MS) {
      await new Promise((r) => setTimeout(r, LOCAL_VERIFY_POLL_MS));
      const { count } = await mod.collection_GetCount({
        name: dbName, scopeName: SCOPE, collectionName: COLLECTION,
      });
      if (count >= expectedCount) {
        const elapsed = ((performance.now() - start) / 1000).toFixed(0);
        log(`  [verify] ${count} docs ready (waited ${elapsed}s)`);
        try { await mod.replicator_Stop({ replicatorId }); } catch { /* ok */ }
        try { await mod.replicator_Cleanup({ replicatorId }); } catch { /* ok */ }
        return true;
      }
      lastCount = count;
      const elapsedSec = (performance.now() - start) / 1000;
      if (elapsedSec - lastLogAt >= 10) {
        log(`  [verify] Waiting... ${lastCount}/${expectedCount} docs (${elapsedSec.toFixed(0)}s)`);
        lastLogAt = elapsedSec;
      }
    }

    try { await mod.replicator_Stop({ replicatorId }); } catch { /* ok */ }
    try { await mod.replicator_Cleanup({ replicatorId }); } catch { /* ok */ }
    const elapsed = ((performance.now() - start) / 1000).toFixed(0);
    log(`  [verify] WARNING: Only ${lastCount}/${expectedCount} docs after ${elapsed}s`);
    return false;
  } finally {
    await closeAndDeleteDatabase(mod, dbName, verifyDbName);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Server State Management
// ─────────────────────────────────────────────────────────────────────────────

async function cleanupServerCollection(
  helperMod: any, log: (msg: string) => void,
): Promise<void> {
  log(`  [cleanup] Purging server collection ${COLLECTION}...`);
  const cleanupDbName = 'repl-bench-cleanup';
  const dbName = await openDatabase(helperMod, cleanupDbName);
  try {
    await runReplicator(helperMod, dbName, 'pull');
    const { count } = await helperMod.collection_GetCount({
      name: dbName, scopeName: SCOPE, collectionName: COLLECTION,
    });
    if (count > 0) {
      const queryResult = await helperMod.query_Execute({
        name: dbName,
        query: `SELECT META().id AS id FROM ${SCOPE}.${COLLECTION}`,
        parameters: null,
      });
      const rows = JSON.parse(queryResult);
      if (rows.length > 0) {
        const actualIds = rows.map((r: any) => r.id);
        await batchDeleteChunked(helperMod, dbName, actualIds);
        await runReplicator(helperMod, dbName, 'push');
        log(`  [cleanup] Deleted ${actualIds.length} docs from server`);
      } else {
        log(`  [cleanup] Server collection already empty`);
      }
    } else {
      log(`  [cleanup] Server collection already empty`);
    }
  } finally {
    await closeAndDeleteDatabase(helperMod, dbName, cleanupDbName);
  }
}

async function stageServerDocs(
  helperMod: any, count: number, prefix: string, log: (msg: string) => void,
): Promise<void> {
  log(`  [stage] Pushing ${count} docs (${prefix}_*) to server...`);
  const dbName = await openDatabase(helperMod, DB_NAME_STAGE);
  try {
    const docs = generateDocs(count, prefix);
    const saveResult = await batchSaveChunked(helperMod, dbName, docs);
    log(`  [stage] Saved ${saveResult.saved} docs locally`);
    const replResult = await runReplicator(helperMod, dbName, 'push');
    log(`  [stage] Push complete: activity=${ACTIVITY_LABELS[replResult.activity] ?? replResult.activity}, progress=${replResult.progress.completed}/${replResult.progress.total}, elapsed=${replResult.elapsedMs.toFixed(0)}ms`);
  } finally {
    await closeAndDeleteDatabase(helperMod, dbName, DB_NAME_STAGE);
  }
  await waitForServerReady(helperMod, count, log);
}

async function stageServerDocsAndUpdates(
  helperMod: any, rid: string, log: (msg: string) => void,
): Promise<void> {
  const prefix = `doc_${rid}`;
  log(`  [stage] Pushing ${DOC_COUNT} docs + updates (${prefix}_*) to server...`);
  const dbName = await openDatabase(helperMod, DB_NAME_STAGE);
  try {
    const docs = generateDocs(DOC_COUNT, prefix);
    const saveResult = await batchSaveChunked(helperMod, dbName, docs);
    log(`  [stage] Saved ${saveResult.saved} originals locally`);
    await runReplicator(helperMod, dbName, 'push');
    const updatedDocs = generateUpdatedDocs(DOC_COUNT, prefix);
    await batchSaveChunked(helperMod, dbName, updatedDocs);
    await runReplicator(helperMod, dbName, 'push');
    log(`  [stage] Updated docs pushed to server`);
  } finally {
    await closeAndDeleteDatabase(helperMod, dbName, DB_NAME_STAGE);
  }
  await waitForServerReady(helperMod, DOC_COUNT, log);
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-Test Executors (timed portion only)
// ─────────────────────────────────────────────────────────────────────────────

async function execPushCreate(mod: any, rid: string): Promise<{ timeMs: number; opsCount: number }> {
  const dbName = await openDatabase(mod);
  try {
    const docs = generateDocs(DOC_COUNT, `doc_${rid}`);
    await batchSaveChunked(mod, dbName, docs);
    const result = await runReplicator(mod, dbName, 'push');
    return { timeMs: result.elapsedMs, opsCount: DOC_COUNT };
  } finally {
    await closeAndDeleteDatabase(mod, dbName);
  }
}

async function execPushUpdate(mod: any, rid: string): Promise<{ timeMs: number; opsCount: number }> {
  const dbName = await openDatabase(mod);
  try {
    const prefix = `doc_${rid}`;
    const docs = generateDocs(DOC_COUNT, prefix);
    await batchSaveChunked(mod, dbName, docs);
    await runReplicator(mod, dbName, 'push');
    const updatedDocs = generateUpdatedDocs(DOC_COUNT, prefix);
    await batchSaveChunked(mod, dbName, updatedDocs);
    const result = await runReplicator(mod, dbName, 'push');
    return { timeMs: result.elapsedMs, opsCount: DOC_COUNT };
  } finally {
    await closeAndDeleteDatabase(mod, dbName);
  }
}

async function execPushDelete(mod: any, rid: string): Promise<{ timeMs: number; opsCount: number }> {
  const dbName = await openDatabase(mod);
  try {
    const prefix = `doc_${rid}`;
    const docs = generateDocs(DOC_COUNT, prefix);
    await batchSaveChunked(mod, dbName, docs);
    await runReplicator(mod, dbName, 'push');
    const ids = docs.map((d) => d.id);
    await batchDeleteChunked(mod, dbName, ids);
    const result = await runReplicator(mod, dbName, 'push');
    return { timeMs: result.elapsedMs, opsCount: ids.length };
  } finally {
    await closeAndDeleteDatabase(mod, dbName);
  }
}

async function execPullCreate(mod: any): Promise<{ timeMs: number; opsCount: number }> {
  const dbName = await openDatabase(mod);
  try {
    const result = await runReplicator(mod, dbName, 'pull');
    const { count } = await mod.collection_GetCount({
      name: dbName, scopeName: SCOPE, collectionName: COLLECTION,
    });
    if (count === 0) {
      console.warn(`[VALIDATION] pull_create pulled 0 docs. activity=${ACTIVITY_LABELS[result.activity]}, progress=${result.progress.completed}/${result.progress.total}`);
    }
    return { timeMs: result.elapsedMs, opsCount: count };
  } finally {
    await closeAndDeleteDatabase(mod, dbName);
  }
}

async function execPullUpdate(mod: any): Promise<{ timeMs: number; opsCount: number }> {
  const dbName = await openDatabase(mod);
  try {
    const result = await runReplicator(mod, dbName, 'pull');
    const { count: pulledCount } = await mod.collection_GetCount({
      name: dbName, scopeName: SCOPE, collectionName: COLLECTION,
    });
    return { timeMs: result.elapsedMs, opsCount: pulledCount };
  } finally {
    await closeAndDeleteDatabase(mod, dbName);
  }
}

async function execPullDelete(
  mod: any, helperMod: any, rid: string, log: (msg: string) => void,
): Promise<{ timeMs: number; opsCount: number }> {
  const dbName = await openDatabase(mod);
  try {
    // Step 1: Pull the live docs from server (establishes shared revision tree)
    await runReplicator(mod, dbName, 'pull');
    const { count: countBefore } = await mod.collection_GetCount({
      name: dbName, scopeName: SCOPE, collectionName: COLLECTION,
    });
    log(`  [pull_delete] Pulled ${countBefore} live docs (shared history established)`);

    // Step 2: Now stage tombstones on the server using helperMod
    log(`  [pull_delete] Staging tombstones on server...`);
    const stageDb = await openDatabase(helperMod, DB_NAME_STAGE);
    try {
      // Pull current docs into staging DB so we have the correct revision chain
      await runReplicator(helperMod, stageDb, 'pull');
      // Delete them locally in staging DB
      const queryResult = await helperMod.query_Execute({
        name: stageDb,
        query: `SELECT META().id AS id FROM ${SCOPE}.${COLLECTION}`,
        parameters: null,
      });
      const rows = JSON.parse(queryResult);
      if (rows.length > 0) {
        const ids = rows.map((r: any) => r.id);
        await batchDeleteChunked(helperMod, stageDb, ids);
        await runReplicator(helperMod, stageDb, 'push');
        log(`  [pull_delete] ${ids.length} tombstones pushed to server`);
      }
    } finally {
      await closeAndDeleteDatabase(helperMod, stageDb, DB_NAME_STAGE);
    }
    await new Promise((r) => setTimeout(r, SERVER_PROPAGATION_DELAY_MS));

    // Step 3: Timed — pull tombstones into test DB (deletes the local docs)
    const result = await runReplicator(mod, dbName, 'pull');
    const { count: countAfter } = await mod.collection_GetCount({
      name: dbName, scopeName: SCOPE, collectionName: COLLECTION,
    });
    const deleted = countBefore - countAfter;
    log(`  [pull_delete] Before=${countBefore}, After=${countAfter}, Deleted=${deleted}`);
    return { timeMs: result.elapsedMs, opsCount: deleted > 0 ? deleted : 0 };
  } finally {
    await closeAndDeleteDatabase(mod, dbName);
  }
}

async function execBidirectional(mod: any, rid: string): Promise<{ timeMs: number; opsCount: number }> {
  const dbName = await openDatabase(mod);
  try {
    const halfCount = Math.floor(DOC_COUNT / 2);
    const localDocs = generateDocs(halfCount, `loc_${rid}`);
    await batchSaveChunked(mod, dbName, localDocs);
    const result = await runReplicator(mod, dbName, 'pushAndPull');
    const { count: finalCount } = await mod.collection_GetCount({
      name: dbName, scopeName: SCOPE, collectionName: COLLECTION,
    });
    return { timeMs: result.elapsedMs, opsCount: finalCount };
  } finally {
    await closeAndDeleteDatabase(mod, dbName);
  }
}

async function execForSdk(
  mod: any, testType: TestType, rid: string,
): Promise<{ timeMs: number; opsCount: number }> {
  switch (testType) {
    case 'push_create': return execPushCreate(mod, rid);
    case 'push_update': return execPushUpdate(mod, rid);
    case 'push_delete': return execPushDelete(mod, rid);
    case 'pull_create': return execPullCreate(mod);
    case 'pull_update': return execPullUpdate(mod);
    case 'bidirectional': return execBidirectional(mod, rid);
    default: throw new Error(`Unknown test type: ${testType}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

type TestStatus = 'idle' | 'running' | 'pass' | 'fail';

interface TestState {
  status: TestStatus;
  swiftMs: number;
  swiftDocs: number;
  cMs: number;
  cDocs: number;
  error?: string;
}

const INITIAL_STATES = Object.fromEntries(
  TEST_TYPES.map((t) => [t, { status: 'idle' as TestStatus, swiftMs: 0, swiftDocs: 0, cMs: 0, cDocs: 0 }]),
) as Record<TestType, TestState>;

export default function LocalReplicatorTest() {
  const [testStates, setTestStates] = useState<Record<TestType, TestState>>(INITIAL_STATES);
  const [runningTest, setRunningTest] = useState<TestType | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [statusText, setStatusText] = useState('Ready');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (logLines.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [logLines]);

  const addLog = useCallback((msg: string) => {
    setLogLines((prev) => [...prev, msg]);
  }, []);

  const handleRunTest = useCallback(async (testType: TestType) => {
    if (runningTest !== null) return;
    if (!NativeCblSwiftModule || !NativeCblCModule) {
      Alert.alert('Error', 'Native modules not available. Ensure turbo-v2 is compiled.');
      return;
    }

    const label = TEST_LABELS[testType];
    setRunningTest(testType);
    setTestStates((prev) => ({ ...prev, [testType]: { ...prev[testType], status: 'running' } }));
    setStatusText(`Running: ${label}`);

    try { await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: true }); } catch { /* ignore */ }

    addLog(`\n--- ${label} ---`);
    addLog(`Endpoint: ${ENDPOINT}`);
    addLog(`Scope: ${SCOPE} | Collection: ${COLLECTION}`);
    addLog(`Docs: ${DOC_COUNT} × ${DOC_SIZE}B\n`);

    const helperMod = NativeCblSwiftModule!;
    const swiftMod = NativeCblSwiftModule!;
    const cMod = NativeCblCModule!;
    const log = addLog;

    let swiftResult = { timeMs: 0, opsCount: 0 };
    let cResult = { timeMs: 0, opsCount: 0 };
    let swiftError = '';
    let cError = '';

    try {
      const swiftRid = makeRunId();
      const cRid = makeRunId();

      // ── Server setup for Swift run ────────────────────────────────────────
      await cleanupServerCollection(helperMod, log);

      if (testType === 'pull_create') {
        await stageServerDocs(helperMod, DOC_COUNT, `doc_${swiftRid}`, log);
      } else if (testType === 'pull_update') {
        await stageServerDocsAndUpdates(helperMod, swiftRid, log);
      } else if (testType === 'bidirectional') {
        await stageServerDocs(helperMod, Math.floor(DOC_COUNT / 2), `srv_${swiftRid}`, log);
      }
      // pull_delete: staging happens inside execPullDelete (needs shared revision tree)

      // ── Run Swift ─────────────────────────────────────────────────────────
      addLog('  [swift] Starting...');
      try {
        if (testType === 'pull_delete') {
          // Stage live docs first, then execPullDelete handles the rest
          await stageServerDocs(helperMod, DOC_COUNT, `doc_${swiftRid}`, log);
          swiftResult = await execPullDelete(swiftMod, helperMod, swiftRid, log);
        } else {
          swiftResult = await execForSdk(swiftMod, testType, swiftRid);
        }
      } catch (e: any) { swiftError = e.message; }
      addLog(`  Swift: ${swiftError ? `ERROR: ${swiftError}` : `${swiftResult.timeMs.toFixed(0)}ms, ${swiftResult.opsCount} docs`}`);

      // ── Reset server for C run ────────────────────────────────────────────
      await cleanupServerCollection(helperMod, log);

      if (testType === 'pull_create') {
        await stageServerDocs(helperMod, DOC_COUNT, `doc_${cRid}`, log);
      } else if (testType === 'pull_update') {
        await stageServerDocsAndUpdates(helperMod, cRid, log);
      } else if (testType === 'bidirectional') {
        await stageServerDocs(helperMod, Math.floor(DOC_COUNT / 2), `srv_${cRid}`, log);
      }

      // ── Run C ─────────────────────────────────────────────────────────────
      addLog('  [c] Starting...');
      try {
        if (testType === 'pull_delete') {
          await stageServerDocs(helperMod, DOC_COUNT, `doc_${cRid}`, log);
          cResult = await execPullDelete(cMod, helperMod, cRid, log);
        } else {
          cResult = await execForSdk(cMod, testType, cRid);
        }
      } catch (e: any) { cError = e.message; }
      addLog(`  C:     ${cError ? `ERROR: ${cError}` : `${cResult.timeMs.toFixed(0)}ms, ${cResult.opsCount} docs`}`);

      // ── Final cleanup ─────────────────────────────────────────────────────
      await cleanupServerCollection(helperMod, log);

      // ── Validate ──────────────────────────────────────────────────────────
      const halfCount = Math.floor(DOC_COUNT / 2);
      let swiftOk = !swiftError && swiftResult.opsCount > 0;
      let cOk = !cError && cResult.opsCount > 0;
      if (testType === 'bidirectional') {
        swiftOk = !swiftError && swiftResult.opsCount > halfCount;
        cOk = !cError && cResult.opsCount > halfCount;
      }

      if (!swiftOk) {
        addLog(testType === 'bidirectional'
          ? `  ** Swift FAIL: expected ${DOC_COUNT} docs (${halfCount} local + ${halfCount} pulled), got ${swiftResult.opsCount}`
          : `  ** Swift FAIL: expected >0 docs synced, got ${swiftResult.opsCount}`);
      }
      if (!cOk) {
        addLog(testType === 'bidirectional'
          ? `  ** C FAIL: expected ${DOC_COUNT} docs (${halfCount} local + ${halfCount} pulled), got ${cResult.opsCount}`
          : `  ** C FAIL: expected >0 docs synced, got ${cResult.opsCount}`);
      }

      const passed = swiftOk && cOk;
      addLog(`  Result: ${passed ? 'PASS' : 'FAIL'}\n`);
      setStatusText(`${label}: ${passed ? 'PASS ✓' : 'FAIL ✗'}`);

      setTestStates((prev) => ({
        ...prev,
        [testType]: {
          status: passed ? 'pass' : 'fail',
          swiftMs: swiftResult.timeMs,
          swiftDocs: swiftResult.opsCount,
          cMs: cResult.timeMs,
          cDocs: cResult.opsCount,
          error: swiftError || cError || undefined,
        },
      }));
    } catch (error: any) {
      addLog(`\nCRASH: ${error.message}`);
      addLog(`Stack: ${error.stack || 'No stack'}`);
      setStatusText(`Error: ${error.message}`);
      setTestStates((prev) => ({
        ...prev,
        [testType]: { ...prev[testType], status: 'fail', error: error.message },
      }));
      Alert.alert('Test Error', `${error.message}\n\nCheck log for details.`);
    } finally {
      setRunningTest(null);
      try { await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: false }); } catch { /* ignore */ }
    }
  }, [runningTest, addLog]);

  const handleCopyLog = useCallback(async () => {
    const text = logLines.join('\n');
    if (text.length === 0) { Alert.alert('Nothing to copy', 'Run a test first.'); return; }
    await copyToClipboard(text);
    Alert.alert('Copied', 'Log copied to clipboard.');
  }, [logLines]);

  const handleClear = useCallback(() => {
    setLogLines([]);
    setStatusText('Ready');
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  const passCount = TEST_TYPES.filter((t) => testStates[t].status === 'pass').length;
  const failCount = TEST_TYPES.filter((t) => testStates[t].status === 'fail').length;
  const ranCount = passCount + failCount;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Local Replicator Test</Text>
        <Text style={styles.subtitle}>localhost Docker Sync Gateway | 100 docs × 100B | Swift + C SDK</Text>
        <Text style={styles.endpoint}>{ENDPOINT}</Text>
      </View>

      {/* Summary row */}
      {ranCount > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {`${ranCount}/7 run  `}
            <Text style={styles.summaryPass}>{passCount} PASS</Text>
            {'  '}
            <Text style={styles.summaryFail}>{failCount} FAIL</Text>
          </Text>
        </View>
      )}

      {/* Test Cards */}
      <ScrollView style={styles.testList} contentContainerStyle={styles.testListContent}>
        {TEST_TYPES.map((testType) => {
          const state = testStates[testType];
          const label = TEST_LABELS[testType];
          const isThis = runningTest === testType;
          const isOther = runningTest !== null && runningTest !== testType;

          return (
            <View key={testType} style={[
              styles.testCard,
              state.status === 'pass' && styles.testCardPass,
              state.status === 'fail' && styles.testCardFail,
              isThis && styles.testCardRunning,
            ]}>
              <View style={styles.testCardHeader}>
                <Text style={styles.testCardLabel}>{label}</Text>
                <View style={[
                  styles.statusBadge,
                  state.status === 'running' && styles.badgeRunning,
                  state.status === 'pass' && styles.badgePass,
                  state.status === 'fail' && styles.badgeFail,
                ]}>
                  <Text style={styles.badgeText}>
                    {state.status === 'idle' ? '--'
                      : state.status === 'running' ? 'Running...'
                      : state.status === 'pass' ? 'PASS'
                      : 'FAIL'}
                  </Text>
                </View>
              </View>

              {(state.status === 'pass' || state.status === 'fail') && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultText}>
                    {`Swift  ${state.swiftMs.toFixed(0).padStart(6)}ms  ${String(state.swiftDocs).padStart(4)} docs`}
                  </Text>
                  <Text style={styles.resultText}>
                    {`C      ${state.cMs.toFixed(0).padStart(6)}ms  ${String(state.cDocs).padStart(4)} docs`}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.runButton,
                  isThis && styles.runButtonActive,
                  isOther && styles.runButtonDisabled,
                ]}
                onPress={() => handleRunTest(testType)}
                disabled={isThis || isOther}
              >
                <Text style={styles.runButtonText}>
                  {isThis ? 'Running...' : 'Run Both'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Status:</Text>
        <Text style={styles.statusValue} numberOfLines={2}>{statusText}</Text>
      </View>

      {/* Log */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.logContainer}
        contentContainerStyle={styles.logContent}
      >
        {logLines.length === 0 ? (
          <Text style={styles.logPlaceholder}>
            {'Tap "Run Both" on any test to start.\n\n' +
             'Each test:\n' +
             '  1. Cleans the server\n' +
             '  2. Stages required server state\n' +
             '  3. Runs Swift SDK (timed)\n' +
             '  4. Resets server\n' +
             '  5. Runs C SDK (timed)\n' +
             '  6. Shows PASS / FAIL'}
          </Text>
        ) : (
          <Text style={styles.logText}>{logLines.join('\n')}</Text>
        )}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, logLines.length === 0 && styles.actionButtonDisabled]}
          onPress={handleCopyLog}
          disabled={logLines.length === 0}
        >
          <Text style={styles.actionButtonText}>Copy Log</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonClear]}
          onPress={handleClear}
        >
          <Text style={styles.actionButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },

  header: {
    backgroundColor: '#1B5E20', padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#A5D6A7', marginBottom: 4 },
  endpoint: {
    fontSize: 11, color: '#C8E6C9',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  summaryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E8F5E9', paddingVertical: 6, paddingHorizontal: 12,
    marginHorizontal: 12, marginTop: 8, borderRadius: 6,
  },
  summaryText: { fontSize: 13, color: '#37474F', fontWeight: '600' },
  summaryPass: { color: '#2E7D32', fontWeight: '700' },
  summaryFail: { color: '#C62828', fontWeight: '700' },

  testList: { flex: 1 },
  testListContent: { padding: 12, gap: 8 },

  testCard: {
    backgroundColor: '#FFFFFF', borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: '#D0D0D0',
  },
  testCardRunning: { borderColor: '#2196F3', borderWidth: 1.5 },
  testCardPass: { borderColor: '#4CAF50', borderWidth: 1.5 },
  testCardFail: { borderColor: '#F44336', borderWidth: 1.5 },

  testCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  testCardLabel: { fontSize: 15, fontWeight: '700', color: '#212121' },

  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
    backgroundColor: '#E0E0E0',
  },
  badgeRunning: { backgroundColor: '#2196F3' },
  badgePass: { backgroundColor: '#4CAF50' },
  badgeFail: { backgroundColor: '#F44336' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  resultRow: { marginBottom: 8, gap: 2 },
  resultText: {
    fontSize: 12, color: '#37474F',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  runButton: {
    backgroundColor: '#1B5E20', borderRadius: 6,
    paddingVertical: 8, alignItems: 'center',
  },
  runButtonActive: { backgroundColor: '#2196F3' },
  runButtonDisabled: { backgroundColor: '#9E9E9E' },
  runButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  statusContainer: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginTop: 8,
    paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#E8F5E9', borderRadius: 6,
  },
  statusLabel: { fontSize: 12, fontWeight: '700', color: '#1B5E20', marginRight: 8 },
  statusValue: { flex: 1, fontSize: 11, color: '#37474F', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  logContainer: {
    flex: 1, backgroundColor: '#FFFFFF', marginHorizontal: 12, marginTop: 8,
    borderRadius: 8, borderWidth: 1, borderColor: '#D0D0D0',
  },
  logContent: { padding: 12 },
  logText: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#263238', lineHeight: 16 },
  logPlaceholder: { fontSize: 13, color: '#90A4AE', lineHeight: 20, textAlign: 'center', paddingVertical: 30 },

  actionRow: {
    flexDirection: 'row', marginHorizontal: 12, marginTop: 8,
    marginBottom: Platform.OS === 'ios' ? 30 : 12, gap: 8,
  },
  actionButton: { flex: 1, paddingVertical: 10, borderRadius: 6, backgroundColor: '#1B5E20', alignItems: 'center', justifyContent: 'center' },
  actionButtonClear: { backgroundColor: '#78909C' },
  actionButtonDisabled: { backgroundColor: '#BDBDBD' },
  actionButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
