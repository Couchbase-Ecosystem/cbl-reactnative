import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  AppState,
  TextInput,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import NativeCblSwiftModule from '../../../src/specs/NativeCblSwift';
import NativeCblCModule from '../../../src/specs/NativeCblC';
import { generateNestedDoc } from '../../lib/benchmark/generators';
import type {
  SuiteId,
  SuiteResult,
  TestResult,
  TestPermutation,
  IterationResult,
  SingleRunResult,
  OperationTiming,
  OperationType,
  BenchmarkProgress,
  EngineCallbacks,
  DocSize,
  DocCount,
} from '../../lib/benchmark/types';
import {
  COOLDOWN_MIN_MS,
  MAX_BATCH_CHUNK_DOCS,
} from '../../lib/benchmark/types';
import {
  formatRawLog,
  copyToClipboard,
  saveReplicatorSuiteResult,
  loadReplicatorSuiteResults,
  deleteAllReplicatorResults,
} from '../../lib/benchmark/export';

// ─────────────────────────────────────────────────────────────────────────────
// Connection Defaults — localhost Docker Sync Gateway
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_ENDPOINT = Platform.OS === 'android'
  ? 'ws://10.0.2.2:4984/repl-bench'
  : 'ws://localhost:4984/repl-bench';
const DEFAULT_USERNAME = 'jayantdhingra';
const DEFAULT_PASSWORD = 'f9yu5QT4B5jpZep@';
const DEFAULT_SCOPE = 'replicator';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME = 'repl-bench';
const DB_NAME_STAGE = 'repl-bench-stage';
const POLL_INTERVAL_MS = 500;
const TIMED_ITERATIONS = 2;
const SERVER_PROPAGATION_DELAY_MS = 1_000;

const ACTIVITY = { STOPPED: 0, OFFLINE: 1, CONNECTING: 2, IDLE: 3, BUSY: 4 } as const;
const ACTIVITY_LABELS: Record<number, string> = {
  0: 'Stopped', 1: 'Offline', 2: 'Connecting', 3: 'Idle', 4: 'Busy',
};

const REPL_TEST_TYPES: OperationType[] = [
  'push_create',
  'pull_create',
  'bidirectional',
];

const TEST_TYPE_LABELS: Record<string, string> = {
  push_create: 'Push-Create',
  push_update: 'Push-Update',
  push_delete: 'Push-Delete',
  pull_create: 'Pull-Create',
  pull_update: 'Pull-Update',
  pull_delete: 'Pull-Delete',
  bidirectional: 'Bidirectional',
};

// ─────────────────────────────────────────────────────────────────────────────
// Live Activity Types & Helpers
// ─────────────────────────────────────────────────────────────────────────────

type LivePhase = 'idle' | 'cleanup' | 'stage' | 'verify' | 'run' | 'cooldown';

const PHASE_LABELS: Record<LivePhase, string> = {
  idle: 'IDLE',
  cleanup: 'CLEANUP',
  stage: 'STAGING',
  verify: 'VERIFYING',
  run: 'REPLICATING',
  cooldown: 'COOLDOWN',
};

