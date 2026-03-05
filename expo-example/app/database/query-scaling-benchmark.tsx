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
} from 'react-native';
import NativeCblSwiftModule from '../../../src/specs/NativeCblSwift';
import type {
  SuiteResult,
  TestResult,
  BenchmarkProgress,
  EngineCallbacks,
} from '../../lib/benchmark/types';

import type { QuerySuiteId } from '../../lib/benchmark/query-engine';
import {
  QUERY_SUITE_DEFINITIONS,
  getQuerySuiteStats,
  runQuerySuite,
  resetQueryEngineState,
} from '../../lib/benchmark/query-engine';

import {
  exportAsCSV,
  exportAsJSON,
  formatRawLog,
  saveExportFile,
  copyToClipboard,
  saveSuiteResult,
  loadSuiteResults,
  deleteSuiteResult,
} from '../../lib/benchmark/export';

import { formatCount } from '../../lib/benchmark/matrix';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SuiteStatus = 'not_started' | 'running' | 'complete' | 'partial';

// ─────────────────────────────────────────────────────────────────────────────
// Formatting Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function formatProgress(p: BenchmarkProgress): string {
  const phaseLabel = p.phase === 'warmup' ? 'warmup' : `Iter ${p.currentIteration}/${p.totalIterations}`;
  const elapsed = formatElapsed(p.elapsedMs);
  return `Test ${p.currentTest}/${p.totalTests} | ${phaseLabel} | ${elapsed}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial Suite Statuses
// ─────────────────────────────────────────────────────────────────────────────

function buildInitialStatuses(): Record<QuerySuiteId, SuiteStatus> {
  return {
    suite_q_100b: 'not_started',
    suite_q_1kb: 'not_started',
    suite_q_10kb: 'not_started',
    suite_q_100kb: 'not_started',
    suite_q_1mb: 'not_started',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function QueryScalingBenchmark() {
  // ── State ────────────────────────────────────────────────────────────
  const [suiteStatuses, setSuiteStatuses] = useState<
    Record<QuerySuiteId, SuiteStatus>
  >(buildInitialStatuses);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [statusText, setStatusText] = useState('Ready');
  const [isRunning, setIsRunning] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const suiteResultsRef = useRef<Partial<Record<QuerySuiteId, SuiteResult>>>({});

  // ── Load saved results on mount ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      const saved = await loadSuiteResults();
      const queryResults: Partial<Record<QuerySuiteId, SuiteResult>> = {};
      const newStatuses = buildInitialStatuses();
      for (const [id, result] of Object.entries(saved)) {
        if (result && id.startsWith('suite_q_')) {
          queryResults[id as QuerySuiteId] = result;
          newStatuses[id as QuerySuiteId] = result.status === 'complete' ? 'complete' : 'partial';
        }
      }
      suiteResultsRef.current = queryResults;
      setSuiteStatuses(newStatuses);
      setHasResults(Object.keys(queryResults).length > 0);
    })().catch(console.warn);
  }, []);

  // ── AppState Monitoring ──────────────────────────────────────────────
  const appStateRef = useRef(AppState.currentState);
  const bgTaskTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wentToRealBackgroundRef = useRef(false);

  useEffect(() => {
    const stateListener = AppState.addEventListener('change', (nextAppState) => {
      const prev = appStateRef.current;
      const ts = new Date().toISOString().slice(11, 23);

      if (nextAppState === 'background') {
        wentToRealBackgroundRef.current = true;
        setLogLines((prevLines) => [...prevLines, `\n[${ts}] APP STATE: ${prev} -> background`]);
        if (isRunning) {
          bgTaskTimeoutRef.current = setTimeout(() => {
            setLogLines((prevLines) => [...prevLines, `\n[${new Date().toISOString().slice(11, 23)}] APP STILL IN BACKGROUND after 30s`]);
          }, 30000);
        }
      }

      if (nextAppState === 'active' && prev !== 'active') {
        setLogLines((prevLines) => [...prevLines, `\n[${ts}] APP STATE: ${prev} -> active`]);
        if (bgTaskTimeoutRef.current) {
          clearTimeout(bgTaskTimeoutRef.current);
          bgTaskTimeoutRef.current = null;
        }
        if (wentToRealBackgroundRef.current && isRunning) {
          wentToRealBackgroundRef.current = false;
          Alert.alert(
            'App Was Backgrounded',
            'The app was sent to background during the benchmark. If the benchmark stopped, iOS may have suspended execution.',
            [{ text: 'OK' }],
          );
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

    const memoryWarningListener = AppState.addEventListener('memoryWarning', () => {
      setLogLines((prev) => [...prev, '\nMEMORY WARNING DETECTED - Consider running smaller suites']);
      if (isRunning) {
        Alert.alert(
          'Low Memory Warning',
          'The device is running low on memory. The benchmark will continue but may crash. Consider cancelling.',
          [{ text: 'OK' }],
        );
      }
    });

    return () => {
      memoryWarningListener?.remove();
    };
  }, [isRunning]);

  // ── Heartbeat Timer ──────────────────────────────────────────────────
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [heartbeat, setHeartbeat] = useState(0);

  useEffect(() => {
    if (isRunning) {
      heartbeatRef.current = setInterval(() => {
        setHeartbeat((prev) => prev + 1);
      }, 5000);
    } else {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      setHeartbeat(0);
    }
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [isRunning]);

  // Auto-scroll
  useEffect(() => {
    if (logLines.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 50);
    }
  }, [logLines]);

  // ── Engine Callbacks ─────────────────────────────────────────────────
  const makeCallbacks = useCallback(
    (runningSuiteId?: QuerySuiteId): EngineCallbacks => ({
      onLog: (lines: string[]) => {
        setLogLines((prev) => [...prev, ...lines]);
      },
      onProgress: (progress: BenchmarkProgress) => {
        setStatusText(formatProgress(progress));
      },
      onResult: (result: TestResult) => {
        if (runningSuiteId) {
          const existing = suiteResultsRef.current[runningSuiteId];
          const updated: SuiteResult = existing
            ? { ...existing, results: [...existing.results, result] }
            : {
                suiteId: runningSuiteId as any,
                startedAt: new Date().toISOString(),
                results: [result],
                status: 'partial',
              };
          suiteResultsRef.current[runningSuiteId] = updated;
          setHasResults(true);
          saveSuiteResult(updated).catch(() => {});
        }
      },
    }),
    [],
  );

  // ── Run Single Suite ─────────────────────────────────────────────────
  const handleRunSuite = useCallback(
    async (suiteId: QuerySuiteId) => {
      if (isRunning) return;

      setIsRunning(true);
      resetQueryEngineState();

      try {
        const result = await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: true });
        setLogLines((prev) => [...prev, `Screen locked awake: keepAwake=${result?.keepAwake}`]);
      } catch (e: any) {
        setLogLines((prev) => [...prev, `Keep-awake FAILED: ${e.message}`]);
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      delete suiteResultsRef.current[suiteId];
      setSuiteStatuses((prev) => ({ ...prev, [suiteId]: 'running' }));
      setStatusText(`Running suite: ${suiteId}`);
      setLogLines((prev) => [...prev, `\n=== Starting ${suiteId} ===`]);

      try {
        const callbacks = makeCallbacks(suiteId);
        const result = await runQuerySuite(suiteId, callbacks, controller.signal);

        suiteResultsRef.current[suiteId] = result;
        await saveSuiteResult(result);

        setSuiteStatuses((prev) => ({
          ...prev,
          [suiteId]: result.status === 'complete' ? 'complete' : 'partial',
        }));
        setStatusText(
          result.status === 'complete'
            ? `Suite ${suiteId} complete`
            : `Suite ${suiteId} partial`,
        );
      } catch (error: any) {
        setSuiteStatuses((prev) => ({ ...prev, [suiteId]: 'partial' }));
        setStatusText(`Error: ${error.message}`);
        setLogLines((prev) => [...prev, `\nCRASH/ERROR in ${suiteId}: ${error.message}`]);
        Alert.alert('Benchmark Error', error.message, [{ text: 'OK' }]);
      } finally {
        setIsRunning(false);
        abortControllerRef.current = null;
        try {
          await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: false });
        } catch { /* non-fatal */ }
      }
    },
    [isRunning, makeCallbacks],
  );

  // ── Run All Suites ───────────────────────────────────────────────────
  const handleRunAll = useCallback(async () => {
    if (isRunning) return;

    setIsRunning(true);
    resetQueryEngineState();

    try {
      const result = await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: true });
      setLogLines((prev) => [...prev, `Screen locked awake: keepAwake=${result?.keepAwake}`]);
    } catch (e: any) {
      setLogLines((prev) => [...prev, `Keep-awake FAILED: ${e.message}`]);
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    suiteResultsRef.current = {};
    setSuiteStatuses(buildInitialStatuses);
    setStatusText('Starting all query suites...');

    try {
      for (const suite of QUERY_SUITE_DEFINITIONS) {
        if (controller.signal.aborted) break;

        const suiteId = suite.suiteId;
        setSuiteStatuses((prev) => ({ ...prev, [suiteId]: 'running' }));

        const callbacks = makeCallbacks(suiteId);
        const result = await runQuerySuite(suiteId, callbacks, controller.signal);

        suiteResultsRef.current[suiteId] = result;
        await saveSuiteResult(result);

        setSuiteStatuses((prev) => ({
          ...prev,
          [suiteId]: result.status === 'complete' ? 'complete' : 'partial',
        }));
      }

      if (!controller.signal.aborted) {
        setStatusText('All query suites complete');
      } else {
        setStatusText('Run cancelled');
      }
    } catch (error: any) {
      setStatusText(`Error: ${error.message}`);
      setLogLines((prev) => [...prev, `\nERROR: ${error.message}`]);
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
      try {
        await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: false });
      } catch { /* non-fatal */ }
    }
  }, [isRunning, makeCallbacks]);

  // ── Cancel ───────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setStatusText('Cancelling...');
  }, []);

  // ── Action Buttons ───────────────────────────────────────────────────
  const handleCopyLog = useCallback(async () => {
    const allResults = Object.values(suiteResultsRef.current).filter(
      Boolean,
    ) as SuiteResult[];
    let text: string;
    if (allResults.length > 0) {
      text = formatRawLog(allResults);
    } else {
      text = logLines.join('\n');
    }
    if (text.length === 0) {
      Alert.alert('Nothing to copy', 'Run a benchmark first.');
      return;
    }
    await copyToClipboard(text);
    Alert.alert('Copied', 'Log copied to clipboard (includes summary table).');
  }, [logLines]);

  const handleExportCSV = useCallback(async () => {
    const allResults = Object.values(suiteResultsRef.current).filter(
      Boolean,
    ) as SuiteResult[];
    if (allResults.length === 0) {
      Alert.alert('No results', 'Run a benchmark first.');
      return;
    }
    try {
      const csv = exportAsCSV(allResults);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const path = await saveExportFile(`query-benchmark-${timestamp}.csv`, csv);
      await copyToClipboard(csv);
      Alert.alert('CSV Exported', `Saved to: ${path}\n\nAlso copied to clipboard.`);
    } catch (error: any) {
      Alert.alert('Export Error', error.message);
    }
  }, []);

  const handleExportJSON = useCallback(async () => {
    const allResults = Object.values(suiteResultsRef.current).filter(
      Boolean,
    ) as SuiteResult[];
    if (allResults.length === 0) {
      Alert.alert('No results', 'Run a benchmark first.');
      return;
    }
    try {
      const json = exportAsJSON(allResults);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const path = await saveExportFile(`query-benchmark-${timestamp}.json`, json);
      Alert.alert('JSON Exported', `Saved to: ${path}`);
    } catch (error: any) {
      Alert.alert('Export Error', error.message);
    }
  }, []);

  const handleClear = useCallback(() => {
    setLogLines([]);
    setStatusText('Ready');
  }, []);

  const handleResetAll = useCallback(() => {
    Alert.alert(
      'Reset Query Results',
      'This will delete all saved query benchmark results from disk. Comprehensive benchmark results are NOT affected. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Query Results',
          style: 'destructive',
          onPress: async () => {
            // Only delete query suite results, not comprehensive benchmark results
            for (const suite of QUERY_SUITE_DEFINITIONS) {
              await deleteSuiteResult(suite.suiteId as any);
            }
            suiteResultsRef.current = {};
            setSuiteStatuses(buildInitialStatuses);
            setLogLines([]);
            setStatusText('Query results cleared');
            setHasResults(false);
          },
        },
      ],
    );
  }, []);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Query Scaling Benchmark</Text>
        <Text style={styles.subtitle}>
          Swift SDK vs C SDK | SELECT * LIMIT N | Scaling Test
        </Text>
      </View>

      {/* Suite Selector */}
      <View style={styles.suiteSelectorContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suiteSelector}
        >
          {QUERY_SUITE_DEFINITIONS.map((suite) => {
            const stats = getQuerySuiteStats(suite.suiteId);
            const status = suiteStatuses[suite.suiteId];
            return (
              <TouchableOpacity
                key={suite.suiteId}
                style={[
                  styles.suiteButton,
                  status === 'running' && styles.suiteButtonRunning,
                  status === 'complete' && styles.suiteButtonComplete,
                  status === 'partial' && styles.suiteButtonPartial,
                ]}
                onPress={() => handleRunSuite(suite.suiteId)}
                disabled={isRunning}
              >
                <Text
                  style={[
                    styles.suiteButtonLabel,
                    (status === 'running' || status === 'complete' || status === 'partial') &&
                      styles.suiteButtonLabelActive,
                  ]}
                >
                  {suite.label}
                </Text>
                <Text
                  style={[
                    styles.suiteButtonInfo,
                    (status === 'running' || status === 'complete' || status === 'partial') &&
                      styles.suiteButtonInfoActive,
                  ]}
                >
                  {stats.totalPermutations} tests ~{stats.estimatedMinutes}m
                </Text>
                <Text
                  style={[
                    styles.suiteButtonInfoSmall,
                    (status === 'running' || status === 'complete' || status === 'partial') &&
                      styles.suiteButtonInfoActive,
                  ]}
                >
                  {suite.feasibleCounts.map((c) => formatCount(c)).join(', ')}
                </Text>
                <Text
                  style={[
                    styles.suiteButtonStatus,
                    status === 'running' && styles.statusRunning,
                    status === 'complete' && styles.statusComplete,
                    status === 'partial' && styles.statusPartial,
                    status === 'not_started' && styles.statusNotStarted,
                  ]}
                >
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

      {/* Run All / Cancel */}
      <View style={styles.controlRow}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            styles.runAllButton,
            isRunning && styles.controlButtonDisabled,
          ]}
          onPress={handleRunAll}
          disabled={isRunning}
        >
          <Text style={styles.controlButtonText}>
            {isRunning ? 'Running...' : 'Run All Suites'}
          </Text>
        </TouchableOpacity>

        {isRunning && (
          <TouchableOpacity
            style={[styles.controlButton, styles.cancelButton]}
            onPress={handleCancel}
          >
            <Text style={styles.controlButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        {!isRunning && (
          <TouchableOpacity
            style={[styles.controlButton, styles.resetButton]}
            onPress={handleResetAll}
          >
            <Text style={styles.controlButtonText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status Text */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Status:</Text>
        <Text style={styles.statusValue} numberOfLines={2}>
          {statusText}{isRunning ? ` | alive ${heartbeat * 5}s` : ''}
        </Text>
      </View>

      {/* Raw Log Output */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.logContainer}
        contentContainerStyle={styles.logContent}
      >
        {logLines.length === 0 ? (
          <Text style={styles.logPlaceholder}>
            Tap a suite button or "Run All Suites" to start the query scaling
            benchmark.{'\n\n'}
            Each suite pre-populates documents (untimed), then times{'\n'}
            SELECT * FROM items LIMIT N{'\n'}
            where N = 100, 1K, 10K, or 100K.
          </Text>
        ) : (
          <Text style={styles.logText}>{logLines.join('\n')}</Text>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            logLines.length === 0 && !hasResults && styles.actionButtonDisabled,
          ]}
          onPress={handleCopyLog}
          disabled={logLines.length === 0 && !hasResults}
        >
          <Text style={styles.actionButtonText}>Copy Log</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={handleExportCSV}
        >
          <Text style={styles.actionButtonText}>CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={handleExportJSON}
        >
          <Text style={styles.actionButtonText}>JSON</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },

  header: {
    backgroundColor: '#0D47A1',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#B0BEC5',
  },

  suiteSelectorContainer: {
    marginTop: 12,
    marginHorizontal: 12,
  },
  suiteSelector: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  suiteButton: {
    width: 78,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suiteButtonRunning: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  suiteButtonComplete: {
    backgroundColor: '#4CAF50',
    borderColor: '#388E3C',
  },
  suiteButtonPartial: {
    backgroundColor: '#FF9800',
    borderColor: '#F57C00',
  },
  suiteButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 2,
  },
  suiteButtonLabelActive: {
    color: '#FFFFFF',
  },
  suiteButtonInfo: {
    fontSize: 9,
    color: '#888888',
    textAlign: 'center',
  },
  suiteButtonInfoSmall: {
    fontSize: 8,
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 1,
  },
  suiteButtonInfoActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  suiteButtonStatus: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  statusRunning: {
    color: '#FFFFFF',
  },
  statusComplete: {
    color: '#FFFFFF',
  },
  statusPartial: {
    color: '#FFFFFF',
  },
  statusNotStarted: {
    color: '#BBBBBB',
  },

  controlRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 12,
    gap: 8,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runAllButton: {
    backgroundColor: '#0D47A1',
    flex: 2,
  },
  cancelButton: {
    backgroundColor: '#D32F2F',
    flex: 1,
  },
  resetButton: {
    backgroundColor: '#78909C',
    flex: 1,
  },
  controlButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D47A1',
    marginRight: 8,
  },
  statusValue: {
    flex: 1,
    fontSize: 11,
    color: '#37474F',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  logContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  logContent: {
    padding: 12,
  },
  logText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#263238',
    lineHeight: 16,
  },
  logPlaceholder: {
    fontSize: 13,
    color: '#90A4AE',
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: 40,
  },

  actionRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: Platform.OS === 'ios' ? 30 : 12,
    gap: 6,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#0D47A1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: '#5C6BC0',
  },
  actionButtonClear: {
    backgroundColor: '#78909C',
  },
  actionButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