const PHASE_PANEL_STYLES: Record<LivePhase, object> = {
  idle:     { backgroundColor: '#E8F5E9', borderColor: '#81C784' },
  cleanup:  { backgroundColor: '#FFF8E1', borderColor: '#FFB300' },
  stage:    { backgroundColor: '#E3F2FD', borderColor: '#42A5F5' },
  verify:   { backgroundColor: '#F3E5F5', borderColor: '#AB47BC' },
  run:      { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
  cooldown: { backgroundColor: '#ECEFF1', borderColor: '#78909C' },
};

const PHASE_DOT_STYLES: Record<LivePhase, object> = {
  idle:     { backgroundColor: '#81C784' },
  cleanup:  { backgroundColor: '#FFB300' },
  stage:    { backgroundColor: '#42A5F5' },
  verify:   { backgroundColor: '#AB47BC' },
  run:      { backgroundColor: '#2E7D32' },
  cooldown: { backgroundColor: '#78909C' },
};

const PHASE_TEXT_STYLES: Record<LivePhase, object> = {
  idle:     { color: '#2E7D32' },
  cleanup:  { color: '#E65100' },
  stage:    { color: '#1565C0' },
  verify:   { color: '#6A1B9A' },
  run:      { color: '#1B5E20' },
  cooldown: { color: '#546E7A' },
};

function detectPhase(line: string): LivePhase {
  if (line.includes('[cleanup]')) return 'cleanup';
  if (line.includes('[stage]')) return 'stage';
  if (line.includes('[verify]')) return 'verify';
  if (line.includes('[cooldown]')) return 'cooldown';
  if (line.includes('[run]') || line.includes('[pull_delete]')) return 'run';
  if (line.includes('[swift →') || line.includes('[c →')) return 'run';
  return 'idle';
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite Definitions
// ─────────────────────────────────────────────────────────────────────────────

interface ReplSuiteDefinition {
  suiteId: SuiteId;
  sizeBytes: DocSize;
  label: string;
  swiftCollection: string;
  cCollection: string;
  feasibleCounts: DocCount[];
  estimatedMinutes: number;
}

const REPL_SUITE_DEFINITIONS: ReplSuiteDefinition[] = [
  { suiteId: 'repl_100b' as SuiteId, sizeBytes: 100 as DocSize, label: '100B', swiftCollection: 'bench_100b_swift', cCollection: 'bench_100b_c', feasibleCounts: [100, 1_000, 10_000, 100_000] as DocCount[], estimatedMinutes: 30 },
  { suiteId: 'repl_1kb' as SuiteId, sizeBytes: 1_000 as DocSize, label: '1KB', swiftCollection: 'bench_1kb_swift', cCollection: 'bench_1kb_c', feasibleCounts: [100, 1_000, 10_000, 100_000] as DocCount[], estimatedMinutes: 45 },
  { suiteId: 'repl_10kb' as SuiteId, sizeBytes: 10_000 as DocSize, label: '10KB', swiftCollection: 'bench_10kb_swift', cCollection: 'bench_10kb_c', feasibleCounts: [100, 1_000, 10_000, 100_000] as DocCount[], estimatedMinutes: 90 },
  { suiteId: 'repl_100kb' as SuiteId, sizeBytes: 100_000 as DocSize, label: '100KB', swiftCollection: 'bench_100kb_swift', cCollection: 'bench_100kb_c', feasibleCounts: [100, 1_000, 10_000] as DocCount[], estimatedMinutes: 90 },
  { suiteId: 'repl_1mb' as SuiteId, sizeBytes: 1_000_000 as DocSize, label: '1MB', swiftCollection: 'bench_1mb_swift', cCollection: 'bench_1mb_c', feasibleCounts: [100, 1_000] as DocCount[], estimatedMinutes: 120 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SuiteStatus = 'not_started' | 'running' | 'complete' | 'partial';

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const makeRunId = () => Math.random().toString(36).substring(2, 6);

const getDocumentsDirectory = (): string => {
  let dir = FileSystem.documentDirectory || '';
  if (dir.startsWith('file://')) dir = dir.substring(7);
  return dir;
};

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}

function formatCount(n: number): string {
  return n.toLocaleString();
}

function sizeSuffix(n: number): string {
  if (n < 1_000) return `${n}b`;
  if (n < 1_000_000) return `${n / 1_000}kb`;
  return `${n / 1_000_000}mb`;
}

async function cooldown(): Promise<void> {
  await new Promise((r) => setTimeout(r, COOLDOWN_MIN_MS));
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function openDatabase(mod: any, scope: string, collectionName: string, dbNameOverride?: string): Promise<string> {
  const dir = getDocumentsDirectory();
  const name = dbNameOverride || DB_NAME;
  // Pre-cleanup: ensure no stale database exists (prevents checkpoint contamination)
  try { await mod.database_DeleteWithPath({ databaseName: name, directory: dir }); } catch { /* OK if doesn't exist */ }
  const { databaseUniqueName } = await mod.database_Open({
    name, directory: dir, encryptionKey: null,
  });
  await mod.collection_CreateCollection({
    name: databaseUniqueName, scopeName: scope, collectionName,
  });
  return databaseUniqueName;
}

async function closeAndDeleteDatabase(mod: any, databaseUniqueName: string, dbNameOverride?: string): Promise<void> {
  const dir = getDocumentsDirectory();
  try { await mod.database_Close({ name: databaseUniqueName }); } catch (e: any) {
    console.warn(`[closeAndDeleteDatabase] Close failed for ${databaseUniqueName}: ${e?.message}`);
  }
  try { await mod.database_DeleteWithPath({ databaseName: dbNameOverride || DB_NAME, directory: dir }); } catch (e: any) {
    console.warn(`[closeAndDeleteDatabase] Delete failed for ${dbNameOverride || DB_NAME}: ${e?.message}`);
  }
}

async function batchSaveChunked(
  mod: any, dbName: string, docs: { id: string; data: string }[], scope: string, collection: string,
): Promise<{ saved: number; failed: number }> {
  let totalSaved = 0;
  let totalFailed = 0;
  for (let offset = 0; offset < docs.length; offset += MAX_BATCH_CHUNK_DOCS) {
    const chunk = docs.slice(offset, offset + MAX_BATCH_CHUNK_DOCS);
    const result = await mod.collection_BatchSave({
      name: dbName, scopeName: scope, collectionName: collection,
      docsJson: JSON.stringify(chunk),
    });
    totalSaved += result.saved;
    totalFailed += result.failed;
  }
  return { saved: totalSaved, failed: totalFailed };
}

async function batchDeleteChunked(
  mod: any, dbName: string, docIds: string[], scope: string, collection: string,
): Promise<{ deleted: number; failed: number }> {
  let totalDeleted = 0;
  let totalFailed = 0;
  for (let offset = 0; offset < docIds.length; offset += MAX_BATCH_CHUNK_DOCS) {
    const chunk = docIds.slice(offset, offset + MAX_BATCH_CHUNK_DOCS);
    const result = await mod.collection_BatchDelete({
      name: dbName, scopeName: scope, collectionName: collection,
      docIdsJson: JSON.stringify(chunk),
    });
    totalDeleted += result.deleted;
    totalFailed += result.failed;
  }
  return { deleted: totalDeleted, failed: totalFailed };
}

function generateDocs(count: number, sizeBytes: number, prefix: string = 'doc'): { id: string; data: string }[] {
  const docs: { id: string; data: string }[] = [];
  for (let i = 0; i < count; i++) {
    const doc = generateNestedDoc(i, sizeBytes);
    docs.push({ id: `${prefix}_${i}`, data: JSON.stringify(doc) });
  }
  return docs;
}

function generateUpdatedDocs(count: number, sizeBytes: number, prefix: string = 'doc'): { id: string; data: string }[] {
  const docs: { id: string; data: string }[] = [];
  for (let i = 0; i < count; i++) {
    const doc = generateNestedDoc(i, sizeBytes);
    (doc as any).__updated = true;
    (doc as any).__updateTs = Date.now();
    (doc as any).__updateIter = Math.random();
    docs.push({ id: `${prefix}_${i}`, data: JSON.stringify(doc) });
  }
  return docs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Replicator Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildReplicatorConfig(
  databaseName: string, endpoint: string, username: string, password: string,
  scope: string, collectionName: string, replicatorType: 'push' | 'pull' | 'pushAndPull',
  continuous: boolean = false,
): string {
  return JSON.stringify({
    databaseName, endpoint, username, password, replicatorType,
    continuous,
    collections: [{ scope, name: collectionName }],
  });
}

async function waitForReplicatorDone(
  mod: any, replicatorId: string, timeoutMs: number = 300_000,
): Promise<{ activity: number; progress: { completed: number; total: number }; error: string | null; elapsedMs: number }> {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    const status = await mod.replicator_GetStatus({ replicatorId });
    if (status.error && typeof status.error === 'string' && status.error.length > 0) {
      throw new Error(`Replicator error: ${status.error}`);
    }
    if (status.activity === ACTIVITY.STOPPED || status.activity === ACTIVITY.IDLE) {
      return { ...status, elapsedMs: performance.now() - start };
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Replicator timed out after ${timeoutMs / 1000}s`);
}

async function runReplicator(
  mod: any, dbName: string, endpoint: string, username: string, password: string,
  scope: string, collectionName: string, type: 'push' | 'pull' | 'pushAndPull',
): Promise<{ elapsedMs: number; activity: number; progress: { completed: number; total: number } }> {
  const config = buildReplicatorConfig(dbName, endpoint, username, password, scope, collectionName, type);
  const { replicatorId } = await mod.replicator_Create({ config });
  await mod.replicator_Start({ replicatorId });
  const result = await waitForReplicatorDone(mod, replicatorId);
  await mod.replicator_Cleanup({ replicatorId });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Server Readiness Verification
// After staging a push, this function polls until the expected docs are visible
// in the pull change feed. Useful even on local Docker if there's any indexing
// or propagation delay between Couchbase Server and Sync Gateway.
// ─────────────────────────────────────────────────────────────────────────────

const VERIFY_POLL_MS = 2_000;
const VERIFY_MAX_WAIT_MS = 30_000;

async function waitForServerReady(
  mod: any, endpoint: string, username: string, password: string,
  scope: string, collectionName: string,
  expectedCount: number, log: (msg: string) => void,
): Promise<boolean> {
  const verifyDbName = 'repl-bench-verify';
  const dbName = await openDatabase(mod, scope, collectionName, verifyDbName);
  try {
    const config = buildReplicatorConfig(
      dbName, endpoint, username, password, scope, collectionName, 'pull', true,
    );
    const { replicatorId } = await mod.replicator_Create({ config });
    await mod.replicator_Start({ replicatorId });

    const start = performance.now();
    let lastCount = 0;
    let lastLogAt = 0;

    while (performance.now() - start < VERIFY_MAX_WAIT_MS) {
      await new Promise((r) => setTimeout(r, VERIFY_POLL_MS));
      const { count } = await mod.collection_GetCount({
        name: dbName, scopeName: scope, collectionName,
      });
      if (count >= expectedCount) {
        const elapsed = ((performance.now() - start) / 1000).toFixed(0);
        log(`  [verify] ${count} docs ready for pull (waited ${elapsed}s)`);
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
// Server State Management (automated cleanup / staging)
// Uses Swift SDK as "helper" -- not part of timed benchmark
// ─────────────────────────────────────────────────────────────────────────────

async function cleanupServerCollection(
  helperMod: any, endpoint: string, username: string, password: string,
  scope: string, collectionName: string, log: (msg: string) => void,
): Promise<void> {
  log(`  [cleanup] Purging server collection ${collectionName}...`);
  const MAX_CLEANUP_PASSES = 10;
  let totalDeleted = 0;

  for (let pass = 0; pass < MAX_CLEANUP_PASSES; pass++) {
    const cleanupDbName = 'repl-bench-cleanup';
    const dbName = await openDatabase(helperMod, scope, collectionName, cleanupDbName);
    try {
      await runReplicator(helperMod, dbName, endpoint, username, password, scope, collectionName, 'pull');
      const { count } = await helperMod.collection_GetCount({
        name: dbName, scopeName: scope, collectionName,
      });
      if (count === 0) {
        if (totalDeleted > 0) {
          log(`  [cleanup] Deleted ${totalDeleted} docs from server (${pass + 1} pass${pass > 0 ? 'es' : ''})`);
        } else {
          log(`  [cleanup] Server collection already empty`);
        }
        return;
      }
      const queryResult = await helperMod.query_Execute({
        name: dbName,
        query: `SELECT META().id AS id FROM ${scope}.${collectionName}`,
        parameters: null,
      });
      const rows = JSON.parse(queryResult);
      if (rows.length > 0) {
        const actualIds = rows.map((r: any) => r.id);
        await batchDeleteChunked(helperMod, dbName, actualIds, scope, collectionName);
        await runReplicator(helperMod, dbName, endpoint, username, password, scope, collectionName, 'push');
        totalDeleted += actualIds.length;
      } else {
        if (totalDeleted > 0) {
          log(`  [cleanup] Deleted ${totalDeleted} docs from server`);
        } else {
          log(`  [cleanup] Server collection already empty`);
        }
        return;
      }
    } finally {
      await closeAndDeleteDatabase(helperMod, dbName, cleanupDbName);
    }
  }
  log(`  [cleanup] Deleted ${totalDeleted} docs from server (hit max ${MAX_CLEANUP_PASSES} passes)`);
}

async function stageServerDocs(
  helperMod: any, endpoint: string, username: string, password: string,
  scope: string, collectionName: string, count: number, sizeBytes: number,
  prefix: string, log: (msg: string) => void,
): Promise<void> {
  log(`  [stage] Pushing ${formatCount(count)} docs (${prefix}_*) to server...`);
  const dbName = await openDatabase(helperMod, scope, collectionName, DB_NAME_STAGE);
  try {
    const docs = generateDocs(count, sizeBytes, prefix);
    const saveResult = await batchSaveChunked(helperMod, dbName, docs, scope, collectionName);
    log(`  [stage] Saved ${saveResult.saved} docs locally (${saveResult.failed} failed)`);
    const replResult = await runReplicator(helperMod, dbName, endpoint, username, password, scope, collectionName, 'push');
    log(`  [stage] Push complete: activity=${ACTIVITY_LABELS[replResult.activity] ?? replResult.activity}, progress=${replResult.progress.completed}/${replResult.progress.total}, elapsed=${replResult.elapsedMs.toFixed(0)}ms`);
  } finally {
    await closeAndDeleteDatabase(helperMod, dbName, DB_NAME_STAGE);
  }
  await waitForServerReady(helperMod, endpoint, username, password, scope, collectionName, count, log);
}

async function stageServerDocsAndUpdates(
  helperMod: any, endpoint: string, username: string, password: string,
  scope: string, collectionName: string, count: number, sizeBytes: number,
  rid: string, log: (msg: string) => void,
): Promise<void> {
  const prefix = `doc_${rid}`;
  log(`  [stage] Pushing ${formatCount(count)} docs + updates (${prefix}_*) to server...`);
  const dbName = await openDatabase(helperMod, scope, collectionName, DB_NAME_STAGE);
  try {
    const docs = generateDocs(count, sizeBytes, prefix);
    const saveResult = await batchSaveChunked(helperMod, dbName, docs, scope, collectionName);
    log(`  [stage] Saved ${saveResult.saved} originals locally`);
    await runReplicator(helperMod, dbName, endpoint, username, password, scope, collectionName, 'push');
    const updatedDocs = generateUpdatedDocs(count, sizeBytes, prefix);
    await batchSaveChunked(helperMod, dbName, updatedDocs, scope, collectionName);
    await runReplicator(helperMod, dbName, endpoint, username, password, scope, collectionName, 'push');
    log(`  [stage] Updated docs pushed to server`);
  } finally {
    await closeAndDeleteDatabase(helperMod, dbName, DB_NAME_STAGE);
  }
  await waitForServerReady(helperMod, endpoint, username, password, scope, collectionName, count, log);
}


// ─────────────────────────────────────────────────────────────────────────────
// Per-Test-Type Executors
// Each returns the timed replication duration in ms.
// Setup/teardown of local DB is NOT part of the timed portion.
// ─────────────────────────────────────────────────────────────────────────────

async function execPushCreate(
  mod: any, endpoint: string, username: string, password: string,
  scope: string, collectionName: string, count: number, sizeBytes: number,
  rid: string,
): Promise<{ timeMs: number; opsCount: number }> {
  const dbName = await openDatabase(mod, scope, collectionName);
  try {
    const docs = generateDocs(count, sizeBytes, `doc_${rid}`);
    await batchSaveChunked(mod, dbName, docs, scope, collectionName);
    const result = await runReplicator(mod, dbName, endpoint, username, password, scope, collectionName, 'push');
    return { timeMs: result.elapsedMs, opsCount: count };
  } finally {
    await closeAndDeleteDatabase(mod, dbName);
  }
}

async function execPushUpdate(
  mod: any, endpoint: string, username: string, password: string,
  scope: string, collectionName: string, count: number, sizeBytes: number,
  rid: string,
): Promise<{ timeMs: number; opsCount: number }> {
  const dbName = await openDatabase(mod, scope, collectionName);
  try {
    const prefix = `doc_${rid}`;
    const docs = generateDocs(count, sizeBytes, prefix);
    await batchSaveChunked(mod, dbName, docs, scope, collectionName);
    await runReplicator(mod, dbName, endpoint, username, password, scope, collectionName, 'push');
    const updatedDocs = generateUpdatedDocs(count, sizeBytes, prefix);
    await batchSaveChunked(mod, dbName, updatedDocs, scope, collectionName);
    const result = await runReplicator(mod, dbName, endpoint, username, password, scope, collectionName, 'push');
    return { timeMs: result.elapsedMs, opsCount: count };
  } finally {
    await closeAndDeleteDatabase(mod, dbName);
  }
}

async function execPushDelete(
  mod: any, endpoint: string, username: string, password: string,
  scope: string, collectionName: string, count: number, sizeBytes: number,
  rid: string,
): Promise<{ timeMs: number; opsCount: number }> {
  const dbName = await openDatabase(mod, scope, collectionName);
  try {
    const prefix = `doc_${rid}`;
    const docs = generateDocs(count, sizeBytes, prefix);
    await batchSaveChunked(mod, dbName, docs, scope, collectionName);
    await runReplicator(mod, dbName, endpoint, username, password, scope, collectionName, 'push');
    const ids = docs.map((d) => d.id);
    await batchDeleteChunked(mod, dbName, ids, scope, collectionName);
    const result = await runReplicator(mod, dbName, endpoint, username, password, scope, collectionName, 'push');
    return { timeMs: result.elapsedMs, opsCount: ids.length };
  } finally {
    await closeAndDeleteDatabase(mod, dbName);
  }
}

async function execPullCreate(
  mod: any, endpoint: string, username: string, password: string,
  scope: string, collectionName: string,
  expectedCount?: number,
): Promise<{ timeMs: number; opsCount: number }> {
  const dbName = await openDatabase(mod, scope, collectionName);
  try {
    const result = await runReplicator(mod, dbName, endpoint, username, password, scope, collectionName, 'pull');
    const { count } = await mod.collection_GetCount({
      name: dbName, scopeName: scope, collectionName,
    });
    if (expectedCount && count === 0) {
      console.warn(`[VALIDATION] pull_create expected ${expectedCount} docs but pulled 0. ` +
        `Replicator: activity=${ACTIVITY_LABELS[result.activity]}, progress=${result.progress.completed}/${result.progress.total}.`);
    }
    return { timeMs: result.elapsedMs, opsCount: count };
  } finally {
    await closeAndDeleteDatabase(mod, dbName);
  }
}

async function execPullUpdate(
  mod: any, endpoint: string, username: string, password: string,
  scope: string, collectionName: string, count: number, sizeBytes: number,
): Promise<{ timeMs: number; opsCount: number }> {
  const dbName = await openDatabase(mod, scope, collectionName);
  try {
    const result = await runReplicator(mod, dbName, endpoint, username, password, scope, collectionName, 'pull');
    const { count: pulledCount } = await mod.collection_GetCount({
      name: dbName, scopeName: scope, collectionName,
    });
    return { timeMs: result.elapsedMs, opsCount: pulledCount };
  } finally {
    await closeAndDeleteDatabase(mod, dbName);
  }
}

async function execPullDelete(
  mod: any, helperMod: any, endpoint: string, username: string, password: string,
  scope: string, collectionName: string, rid: string,
  log: (msg: string) => void,
): Promise<{ timeMs: number; opsCount: number }> {
  const dbName = await openDatabase(mod, scope, collectionName);
  try {
    // Step 1: Pull live docs from server (establishes shared revision tree)
    await runReplicator(mod, dbName, endpoint, username, password, scope, collectionName, 'pull');
    const { count: countBefore } = await mod.collection_GetCount({
      name: dbName, scopeName: scope, collectionName,
    });
    log(`  [pull_delete] Pulled ${countBefore} live docs (shared history established)`);

    // Step 2: Stage tombstones on the server using helperMod
    log(`  [pull_delete] Staging tombstones on server...`);
    const stageDb = await openDatabase(helperMod, scope, collectionName, DB_NAME_STAGE);
    try {
      await runReplicator(helperMod, stageDb, endpoint, username, password, scope, collectionName, 'pull');
      const queryResult = await helperMod.query_Execute({
        name: stageDb,
        query: `SELECT META().id AS id FROM ${scope}.${collectionName}`,
        parameters: null,
      });
      const rows = JSON.parse(queryResult);
      if (rows.length > 0) {
        const ids = rows.map((r: any) => r.id);
        await batchDeleteChunked(helperMod, stageDb, ids, scope, collectionName);
        await runReplicator(helperMod, stageDb, endpoint, username, password, scope, collectionName, 'push');
        log(`  [pull_delete] ${ids.length} tombstones pushed to server`);
      }
    } finally {
      await closeAndDeleteDatabase(helperMod, stageDb, DB_NAME_STAGE);
    }
    await new Promise((r) => setTimeout(r, SERVER_PROPAGATION_DELAY_MS));

    // Step 3: Timed — pull tombstones into test DB (deletes the local docs)
    const result = await runReplicator(mod, dbName, endpoint, username, password, scope, collectionName, 'pull');
    const { count: countAfter } = await mod.collection_GetCount({
      name: dbName, scopeName: scope, collectionName,
    });
    const deleted = countBefore - countAfter;
    log(`  [pull_delete] Before=${countBefore}, After=${countAfter}, Deleted=${deleted}`);
    return { timeMs: result.elapsedMs, opsCount: deleted > 0 ? deleted : 0 };
  } finally {
    await closeAndDeleteDatabase(mod, dbName);
  }
}

async function execBidirectional(
  mod: any, endpoint: string, username: string, password: string,
  scope: string, collectionName: string, count: number, sizeBytes: number,
  rid: string,
): Promise<{ timeMs: number; opsCount: number }> {
  const dbName = await openDatabase(mod, scope, collectionName);
  try {
    const halfCount = Math.floor(count / 2);
    const localDocs = generateDocs(halfCount, sizeBytes, `loc_${rid}`);
    await batchSaveChunked(mod, dbName, localDocs, scope, collectionName);
    const result = await runReplicator(mod, dbName, endpoint, username, password, scope, collectionName, 'pushAndPull');
    const { count: finalCount } = await mod.collection_GetCount({
      name: dbName, scopeName: scope, collectionName,
    });
    return { timeMs: result.elapsedMs, opsCount: finalCount };
  } finally {
    await closeAndDeleteDatabase(mod, dbName);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine: Run a single test type (2 timed rounds: Swift first, then C first)
// ─────────────────────────────────────────────────────────────────────────────

async function runTestType(
  testType: OperationType,
  helperMod: any, swiftMod: any, cMod: any,
  endpoint: string, username: string, password: string,
  scope: string, swiftCollection: string, cCollection: string,
  count: number, sizeBytes: number,
  log: (msg: string) => void,
  signal?: AbortSignal,
  onlyIteration?: { iterNum: number; swiftFirst: boolean },
): Promise<{ iterations: IterationResult[] }> {

  const label = TEST_TYPE_LABELS[testType] ?? testType;

  // Each SDK gets its own server collection — cleanup + stage only for the collection being tested
  const setupServerForRun = async (rid: string, collection: string) => {
    await cleanupServerCollection(helperMod, endpoint, username, password, scope, collection, log);
    if (testType === 'pull_create') {
      await stageServerDocs(helperMod, endpoint, username, password, scope, collection, count, sizeBytes, `doc_${rid}`, log);
    } else if (testType === 'pull_update') {
      await stageServerDocsAndUpdates(helperMod, endpoint, username, password, scope, collection, count, sizeBytes, rid, log);
    } else if (testType === 'pull_delete') {
      await stageServerDocs(helperMod, endpoint, username, password, scope, collection, count, sizeBytes, `doc_${rid}`, log);
    } else if (testType === 'bidirectional') {
      const halfCount = Math.floor(count / 2);
      await stageServerDocs(helperMod, endpoint, username, password, scope, collection, halfCount, sizeBytes, `srv_${rid}`, log);
    }
  };

  const execForSdk = async (mod: any, sdk: 'swift' | 'c', rid: string, collection: string): Promise<SingleRunResult> => {
    try {
      let result: { timeMs: number; opsCount: number };
      switch (testType) {
        case 'push_create':
          result = await execPushCreate(mod, endpoint, username, password, scope, collection, count, sizeBytes, rid);
          break;
        case 'push_update':
          result = await execPushUpdate(mod, endpoint, username, password, scope, collection, count, sizeBytes, rid);
          break;
        case 'push_delete':
          result = await execPushDelete(mod, endpoint, username, password, scope, collection, count, sizeBytes, rid);
          break;
        case 'pull_create':
          result = await execPullCreate(mod, endpoint, username, password, scope, collection, count);
          break;
        case 'pull_update':
          result = await execPullUpdate(mod, endpoint, username, password, scope, collection, count, sizeBytes);
          break;
        case 'pull_delete':
          result = await execPullDelete(mod, helperMod, endpoint, username, password, scope, collection, rid, log);
          break;
        case 'bidirectional':
          result = await execBidirectional(mod, endpoint, username, password, scope, collection, count, sizeBytes, rid);
          break;
        default:
          throw new Error(`Unknown test type: ${testType}`);
      }
      const timing: OperationTiming = {
        operation: testType, timeMs: result.timeMs, opsCount: result.opsCount, success: true,
      };
      return { sdk, timings: [timing], totalTimeMs: result.timeMs, success: true };
    } catch (error: any) {
      const timing: OperationTiming = {
        operation: testType, timeMs: 0, opsCount: 0, success: false, error: error.message,
      };
      return { sdk, timings: [timing], totalTimeMs: 0, success: false, error: error.message };
    }
  };

  const runIteration = async (iterNum: number, swiftFirst: boolean): Promise<IterationResult> => {
    const firstMod = swiftFirst ? swiftMod : cMod;
    const secondMod = swiftFirst ? cMod : swiftMod;
    const firstSdk: 'swift' | 'c' = swiftFirst ? 'swift' : 'c';
    const secondSdk: 'swift' | 'c' = swiftFirst ? 'c' : 'swift';
    // Each SDK uses its own isolated collection — no shared state between them
    const firstCollection = swiftFirst ? swiftCollection : cCollection;
    const secondCollection = swiftFirst ? cCollection : swiftCollection;
    const firstRid = makeRunId();
    const secondRid = makeRunId();

    log(`    ${label} iter ${iterNum} [${swiftFirst ? 'Swift first' : 'C first'}]`);

    await setupServerForRun(firstRid, firstCollection);
    log(`  [run] ${firstSdk.toUpperCase()}: ${label} → replicating...`);
    const firstResult = await execForSdk(firstMod, firstSdk, firstRid, firstCollection);
    const firstOps = firstResult.timings[0]?.opsCount ?? 0;
    log(`      ${firstSdk} (${firstCollection}): ${firstResult.success ? `${firstResult.totalTimeMs.toFixed(0)}ms (${firstOps} docs synced)` : `ERROR: ${firstResult.error}`}`);
    log(`  [cooldown] Cooling down...`);
    await cooldown();

    await setupServerForRun(secondRid, secondCollection);
    log(`  [run] ${secondSdk.toUpperCase()}: ${label} → replicating...`);
    const secondResult = await execForSdk(secondMod, secondSdk, secondRid, secondCollection);
    const secondOps = secondResult.timings[0]?.opsCount ?? 0;
    log(`      ${secondSdk} (${secondCollection}): ${secondResult.success ? `${secondResult.totalTimeMs.toFixed(0)}ms (${secondOps} docs synced)` : `ERROR: ${secondResult.error}`}`);
    log(`  [cooldown] Cooling down...`);
    await cooldown();

    return {
      iteration: iterNum,
      swiftFirst,
      swiftResult: swiftFirst ? firstResult : secondResult,
      cResult: swiftFirst ? secondResult : firstResult,
    };
  };

  const iterations: IterationResult[] = [];
  if (onlyIteration) {
    const iter = await runIteration(onlyIteration.iterNum, onlyIteration.swiftFirst);
    iterations.push(iter);
  } else {
    // 2 timed rounds — round 1: Swift first, round 2: C first
    for (let i = 1; i <= TIMED_ITERATIONS; i++) {
      if (signal?.aborted) break;
      const swiftFirst = i === 1;
      const iter = await runIteration(i, swiftFirst);
      iterations.push(iter);
    }
  }

  return { iterations };
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine: Run a complete suite
// ─────────────────────────────────────────────────────────────────────────────

async function runReplSuite(
  suiteDef: ReplSuiteDefinition,
  endpoint: string, username: string, password: string, scope: string,
  callbacks: EngineCallbacks,
  signal?: AbortSignal,
): Promise<SuiteResult> {
  const helperMod = NativeCblSwiftModule;
  const swiftMod = NativeCblSwiftModule;
  const cMod = NativeCblCModule;

  const suiteStart = performance.now();
  const results: TestResult[] = [];
  const totalPermutations = suiteDef.feasibleCounts.length * REPL_TEST_TYPES.length;
  let permIdx = 0;

  const logBuffer: string[] = [];
  const log = (msg: string) => { logBuffer.push(msg); };
  const flushLog = () => {
    if (logBuffer.length > 0) {
      callbacks.onLog([...logBuffer]);
      logBuffer.length = 0;
    }
  };

  callbacks.onLog([`\n=== Suite: ${suiteDef.label} (${suiteDef.swiftCollection} / ${suiteDef.cCollection}) ===`]);

  for (const docCount of suiteDef.feasibleCounts) {
    for (const testType of REPL_TEST_TYPES) {
      if (signal?.aborted) break;
      permIdx++;

      const permutation: TestPermutation = {
        suiteId: suiteDef.suiteId,
        size: suiteDef.sizeBytes,
        count: docCount,
        lifecycle: 'replication',
      };

      callbacks.onProgress({
        suiteId: suiteDef.suiteId,
        currentTest: permIdx,
        totalTests: totalPermutations,
        currentPermutation: permutation,
        currentIteration: 0,
        totalIterations: TIMED_ITERATIONS,
        currentOperation: testType,
        phase: 'running',
        elapsedMs: performance.now() - suiteStart,
      });

      const dataSize = docCount * suiteDef.sizeBytes;
      log(`\n--- ${TEST_TYPE_LABELS[testType]} | ${suiteDef.label} x ${formatCount(docCount)} (${formatBytes(dataSize)}) ---`);
      flushLog();

      try {
        const { iterations } = await runTestType(
          testType, helperMod!, swiftMod!, cMod!,
          endpoint, username, password, scope,
          suiteDef.swiftCollection, suiteDef.cCollection,
          docCount, suiteDef.sizeBytes, log, signal,
        );
        flushLog();

        const testResult: TestResult = {
          permutation,
          iterations,
          totalDataBytes: dataSize,
        };

        results.push(testResult);
        callbacks.onResult(testResult);

        callbacks.onProgress({
          suiteId: suiteDef.suiteId,
          currentTest: permIdx,
          totalTests: totalPermutations,
          currentPermutation: permutation,
          currentIteration: TIMED_ITERATIONS,
          totalIterations: TIMED_ITERATIONS,
          currentOperation: testType,
          phase: 'running',
          elapsedMs: performance.now() - suiteStart,
        });
      } catch (error: any) {
        log(`  ERROR in ${TEST_TYPE_LABELS[testType]}: ${error.message}`);
        flushLog();
      }
    }
  }

  flushLog();

  const elapsed = performance.now() - suiteStart;
  callbacks.onLog([`\n=== Suite ${suiteDef.label} finished in ${formatElapsed(elapsed)} ===`]);

  return {
    suiteId: suiteDef.suiteId,
    startedAt: new Date(Date.now() - elapsed).toISOString(),
    completedAt: signal?.aborted ? undefined : new Date().toISOString(),
    results,
    status: signal?.aborted ? 'partial' : 'complete',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine: Run a single iteration of a suite (manual iteration path)
// iterNum=1 → Swift first, C second   |   iterNum=2 → C first, Swift second
// ─────────────────────────────────────────────────────────────────────────────

function getTestResultKey(r: TestResult): string {
  const op = r.iterations[0]?.swiftResult?.timings[0]?.operation
    ?? r.iterations[0]?.cResult?.timings[0]?.operation
    ?? 'unknown';
  return `${r.permutation.count}:${r.permutation.size}:${op}`;
}

function mergeIterResultsIntoSuite(
  existing: SuiteResult | undefined,
  newResults: TestResult[],
  suiteId: SuiteId,
): SuiteResult {
  if (!existing) {
    return { suiteId, startedAt: new Date().toISOString(), results: newResults, status: 'partial' };
  }
  const merged = [...existing.results];
  for (const newR of newResults) {
    const key = getTestResultKey(newR);
    const idx = merged.findIndex((r) => getTestResultKey(r) === key);
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], iterations: [...merged[idx].iterations, ...newR.iterations] };
    } else {
      merged.push(newR);
    }
  }
  return { ...existing, results: merged };
}

async function runSuiteIteration(
  suiteDef: ReplSuiteDefinition,
  iterNum: number,
  swiftFirst: boolean,
  endpoint: string, username: string, password: string, scope: string,
  callbacks: EngineCallbacks,
  signal?: AbortSignal,
): Promise<TestResult[]> {
  const helperMod = NativeCblSwiftModule;
  const swiftMod = NativeCblSwiftModule;
  const cMod = NativeCblCModule;

  const iterStart = performance.now();
  const results: TestResult[] = [];
  const totalPermutations = suiteDef.feasibleCounts.length * REPL_TEST_TYPES.length;
  let permIdx = 0;

  const logBuffer: string[] = [];
  const log = (msg: string) => { logBuffer.push(msg); };
  const flushLog = () => {
    if (logBuffer.length > 0) { callbacks.onLog([...logBuffer]); logBuffer.length = 0; }
  };

  const iterLabel = swiftFirst ? 'Swift→C' : 'C→Swift';
  callbacks.onLog([`\n=== Iter ${iterNum} [${iterLabel}]: ${suiteDef.label} ===`]);

  for (const docCount of suiteDef.feasibleCounts) {
    for (const testType of REPL_TEST_TYPES) {
      if (signal?.aborted) break;
      permIdx++;

      const permutation: TestPermutation = {
        suiteId: suiteDef.suiteId, size: suiteDef.sizeBytes,
        count: docCount, lifecycle: 'replication',
      };

      callbacks.onProgress({
        suiteId: suiteDef.suiteId,
        currentTest: permIdx, totalTests: totalPermutations,
        currentPermutation: permutation,
        currentIteration: iterNum, totalIterations: TIMED_ITERATIONS,
        currentOperation: testType, phase: 'running',
        elapsedMs: performance.now() - iterStart,
      });

      const dataSize = docCount * suiteDef.sizeBytes;
      log(`\n--- ${TEST_TYPE_LABELS[testType]} | ${suiteDef.label} x ${formatCount(docCount)} (${formatBytes(dataSize)}) ---`);
      flushLog();

      try {
        const { iterations } = await runTestType(
          testType, helperMod!, swiftMod!, cMod!,
          endpoint, username, password, scope,
          suiteDef.swiftCollection, suiteDef.cCollection,
          docCount, suiteDef.sizeBytes, log, signal,
          { iterNum, swiftFirst },
        );
        flushLog();
        results.push({ permutation, iterations, totalDataBytes: dataSize });
      } catch (error: any) {
        log(`  ERROR in ${TEST_TYPE_LABELS[testType]}: ${error.message}`);
        flushLog();
      }
    }
  }

  flushLog();
  const elapsed = performance.now() - iterStart;
  callbacks.onLog([`\n=== Iter ${iterNum} [${iterLabel}] ${suiteDef.label} done in ${formatElapsed(elapsed)} ===`]);
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Format Progress for Status Text
// ─────────────────────────────────────────────────────────────────────────────

function formatProgress(p: BenchmarkProgress): string {
  const opLabel = TEST_TYPE_LABELS[p.currentOperation ?? ''] ?? p.currentOperation ?? '';
  const countLabel = formatCount(p.currentPermutation.count);
  const elapsed = formatElapsed(p.elapsedMs);
  return `Test ${p.currentTest}/${p.totalTests} | ${countLabel} docs | ${opLabel} | ${elapsed}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial Statuses
// ─────────────────────────────────────────────────────────────────────────────

function buildInitialStatuses(): Record<SuiteId, SuiteStatus> {
  const statuses: Partial<Record<SuiteId, SuiteStatus>> = {};
  for (const s of REPL_SUITE_DEFINITIONS) {
    statuses[s.suiteId] = 'not_started';
  }
  return statuses as Record<SuiteId, SuiteStatus>;
}

type IterStatus = 'pending' | 'running' | 'done' | 'error';
interface SuiteIterStatuses { iter1: IterStatus; iter2: IterStatus }

function buildInitialIterStatuses(): Record<SuiteId, SuiteIterStatuses> {
  const statuses: Partial<Record<SuiteId, SuiteIterStatuses>> = {};
  for (const s of REPL_SUITE_DEFINITIONS) {
    statuses[s.suiteId] = { iter1: 'pending', iter2: 'pending' };
  }
  return statuses as Record<SuiteId, SuiteIterStatuses>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ReplicatorBenchmark() {
  // ── State ──────────────────────────────────────────────────────────────
  const [suiteStatuses, setSuiteStatuses] = useState<Record<SuiteId, SuiteStatus>>(buildInitialStatuses);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [statusText, setStatusText] = useState('Ready');
  const [isRunning, setIsRunning] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [liveActivity, setLiveActivity] = useState('');
  const [livePhase, setLivePhase] = useState<LivePhase>('idle');
  const [expandedSuiteId, setExpandedSuiteId] = useState<SuiteId | null>(null);
  const [iterStatuses, setIterStatuses] = useState<Record<SuiteId, SuiteIterStatuses>>(buildInitialIterStatuses);
  const [configCollapsed, setConfigCollapsed] = useState(false);

  // Capella config
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [scope, setScope] = useState(DEFAULT_SCOPE);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const suiteResultsRef = useRef<Partial<Record<SuiteId, SuiteResult>>>({});

  // ── Load saved results on mount ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const saved = await loadReplicatorSuiteResults();
      suiteResultsRef.current = saved;
      const newStatuses = buildInitialStatuses();
      for (const [id, result] of Object.entries(saved)) {
        if (result) {
          newStatuses[id as SuiteId] = result.status === 'complete' ? 'complete' : 'partial';
        }
      }
      setSuiteStatuses(newStatuses);
      setHasResults(Object.keys(saved).length > 0);
    })().catch(console.warn);
  }, []);

  // ── AppState Monitoring ────────────────────────────────────────────────
  const appStateRef = useRef(AppState.currentState);
  const bgTaskTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wentToRealBackgroundRef = useRef(false);

  useEffect(() => {
    const stateListener = AppState.addEventListener('change', (nextAppState) => {
      const prev = appStateRef.current;
      const ts = new Date().toISOString().slice(11, 23);

      if (nextAppState === 'inactive' && prev === 'active') {
        setLogLines((p) => [...p, `\n[${ts}] APP STATE: active -> inactive (harmless)`]);
      }
      if (nextAppState === 'background') {
        wentToRealBackgroundRef.current = true;
        setLogLines((p) => [...p, `\n[${ts}] APP STATE: ${prev} -> background (iOS may suspend!)`]);
        if (isRunning) {
          bgTaskTimeoutRef.current = setTimeout(() => {
            setLogLines((p) => [...p, `\n[${new Date().toISOString().slice(11, 23)}] APP STILL IN BACKGROUND after 30s`]);
          }, 30000);
        }
      }
      if (nextAppState === 'active' && prev !== 'active') {
        setLogLines((p) => [...p, `\n[${ts}] APP STATE: ${prev} -> active (returned)`]);
        if (bgTaskTimeoutRef.current) {
          clearTimeout(bgTaskTimeoutRef.current);
          bgTaskTimeoutRef.current = null;
        }
        if (wentToRealBackgroundRef.current && isRunning) {
          wentToRealBackgroundRef.current = false;
          Alert.alert('App Was Backgrounded', 'The app was sent to background during the benchmark. If the benchmark stopped, iOS may have suspended execution.');
        }
        wentToRealBackgroundRef.current = false;
      }
      appStateRef.current = nextAppState;
    });
    return () => {
      stateListener?.remove();
      if (bgTaskTimeoutRef.current) clearTimeout(bgTaskTimeoutRef.current);
    };
  }, [isRunning]);

  // ── Memory Warning Detection (iOS) ────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const listener = AppState.addEventListener('memoryWarning', () => {
      setLogLines((p) => [...p, '\nMEMORY WARNING - Consider running smaller suites']);
      if (isRunning) {
        Alert.alert('Low Memory Warning', 'The device is running low on memory. Consider cancelling.');
      }
    });
    return () => { listener?.remove(); };
  }, [isRunning]);

  // ── Heartbeat Timer ────────────────────────────────────────────────────
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [heartbeat, setHeartbeat] = useState(0);

  useEffect(() => {
    if (isRunning) {
      heartbeatRef.current = setInterval(() => setHeartbeat((p) => p + 1), 5000);
    } else {
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      setHeartbeat(0);
    }
    return () => { if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; } };
  }, [isRunning]);

  // ── Reset live activity when run finishes ──────────────────────────────
  useEffect(() => {
    if (!isRunning) {
      setLiveActivity('');
      setLivePhase('idle');
    }
  }, [isRunning]);

  // ── Auto-scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    if (logLines.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [logLines]);

  // ── Engine Callbacks ───────────────────────────────────────────────────
  const makeCallbacks = useCallback(
    (runningSuiteId?: SuiteId): EngineCallbacks => ({
      onLog: (lines: string[]) => {
        setLogLines((prev) => [...prev, ...lines]);
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line && !line.startsWith('===') && !line.startsWith('---') && !line.startsWith('─')) {
            setLiveActivity(line);
            const phase = detectPhase(line);
            if (phase !== 'idle') setLivePhase(phase);
            break;
          }
        }
      },
      onProgress: (progress: BenchmarkProgress) => setStatusText(formatProgress(progress)),
      onResult: (result: TestResult) => {
        if (runningSuiteId) {
          const existing = suiteResultsRef.current[runningSuiteId];
          const updated: SuiteResult = existing
            ? { ...existing, results: [...existing.results, result] }
            : { suiteId: runningSuiteId, startedAt: new Date().toISOString(), results: [result], status: 'partial' };
          suiteResultsRef.current[runningSuiteId] = updated;
          setHasResults(true);
          saveReplicatorSuiteResult(updated).catch(() => {});
        }
      },
    }),
    [],
  );

  // ── Toggle Suite Expansion ─────────────────────────────────────────────
  const handleToggleSuite = useCallback((suiteId: SuiteId) => {
    if (isRunning) return;
    setExpandedSuiteId((prev) => (prev === suiteId ? null : suiteId));
  }, [isRunning]);

  // ── Run a Single Iteration ─────────────────────────────────────────────
  const handleRunIteration = useCallback(async (suiteId: SuiteId, iterNum: 1 | 2) => {
    if (isRunning) return;
    const suiteDef = REPL_SUITE_DEFINITIONS.find((s) => s.suiteId === suiteId);
    if (!suiteDef) return;

    if (!NativeCblSwiftModule || !NativeCblCModule) {
      Alert.alert('Error', 'Native modules not available. Ensure turbo-v2 is compiled.');
      return;
    }

    const swiftFirst = iterNum === 1;
    const iterLabel = swiftFirst ? 'Swift→C' : 'C→Swift';

    setIsRunning(true);
    setLiveActivity(`Iter ${iterNum} [${iterLabel}]: ${suiteDef.label} starting...`);
    setLivePhase('run');
    try { await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: true }); } catch { /* ignore */ }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIterStatuses((prev) => ({
      ...prev,
      [suiteId]: { ...prev[suiteId], [`iter${iterNum}`]: 'running' as IterStatus },
    }));
    setSuiteStatuses((prev) => ({ ...prev, [suiteId]: 'running' }));
    setStatusText(`Iter ${iterNum} [${iterLabel}]: ${suiteDef.label}`);
    setLogLines((prev) => [...prev, `\n=== Starting Iter ${iterNum} [${iterLabel}]: ${suiteDef.label} ===`]);

    const callbacks: EngineCallbacks = {
      onLog: (lines: string[]) => {
        setLogLines((prev) => [...prev, ...lines]);
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line && !line.startsWith('===') && !line.startsWith('---') && !line.startsWith('─')) {
            setLiveActivity(line);
            const phase = detectPhase(line);
            if (phase !== 'idle') setLivePhase(phase);
            break;
          }
        }
      },
      onProgress: (progress: BenchmarkProgress) => setStatusText(formatProgress(progress)),
      onResult: () => {},
    };

    try {
      const iterResults = await runSuiteIteration(
        suiteDef, iterNum, swiftFirst, endpoint, username, password, scope, callbacks, controller.signal,
      );

      const merged = mergeIterResultsIntoSuite(suiteResultsRef.current[suiteId], iterResults, suiteId);
      suiteResultsRef.current[suiteId] = merged;
      setHasResults(true);
      await saveReplicatorSuiteResult(merged);

      const newIterStatus: IterStatus = controller.signal.aborted ? 'error' : 'done';
      setIterStatuses((prev) => {
        const updated = { ...prev[suiteId], [`iter${iterNum}`]: newIterStatus };
        const bothDone = updated.iter1 === 'done' && updated.iter2 === 'done';
        setSuiteStatuses((s) => ({ ...s, [suiteId]: bothDone ? 'complete' : 'partial' }));
        return { ...prev, [suiteId]: updated };
      });
      setStatusText(
        controller.signal.aborted
          ? `Iter ${iterNum} cancelled`
          : `Iter ${iterNum} [${iterLabel}] done — ${suiteDef.label}`,
      );
    } catch (error: any) {
      setIterStatuses((prev) => ({
        ...prev,
        [suiteId]: { ...prev[suiteId], [`iter${iterNum}`]: 'error' as IterStatus },
      }));
      setSuiteStatuses((prev) => ({ ...prev, [suiteId]: 'partial' }));
      setStatusText(`Error: ${error.message}`);
      setLogLines((prev) => [...prev, `\nCRASH/ERROR: ${error.message}\nStack: ${error.stack || 'No stack'}`]);
      Alert.alert('Benchmark Error', `${error.message}\n\nCheck log for details.`);
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
      try { await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: false }); } catch { /* ignore */ }
    }
  }, [isRunning, endpoint, username, password, scope]);

  // ── Run All Suites ─────────────────────────────────────────────────────
  const handleRunAll = useCallback(async () => {
    if (isRunning) return;
    if (!NativeCblSwiftModule || !NativeCblCModule) {
      Alert.alert('Error', 'Native modules not available.');
      return;
    }

    setIsRunning(true);
    setLiveActivity('Starting all suites...');
    setLivePhase('run');
    try { await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: true }); } catch { /* ignore */ }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    suiteResultsRef.current = {};
    setSuiteStatuses(buildInitialStatuses);
    setStatusText('Starting all suites...');

    try {
      for (const suiteDef of REPL_SUITE_DEFINITIONS) {
        if (controller.signal.aborted) break;
        setSuiteStatuses((prev) => ({ ...prev, [suiteDef.suiteId]: 'running' }));
        const callbacks = makeCallbacks(suiteDef.suiteId);
        const result = await runReplSuite(suiteDef, endpoint, username, password, scope, callbacks, controller.signal);
        suiteResultsRef.current[suiteDef.suiteId] = result;
        await saveReplicatorSuiteResult(result);
        setSuiteStatuses((prev) => ({ ...prev, [suiteDef.suiteId]: result.status === 'complete' ? 'complete' : 'partial' }));
      }
      setStatusText(controller.signal.aborted ? 'Run cancelled' : 'All suites complete');
    } catch (error: any) {
      setStatusText(`Error: ${error.message}`);
      setLogLines((prev) => [...prev, `\nERROR: ${error.message}`]);
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
      try { await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: false }); } catch { /* ignore */ }
    }
  }, [isRunning, makeCallbacks, endpoint, username, password, scope]);

  // ── Quick Validation Test ──────────────────────────────────────────────
  const handleQuickValidation = useCallback(async () => {
    if (isRunning) return;
    if (!NativeCblSwiftModule || !NativeCblCModule) {
      Alert.alert('Error', 'Native modules not available.');
      return;
    }

    setIsRunning(true);
    setLiveActivity('Quick validation starting...');
    setLivePhase('run');
    try { await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: true }); } catch { /* ignore */ }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStatusText('Running quick validation...');

    const VALIDATION_COUNT = 100;
    const VALIDATION_SIZE = 100;
    const SWIFT_VALIDATION_COLL = 'bench_100b_swift';
    const C_VALIDATION_COLL = 'bench_100b_c';
    const helperMod = NativeCblSwiftModule!;
    const swiftMod = NativeCblSwiftModule!;
    const cMod = NativeCblCModule!;

    const lines: string[] = [];
    const addLog = (msg: string) => {
      lines.push(msg);
      setLogLines((prev) => [...prev, msg]);
      const trimmed = msg.trim();
      if (trimmed && !trimmed.startsWith('===') && !trimmed.startsWith('---') && !trimmed.startsWith('─') && !trimmed.startsWith('=')) {
        setLiveActivity(trimmed);
        const phase = detectPhase(trimmed);
        if (phase !== 'idle') setLivePhase(phase);
      }
    };

    addLog('\n============================================');
    addLog('=== QUICK VALIDATION TEST (100B x 100) ===');
    addLog('============================================');
    addLog(`Endpoint: ${endpoint}`);
    addLog(`Scope: ${scope}`);
    addLog(`Swift: ${SWIFT_VALIDATION_COLL} | C: ${C_VALIDATION_COLL}`);
    addLog(`Time: ${new Date().toISOString()}\n`);

    const results: { test: string; status: string; swiftMs: number; cMs: number; swiftDocs: number; cDocs: number }[] = [];

    const VALIDATION_TEST_ORDER: OperationType[] = [
      'push_create',
      'pull_create',
      'bidirectional',
    ];

    try {
      for (const testType of VALIDATION_TEST_ORDER) {
        if (controller.signal.aborted) break;
        const label = TEST_TYPE_LABELS[testType] ?? testType;
        addLog(`\n--- ${label} ---`);
        addLog(`Endpoint: ${endpoint} | Scope: ${scope}`);
        addLog(`Swift: ${SWIFT_VALIDATION_COLL} | C: ${C_VALIDATION_COLL}`);
        addLog(`Docs: ${VALIDATION_COUNT} × ${VALIDATION_SIZE}B\n`);
        setStatusText(`Validating: ${label}`);

        const swiftRid = makeRunId();
        const cRid = makeRunId();

        let swiftResult: { timeMs: number; opsCount: number } = { timeMs: 0, opsCount: 0 };
        let cResult: { timeMs: number; opsCount: number } = { timeMs: 0, opsCount: 0 };
        let swiftError = '';
        let cError = '';

        // ── Server setup for Swift run (bench_100b_swift) ───────────────
        await cleanupServerCollection(helperMod, endpoint, username, password, scope, SWIFT_VALIDATION_COLL, addLog);

        if (testType === 'pull_create') {
          await stageServerDocs(helperMod, endpoint, username, password, scope, SWIFT_VALIDATION_COLL, VALIDATION_COUNT, VALIDATION_SIZE, `doc_${swiftRid}`, addLog);
        } else if (testType === 'pull_update') {
          await stageServerDocsAndUpdates(helperMod, endpoint, username, password, scope, SWIFT_VALIDATION_COLL, VALIDATION_COUNT, VALIDATION_SIZE, swiftRid, addLog);
        } else if (testType === 'pull_delete') {
          await stageServerDocs(helperMod, endpoint, username, password, scope, SWIFT_VALIDATION_COLL, VALIDATION_COUNT, VALIDATION_SIZE, `doc_${swiftRid}`, addLog);
        } else if (testType === 'bidirectional') {
          const halfCount = Math.floor(VALIDATION_COUNT / 2);
          await stageServerDocs(helperMod, endpoint, username, password, scope, SWIFT_VALIDATION_COLL, halfCount, VALIDATION_SIZE, `srv_${swiftRid}`, addLog);
        }

        // ── Run Swift ───────────────────────────────────────────────────
        addLog(`  [swift → ${SWIFT_VALIDATION_COLL}] Starting...`);
        try {
          if (testType === 'pull_delete') {
            swiftResult = await execPullDelete(swiftMod, helperMod, endpoint, username, password, scope, SWIFT_VALIDATION_COLL, swiftRid, addLog);
          } else {
            switch (testType) {
              case 'push_create':
                swiftResult = await execPushCreate(swiftMod, endpoint, username, password, scope, SWIFT_VALIDATION_COLL, VALIDATION_COUNT, VALIDATION_SIZE, swiftRid);
                break;
              case 'push_update':
                swiftResult = await execPushUpdate(swiftMod, endpoint, username, password, scope, SWIFT_VALIDATION_COLL, VALIDATION_COUNT, VALIDATION_SIZE, swiftRid);
                break;
              case 'push_delete':
                swiftResult = await execPushDelete(swiftMod, endpoint, username, password, scope, SWIFT_VALIDATION_COLL, VALIDATION_COUNT, VALIDATION_SIZE, swiftRid);
                break;
              case 'pull_create':
                swiftResult = await execPullCreate(swiftMod, endpoint, username, password, scope, SWIFT_VALIDATION_COLL, VALIDATION_COUNT);
                break;
              case 'pull_update':
                swiftResult = await execPullUpdate(swiftMod, endpoint, username, password, scope, SWIFT_VALIDATION_COLL, VALIDATION_COUNT, VALIDATION_SIZE);
                break;
              case 'bidirectional':
                swiftResult = await execBidirectional(swiftMod, endpoint, username, password, scope, SWIFT_VALIDATION_COLL, VALIDATION_COUNT, VALIDATION_SIZE, swiftRid);
                break;
            }
          }
        } catch (e: any) { swiftError = e.message; }
        addLog(`  Swift: ${swiftError ? `ERROR: ${swiftError}` : `${swiftResult.timeMs.toFixed(0)}ms, ${swiftResult.opsCount} docs`}`);

        // ── Server setup for C run (bench_100b_c) ──────────────────────
        await cleanupServerCollection(helperMod, endpoint, username, password, scope, C_VALIDATION_COLL, addLog);

        if (testType === 'pull_create') {
          await stageServerDocs(helperMod, endpoint, username, password, scope, C_VALIDATION_COLL, VALIDATION_COUNT, VALIDATION_SIZE, `doc_${cRid}`, addLog);
        } else if (testType === 'pull_update') {
          await stageServerDocsAndUpdates(helperMod, endpoint, username, password, scope, C_VALIDATION_COLL, VALIDATION_COUNT, VALIDATION_SIZE, cRid, addLog);
        } else if (testType === 'pull_delete') {
          await stageServerDocs(helperMod, endpoint, username, password, scope, C_VALIDATION_COLL, VALIDATION_COUNT, VALIDATION_SIZE, `doc_${cRid}`, addLog);
        } else if (testType === 'bidirectional') {
          const halfCount = Math.floor(VALIDATION_COUNT / 2);
          await stageServerDocs(helperMod, endpoint, username, password, scope, C_VALIDATION_COLL, halfCount, VALIDATION_SIZE, `srv_${cRid}`, addLog);
        }

        // ── Run C ───────────────────────────────────────────────────────
        addLog(`  [c → ${C_VALIDATION_COLL}] Starting...`);
        try {
          if (testType === 'pull_delete') {
            cResult = await execPullDelete(cMod, helperMod, endpoint, username, password, scope, C_VALIDATION_COLL, cRid, addLog);
          } else {
            switch (testType) {
              case 'push_create':
                cResult = await execPushCreate(cMod, endpoint, username, password, scope, C_VALIDATION_COLL, VALIDATION_COUNT, VALIDATION_SIZE, cRid);
                break;
              case 'push_update':
                cResult = await execPushUpdate(cMod, endpoint, username, password, scope, C_VALIDATION_COLL, VALIDATION_COUNT, VALIDATION_SIZE, cRid);
                break;
              case 'push_delete':
                cResult = await execPushDelete(cMod, endpoint, username, password, scope, C_VALIDATION_COLL, VALIDATION_COUNT, VALIDATION_SIZE, cRid);
                break;
              case 'pull_create':
                cResult = await execPullCreate(cMod, endpoint, username, password, scope, C_VALIDATION_COLL, VALIDATION_COUNT);
                break;
              case 'pull_update':
                cResult = await execPullUpdate(cMod, endpoint, username, password, scope, C_VALIDATION_COLL, VALIDATION_COUNT, VALIDATION_SIZE);
                break;
              case 'bidirectional':
                cResult = await execBidirectional(cMod, endpoint, username, password, scope, C_VALIDATION_COLL, VALIDATION_COUNT, VALIDATION_SIZE, cRid);
                break;
            }
          }
        } catch (e: any) { cError = e.message; }
        addLog(`  C:     ${cError ? `ERROR: ${cError}` : `${cResult.timeMs.toFixed(0)}ms, ${cResult.opsCount} docs`}`);

        // ── Validate ────────────────────────────────────────────────────
        const halfCount = Math.floor(VALIDATION_COUNT / 2);
        let swiftOk = !swiftError && swiftResult.opsCount > 0;
        let cOk = !cError && cResult.opsCount > 0;
        if (testType === 'bidirectional') {
          swiftOk = !swiftError && swiftResult.opsCount > halfCount;
          cOk = !cError && cResult.opsCount > halfCount;
        }

        if (!swiftOk) {
          addLog(testType === 'bidirectional'
            ? `  ** Swift FAIL: expected ${VALIDATION_COUNT} docs (${halfCount} local + ${halfCount} pulled), got ${swiftResult.opsCount}`
            : `  ** Swift FAIL: expected >0 docs synced, got ${swiftResult.opsCount}`);
        }
        if (!cOk) {
          addLog(testType === 'bidirectional'
            ? `  ** C FAIL: expected ${VALIDATION_COUNT} docs (${halfCount} local + ${halfCount} pulled), got ${cResult.opsCount}`
            : `  ** C FAIL: expected >0 docs synced, got ${cResult.opsCount}`);
        }

        const status = (swiftOk && cOk) ? 'PASS' : 'FAIL';
        addLog(`  Result: ${status}\n`);

        results.push({
          test: label,
          status,
          swiftMs: swiftResult.timeMs,
          cMs: cResult.timeMs,
          swiftDocs: swiftResult.opsCount,
          cDocs: cResult.opsCount,
        });

        await cooldown();
      }

      // Print summary
      addLog('============================================');
      addLog('=== VALIDATION SUMMARY ===');
      addLog('============================================');
      const passCount = results.filter((r) => r.status === 'PASS').length;
      const failCount = results.filter((r) => r.status === 'FAIL').length;
      addLog('');
      for (const r of results) {
        const tag = r.status === 'PASS' ? '[PASS]' : '[FAIL]';
        addLog(`  ${tag} ${r.test.padEnd(16)} Swift: ${r.swiftMs.toFixed(0)}ms (${r.swiftDocs} docs) | C: ${r.cMs.toFixed(0)}ms (${r.cDocs} docs)`);
      }
      addLog('');
      addLog(`  Total: ${passCount} PASS, ${failCount} FAIL out of ${results.length} tests`);
      if (failCount === 0) {
        addLog('\n  ALL TESTS PASSED — safe to run full benchmark!');
        setStatusText('Validation PASSED — all 7 test types working');
      } else {
        addLog(`\n  ${failCount} TEST(S) FAILED — fix issues before running full benchmark.`);
        addLog('  Check channel access if pull tests fail.');
        setStatusText(`Validation: ${failCount} FAILED — check log`);
      }
      addLog('============================================\n');

    } catch (error: any) {
      addLog(`\nVALIDATION ERROR: ${error.message}`);
      addLog(`Stack: ${error.stack || 'No stack'}`);
      setStatusText(`Validation error: ${error.message}`);
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
      try { await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: false }); } catch { /* ignore */ }
    }
  }, [isRunning, endpoint, username, password, scope]);

  // ── Action Buttons ─────────────────────────────────────────────────────
  const handleCopyLog = useCallback(async () => {
    const allResults = Object.values(suiteResultsRef.current).filter(Boolean) as SuiteResult[];
    const text = allResults.length > 0 ? formatRawLog(allResults) : logLines.join('\n');
    if (text.length === 0) { Alert.alert('Nothing to copy', 'Run a benchmark first.'); return; }
    await copyToClipboard(text);
    Alert.alert('Copied', 'Log copied to clipboard.');
  }, [logLines]);

  const handleClear = useCallback(() => { setLogLines([]); setStatusText('Ready'); }, []);

  const handleResetAll = useCallback(() => {
    Alert.alert('Reset All Results', 'Delete all saved replicator benchmark results?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All', style: 'destructive',
        onPress: async () => {
          await deleteAllReplicatorResults();
          suiteResultsRef.current = {};
          setSuiteStatuses(buildInitialStatuses);
          setLogLines([]);
          setStatusText('All results cleared');
          setHasResults(false);
        },
      },
    ]);
  }, []);

  // ── Clear All DBs + Server ─────────────────────────────────────────────
  // Mirrors the manual benchmark's cleanup strategy:
  // 1. Drop local repl-bench DB entirely (clears all collections at once)
  // 2. Clean every swift + c server collection for all suites
  const handleClearAll = useCallback(() => {
    if (isRunning) return;
    Alert.alert(
      'Clear All DBs + Server',
      `Delete the local "${DB_NAME}" DB and purge all server collections for all suites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All', style: 'destructive',
          onPress: async () => {
            if (!NativeCblSwiftModule || !NativeCblCModule) {
              Alert.alert('Error', 'Native modules not available.');
              return;
            }
            setIsRunning(true);
            setLiveActivity('Cleanup starting...');
            setLivePhase('cleanup');
            try { await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: true }); } catch { /* ignore */ }

            const dir = getDocumentsDirectory();
            const lines: string[] = [];
            const addLog = (msg: string) => {
              lines.push(msg);
              setLogLines((prev) => [...prev, msg]);
              const trimmed = msg.trim();
              if (trimmed && !trimmed.startsWith('─') && !trimmed.startsWith('♻') && !trimmed.startsWith('✅')) {
                setLiveActivity(trimmed);
                const phase = detectPhase(trimmed);
                if (phase !== 'idle') setLivePhase(phase);
              }
            };

            addLog(`\n${'─'.repeat(48)}`);
            addLog(`♻  Clear All DBs + Server`);
            addLog(`${'─'.repeat(48)}`);

            // 1. Drop local DB (removes all local collections at once)
            addLog(`\n[local] Deleting "${DB_NAME}" DB...`);
            try {
              await NativeCblSwiftModule!.database_DeleteWithPath({ databaseName: DB_NAME, directory: dir });
              addLog(`  Deleted ${DB_NAME} (Swift handle)`);
            } catch { addLog(`  ${DB_NAME} not found (Swift) — skipping`); }
            try {
              await NativeCblCModule!.database_DeleteWithPath({ databaseName: DB_NAME, directory: dir });
              addLog(`  Deleted ${DB_NAME} (C handle)`);
            } catch { addLog(`  ${DB_NAME} not found (C) — skipping`); }

            // 2. Clean all server collections for every suite
            addLog(`\n[server] Cleaning all suite collections...`);
            for (const suite of REPL_SUITE_DEFINITIONS) {
              addLog(`\n  Suite ${suite.label}:`);
              await cleanupServerCollection(
                NativeCblSwiftModule!, endpoint, username, password, scope,
                suite.swiftCollection, addLog,
              );
              await cleanupServerCollection(
                NativeCblSwiftModule!, endpoint, username, password, scope,
                suite.cCollection, addLog,
              );
            }

            addLog(`\n${'─'.repeat(48)}`);
            addLog(`✅  All cleared — ready for a fresh run`);
            addLog(`${'─'.repeat(48)}`);
            setStatusText('All cleared');

            try { await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: false }); } catch { /* ignore */ }
            setIsRunning(false);
          },
        },
      ],
    );
  }, [isRunning, endpoint, username, password, scope]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header — tap to collapse/expand config */}
      <TouchableOpacity
        style={[styles.header, configCollapsed && styles.headerCollapsed]}
        onPress={() => setConfigCollapsed((v) => !v)}
        activeOpacity={0.85}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Replicator Benchmark</Text>
          <Text style={styles.headerChevron}>{configCollapsed ? '▼' : '▲'}</Text>
        </View>
        {!configCollapsed && (
          <Text style={styles.subtitle}>
            Swift SDK vs C SDK · Push, Pull, Bidirectional · Tap to collapse
          </Text>
        )}
      </TouchableOpacity>

      {/* Sync Gateway Config — hidden when collapsed */}
      {!configCollapsed && (
      <View style={styles.configPanel}>
        <Text style={styles.sectionTitle}>Sync Gateway Connection</Text>
        {[
          { label: 'Endpoint', value: endpoint, setter: setEndpoint, placeholder: 'wss://...' },
          { label: 'Username', value: username, setter: setUsername },
          { label: 'Password', value: password, setter: setPassword, secure: true },
          { label: 'Scope', value: scope, setter: setScope, placeholder: 'e.g. replicator' },
        ].map((field) => (
          <View key={field.label} style={styles.configRow}>
            <Text style={styles.configLabel}>{field.label}</Text>
            <TextInput
              style={[styles.configInput, isRunning && styles.configInputDisabled]}
              value={field.value}
              onChangeText={field.setter}
              editable={!isRunning}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={field.secure}
              selectTextOnFocus
              placeholder={field.placeholder}
            />
          </View>
        ))}
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>Swift Colls</Text>
          <Text style={styles.configHint}>
            {REPL_SUITE_DEFINITIONS.map((s) => s.swiftCollection).join(', ')}
          </Text>
        </View>
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>C Colls</Text>
          <Text style={styles.configHint}>
            {REPL_SUITE_DEFINITIONS.map((s) => s.cCollection).join(', ')}
          </Text>
        </View>
      </View>
      )}

      {/* Suite Selector */}
      <View style={styles.suiteSelectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suiteSelector}>
          {REPL_SUITE_DEFINITIONS.map((suite) => {
            const status = suiteStatuses[suite.suiteId];
            const isExpanded = expandedSuiteId === suite.suiteId;
            const totalPerms = suite.feasibleCounts.length * REPL_TEST_TYPES.length;
            return (
              <TouchableOpacity
                key={suite.suiteId}
                style={[
                  styles.suiteButton,
                  status === 'running' && styles.suiteButtonRunning,
                  status === 'complete' && styles.suiteButtonComplete,
                  status === 'partial' && styles.suiteButtonPartial,
                  isExpanded && styles.suiteButtonExpanded,
                ]}
                onPress={() => handleToggleSuite(suite.suiteId)}
                disabled={isRunning}
              >
                <Text style={[styles.suiteButtonLabel, (status !== 'not_started') && styles.suiteButtonLabelActive]}>
                  {suite.label}
                </Text>
                <Text style={[styles.suiteButtonInfo, (status !== 'not_started') && styles.suiteButtonInfoActive]}>
                  {totalPerms} tests
                </Text>
                <Text style={[
                  styles.suiteButtonStatus,
                  status === 'running' && styles.statusRunning,
                  status === 'complete' && styles.statusComplete,
                  status === 'partial' && styles.statusPartial,
                  status === 'not_started' && styles.statusNotStarted,
                ]}>
                  {status === 'not_started' && '--'}
                  {status === 'running' && 'Running...'}
                  {status === 'complete' && 'Done'}
                  {status === 'partial' && 'Partial'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Iteration Panel — shown when a suite is selected */}
      {expandedSuiteId !== null && (() => {
        const suiteDef = REPL_SUITE_DEFINITIONS.find((s) => s.suiteId === expandedSuiteId)!;
        const iters = iterStatuses[expandedSuiteId];
        const ITER_CONFIG = [
          { iterNum: 1 as const, label: 'Iter 1', sublabel: 'Swift → C', key: 'iter1' as const, color: '#1B5E20', dimColor: '#A5D6A7' },
          { iterNum: 2 as const, label: 'Iter 2', sublabel: 'C → Swift', key: 'iter2' as const, color: '#1565C0', dimColor: '#BBDEFB' },
        ];
        return (
          <View style={styles.iterPanel}>
            <View style={styles.iterPanelHeader}>
              <Text style={styles.iterPanelTitle}>{suiteDef.label} — Select Iteration</Text>
              <Text style={styles.iterPanelHint}>{suiteDef.feasibleCounts.length * REPL_TEST_TYPES.length} permutations · {suiteDef.feasibleCounts.map(formatCount).join(', ')} docs</Text>
            </View>
            <View style={styles.iterButtonRow}>
              {ITER_CONFIG.map(({ iterNum, label, sublabel, key, color, dimColor }) => {
                const st = iters[key];
                const isThisRunning = st === 'running';
                const isDone = st === 'done';
                const isError = st === 'error';
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.iterButton,
                      { borderColor: color },
                      isDone && styles.iterButtonDone,
                      isError && styles.iterButtonError,
                      isThisRunning && styles.iterButtonRunning,
                      isRunning && styles.iterButtonDisabled,
                    ]}
                    onPress={() => handleRunIteration(expandedSuiteId, iterNum)}
                    disabled={isRunning}
                  >
                    <Text style={[styles.iterButtonLabel, { color: isRunning ? '#9E9E9E' : color }]}>
                      {label}
                    </Text>
                    <Text style={[styles.iterButtonSublabel, { color: isRunning ? '#BDBDBD' : dimColor }]}>
                      {sublabel}
                    </Text>
                    <View style={[styles.iterStatusBadge, { backgroundColor: color }]}>
                      <Text style={styles.iterStatusBadgeText}>
                        {isThisRunning ? 'RUNNING' : isDone ? 'DONE' : isError ? 'ERROR' : 'PENDING'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })()}

      {/* Controls */}
      <View style={styles.controlRow}>
        <TouchableOpacity
          style={[styles.controlButton, styles.validateButton, isRunning && styles.controlButtonDisabled]}
          onPress={handleQuickValidation}
          disabled={isRunning}
        >
          <Text style={styles.controlButtonText}>Validate</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, styles.runAllButton, isRunning && styles.controlButtonDisabled]}
          onPress={handleRunAll}
          disabled={isRunning}
        >
          <Text style={styles.controlButtonText}>{isRunning ? 'Running...' : 'Run All'}</Text>
        </TouchableOpacity>
        {!isRunning && (
          <TouchableOpacity style={[styles.controlButton, styles.clearAllButton]} onPress={handleClearAll}>
            <Text style={styles.controlButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
        {!isRunning && (
          <TouchableOpacity style={[styles.controlButton, styles.resetButton]} onPress={handleResetAll}>
            <Text style={styles.controlButtonText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Activity / Status Panel */}
      {isRunning ? (
        <View style={[styles.activityPanel, PHASE_PANEL_STYLES[livePhase] as any]}>
          <View style={styles.activityHeader}>
            <View style={[styles.activityDot, PHASE_DOT_STYLES[livePhase] as any]} />
            <Text style={[styles.activityPhaseText, PHASE_TEXT_STYLES[livePhase] as any]}>
              {PHASE_LABELS[livePhase]}
            </Text>
            <Text style={styles.activityAlive}>alive {heartbeat * 5}s</Text>
          </View>
          {!!liveActivity && (
            <Text style={styles.activityDetail} numberOfLines={2}>{liveActivity}</Text>
          )}
          <Text style={styles.activityProgress} numberOfLines={1}>{statusText}</Text>
        </View>
      ) : (
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={styles.statusValue} numberOfLines={2}>{statusText}</Text>
        </View>
      )}

      {/* Log */}
      <ScrollView ref={scrollViewRef} style={styles.logContainer} contentContainerStyle={styles.logContent}>
        {logLines.length === 0 ? (
          <Text style={styles.logPlaceholder}>
            Configure Sync Gateway connection above, then tap a suite or "Run All".{'\n\n'}
            Each suite tests Push-Create, Push-Update, Push-Delete, Pull-Create,{'\n'}
            Pull-Update, Pull-Delete, and Bidirectional replication.{'\n\n'}
            Swift uses bench_Xb_swift collections, C uses bench_Xb_c collections.{'\n'}
            Server cleanup and local DB drops are fully automated between tests.{'\n\n'}
            Use "Clear All" to wipe local repl-bench DB + all server collections.
          </Text>
        ) : (
          <Text style={styles.logText}>{logLines.join('\n')}</Text>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, logLines.length === 0 && !hasResults && styles.actionButtonDisabled]}
          onPress={handleCopyLog}
          disabled={logLines.length === 0 && !hasResults}
        >
          <Text style={styles.actionButtonText}>Copy Log</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.actionButtonClear]} onPress={handleClear}>
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

  header: { backgroundColor: '#1B5E20', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20 },
  headerCollapsed: { paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerChevron: { fontSize: 14, color: '#A5D6A7', marginLeft: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#A5D6A7' },

  configPanel: {
    backgroundColor: '#FFFFFF', marginHorizontal: 12, marginTop: 10,
    borderRadius: 8, borderWidth: 1, borderColor: '#D0D0D0', padding: 10, gap: 6,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#333333', marginBottom: 2 },
  configRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  configLabel: { width: 75, fontSize: 12, fontWeight: '600', color: '#333333' },
  configInput: {
    flex: 1, borderWidth: 1, borderColor: '#D0D0D0', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, color: '#333333',
    backgroundColor: '#FAFAFA', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  configInputDisabled: { backgroundColor: '#EEEEEE', color: '#999999' },
  configHint: { flex: 1, fontSize: 11, color: '#666666', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  suiteSelectorContainer: { marginTop: 10, marginHorizontal: 12 },
  suiteSelector: { flexDirection: 'row', gap: 8, paddingVertical: 2, paddingHorizontal: 2 },
  suiteButton: {
    width: 72, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 8,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D0D0D0',
    alignItems: 'center', justifyContent: 'center',
  },
  suiteButtonRunning: { backgroundColor: '#2196F3', borderColor: '#1976D2' },
  suiteButtonComplete: { backgroundColor: '#4CAF50', borderColor: '#388E3C' },
  suiteButtonPartial: { backgroundColor: '#FF9800', borderColor: '#F57C00' },
  suiteButtonExpanded: { borderWidth: 2, borderColor: '#1B5E20' },
  suiteButtonLabel: { fontSize: 15, fontWeight: '700', color: '#333333', marginBottom: 2 },
  suiteButtonLabelActive: { color: '#FFFFFF' },
  suiteButtonInfo: { fontSize: 9, color: '#888888', textAlign: 'center' },
  suiteButtonInfoActive: { color: 'rgba(255,255,255,0.8)' },
  suiteButtonStatus: { fontSize: 10, fontWeight: '600', marginTop: 3 },
  statusRunning: { color: '#FFFFFF' },
  statusComplete: { color: '#FFFFFF' },
  statusPartial: { color: '#FFFFFF' },
  statusNotStarted: { color: '#BBBBBB' },

  controlRow: { flexDirection: 'row', marginHorizontal: 12, marginTop: 10, gap: 8 },
  controlButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  validateButton: { backgroundColor: '#E65100', flex: 1 },
  runAllButton: { backgroundColor: '#1B5E20', flex: 1 },
  clearAllButton: { backgroundColor: '#BF360C', flex: 1 },
  resetButton: { backgroundColor: '#78909C', flex: 1 },
  controlButtonDisabled: { backgroundColor: '#9E9E9E' },
  controlButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  statusContainer: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginTop: 8,
    paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#E8F5E9', borderRadius: 6,
  },
  statusLabel: { fontSize: 12, fontWeight: '700', color: '#1B5E20', marginRight: 8 },
  statusValue: { flex: 1, fontSize: 11, color: '#37474F', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  activityPanel: {
    marginHorizontal: 12, marginTop: 8, borderRadius: 8, padding: 10, borderWidth: 1.5,
  },
  activityHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 4,
  },
  activityDot: {
    width: 9, height: 9, borderRadius: 5, marginRight: 7,
  },
  activityPhaseText: {
    fontSize: 12, fontWeight: '800', letterSpacing: 0.8, flex: 1,
  },
  activityAlive: {
    fontSize: 11, color: '#90A4AE',
  },
  activityDetail: {
    fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#37474F', lineHeight: 16, marginBottom: 3,
  },
  activityProgress: {
    fontSize: 10, color: '#78909C', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  iterPanel: {
    marginHorizontal: 12, marginTop: 8, backgroundColor: '#FFFFFF',
    borderRadius: 10, borderWidth: 1.5, borderColor: '#1B5E20', padding: 10,
  },
  iterPanelHeader: { marginBottom: 8 },
  iterPanelTitle: { fontSize: 13, fontWeight: '700', color: '#1B5E20' },
  iterPanelHint: { fontSize: 11, color: '#78909C', marginTop: 2 },
  iterButtonRow: { flexDirection: 'row', gap: 10 },
  iterButton: {
    flex: 1, borderWidth: 2, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 10,
    alignItems: 'center', backgroundColor: '#FAFAFA',
  },
  iterButtonDone: { backgroundColor: '#E8F5E9' },
  iterButtonError: { backgroundColor: '#FFEBEE', borderColor: '#E53935' },
  iterButtonRunning: { backgroundColor: '#E3F2FD' },
  iterButtonDisabled: { opacity: 0.45 },
  iterButtonLabel: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  iterButtonSublabel: { fontSize: 11, fontWeight: '500', marginBottom: 8 },
  iterStatusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  iterStatusBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },

  logContainer: {
    flex: 1, backgroundColor: '#FFFFFF', marginHorizontal: 12, marginTop: 8,
    borderRadius: 8, borderWidth: 1, borderColor: '#D0D0D0',
  },
  logContent: { padding: 12 },
  logText: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#263238', lineHeight: 16 },
  logPlaceholder: { fontSize: 13, color: '#90A4AE', lineHeight: 20, textAlign: 'center', paddingVertical: 30 },

  actionRow: { flexDirection: 'row', marginHorizontal: 12, marginTop: 8, marginBottom: Platform.OS === 'ios' ? 30 : 12, gap: 6 },
  actionButton: { flex: 1, paddingVertical: 10, borderRadius: 6, backgroundColor: '#1B5E20', alignItems: 'center', justifyContent: 'center' },
  actionButtonClear: { backgroundColor: '#78909C' },
  actionButtonDisabled: { backgroundColor: '#BDBDBD' },
  actionButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
