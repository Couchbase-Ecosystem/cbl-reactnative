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
  SuiteId,
  SuiteResult,
  TestResult,
  BenchmarkProgress,
  EngineCallbacks,
} from '../../lib/benchmark/types';

import {
  SUITE_DEFINITIONS,
  getSuiteStats,
  formatPermutation,
} from '../../lib/benchmark/matrix';

import {
  runSuite,
  resetEngineState,
} from '../../lib/benchmark/engine';

import {
  exportAsCSV,
  exportAsJSON,
  formatRawLog,
  saveExportFile,
  copyToClipboard,
  saveSuiteResult,
  loadSuiteResults,
  deleteAllResults,
} from '../../lib/benchmark/export';

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
  const permLabel = formatPermutation(p.currentPermutation);
  const phaseLabel = p.phase === 'warmup' ? 'warmup' : `Iter ${p.currentIteration}/${p.totalIterations}`;
  const opDone = p.currentOperation ? ` | ${p.currentOperation}` : '';
  const elapsed = formatElapsed(p.elapsedMs);
  return `Test ${p.currentTest}/${p.totalTests} | ${permLabel} | ${phaseLabel}${opDone} | ${elapsed}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial Suite Statuses
// ─────────────────────────────────────────────────────────────────────────────

function buildInitialStatuses(): Record<SuiteId, SuiteStatus> {
  return {
    suite_100b: 'not_started',
    suite_1kb: 'not_started',
    suite_10kb: 'not_started',
    suite_100kb: 'not_started',
    suite_1mb: 'not_started',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ComprehensiveBenchmark() {
  // ── State ────────────────────────────────────────────────────────────
  const [suiteStatuses, setSuiteStatuses] = useState<
    Record<SuiteId, SuiteStatus>
  >(buildInitialStatuses);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [statusText, setStatusText] = useState('Ready');
  const [isRunning, setIsRunning] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const suiteResultsRef = useRef<Partial<Record<SuiteId, SuiteResult>>>({});

  // ── Load saved results on mount ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      const saved = await loadSuiteResults();
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

  // ── AppState Monitoring (background/foreground transitions) ──────────
  // iOS app states:
  //   "active"   = app is in foreground, receiving events
  //   "inactive" = brief interruption (notification banner, Control Center, etc.) -- HARMLESS
  //   "background" = app is fully backgrounded -- DANGEROUS, iOS may suspend
  const appStateRef = useRef(AppState.currentState);
  const bgTaskTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wentToRealBackgroundRef = useRef(false);

  useEffect(() => {
    const stateListener = AppState.addEventListener('change', (nextAppState) => {
      const prev = appStateRef.current;
      const ts = new Date().toISOString().slice(11, 23);

      if (nextAppState === 'inactive' && prev === 'active') {
        // Brief interruption (notification, Control Center, system dialog) -- harmless
        // Just log it quietly, no alert needed
        setLogLines((prevLines) => [...prevLines, `\n[${ts}] APP STATE: active → inactive (notification/overlay -- harmless)`]);
      }

      if (nextAppState === 'background') {
        // App actually went to background -- this is dangerous
        wentToRealBackgroundRef.current = true;
        const msg = `\n🔴 [${ts}] APP STATE: ${prev} → background (app fully backgrounded! iOS may suspend)`;
        console.warn(msg);
        setLogLines((prevLines) => [...prevLines, msg]);

        if (isRunning) {
          bgTaskTimeoutRef.current = setTimeout(() => {
            const warnMsg = `\n🔴 [${new Date().toISOString().slice(11, 23)}] APP STILL IN BACKGROUND after 30s - iOS will suspend`;
            setLogLines((prevLines) => [...prevLines, warnMsg]);
          }, 30000);
        }
      }

      if (nextAppState === 'active' && prev !== 'active') {
        // App returned to foreground
        const msg = `\n✅ [${ts}] APP STATE: ${prev} → active (returned to foreground)`;
        setLogLines((prevLines) => [...prevLines, msg]);

        // Clear the background watchdog
        if (bgTaskTimeoutRef.current) {
          clearTimeout(bgTaskTimeoutRef.current);
          bgTaskTimeoutRef.current = null;
        }

        // Only show alert if the app went to real "background" state (not just "inactive")
        if (wentToRealBackgroundRef.current && isRunning) {
          wentToRealBackgroundRef.current = false;
          Alert.alert(
            'App Was Backgrounded',
            'The app was sent to background during the benchmark. If the benchmark stopped, iOS may have suspended execution. You can re-run the test.',
            [{ text: 'OK' }]
          );
        }
        wentToRealBackgroundRef.current = false;
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      stateListener?.remove();
      if (bgTaskTimeoutRef.current) {
        clearTimeout(bgTaskTimeoutRef.current);
      }
    };
  }, [isRunning]);

  // ── Memory Warning Detection (iOS) ────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    
    const memoryWarningListener = AppState.addEventListener('memoryWarning', () => {
      setLogLines((prev) => [...prev, '\n⚠️  MEMORY WARNING DETECTED - Consider running smaller suites']);
      if (isRunning) {
        Alert.alert(
          'Low Memory Warning',
          'The device is running low on memory. The benchmark will continue but may crash. Consider cancelling and running smaller suites.',
          [{ text: 'OK' }]
        );
      }
    });

    return () => {
      memoryWarningListener?.remove();
    };
  }, [isRunning]);

  // ── Heartbeat Timer (keeps UI active so iOS doesn't consider app idle) ─
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [heartbeat, setHeartbeat] = useState(0);

  useEffect(() => {
    if (isRunning) {
      // Tick every 5 seconds to keep the main thread's RunLoop active
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

  // Auto-scroll when log updates (only happens during cooldowns)
  useEffect(() => {
    if (logLines.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 50);
    }
  }, [logLines]);

  // ── Engine Callbacks (zero-UI contract: called only during cooldowns) ─
  const makeCallbacks = useCallback(
    (runningSuiteId?: SuiteId): EngineCallbacks => ({
      onLog: (lines: string[]) => {
        setLogLines((prev) => [...prev, ...lines]);
      },
      onProgress: (progress: BenchmarkProgress) => {
        setStatusText(formatProgress(progress));
      },
      onResult: (result: TestResult) => {
        // Update the running suite result incrementally
        if (runningSuiteId) {
          const existing = suiteResultsRef.current[runningSuiteId];
          const updated: SuiteResult = existing
            ? { ...existing, results: [...existing.results, result] }
            : {
                suiteId: runningSuiteId,
                startedAt: new Date().toISOString(),
                results: [result],
                status: 'partial',
              };
          suiteResultsRef.current[runningSuiteId] = updated;
          setHasResults(true);
          // Persist to disk (fire and forget)
          saveSuiteResult(updated).catch(() => {});
        }
      },
    }),
    [],
  );

  // ── Run Single Suite ─────────────────────────────────────────────────
  const handleRunSuite = useCallback(
    async (suiteId: SuiteId) => {
      if (isRunning) return;

      setIsRunning(true);
      resetEngineState();

      // Keep screen awake using native idle timer control (most reliable method)
      try {
        const result = await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: true });
        setLogLines((prev) => [...prev, `🔒 Native idle timer disabled: keepAwake=${result?.keepAwake} (screen will stay on)`]);
      } catch (e: any) {
        setLogLines((prev) => [...prev, `⚠️ Native keep-awake FAILED: ${e.message}`]);
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Clear old results for this suite to prevent corruption on re-run
      delete suiteResultsRef.current[suiteId];
      setSuiteStatuses((prev) => ({ ...prev, [suiteId]: 'running' }));
      setStatusText(`Running suite: ${suiteId}`);
      setLogLines((prev) => [...prev, `\n=== Starting ${suiteId} ===`]);

      try {
        const callbacks = makeCallbacks(suiteId);
        const result = await runSuite(suiteId, callbacks, controller.signal);

        suiteResultsRef.current[suiteId] = result;
        await saveSuiteResult(result);

        setSuiteStatuses((prev) => ({
          ...prev,
          [suiteId]: result.status === 'complete' ? 'complete' : 'partial',
        }));
        setStatusText(
          result.status === 'complete'
            ? `Suite ${suiteId} complete`
            : `Suite ${suiteId} partial (cancelled or error)`,
        );
      } catch (error: any) {
        setSuiteStatuses((prev) => ({ ...prev, [suiteId]: 'partial' }));
        const errorMsg = `CRASH/ERROR in ${suiteId}: ${error.message}\nStack: ${error.stack || 'No stack'}`;
        setStatusText(`Error: ${error.message}`);
        setLogLines((prev) => [...prev, `\n${errorMsg}`]);
        
        Alert.alert(
          'Benchmark Error',
          `The benchmark crashed or errored:\n\n${error.message}\n\nCheck the log for details.`,
          [{ text: 'OK' }]
        );
      } finally {
        setIsRunning(false);
        abortControllerRef.current = null;
        // Re-enable the idle timer (allow screen to lock again)
        try {
          await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: false });
          setLogLines((prev) => [...prev, '🔓 Native idle timer re-enabled (screen can lock)']);
        } catch (e) {
          // Non-fatal
        }
      }
    },
    [isRunning, makeCallbacks],
  );

  // ── Run All Suites ───────────────────────────────────────────────────
  const handleRunAll = useCallback(async () => {
    if (isRunning) return;

    setIsRunning(true);
    resetEngineState();

    // Keep screen awake using native idle timer control (most reliable method)
    try {
      const result = await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: true });
      setLogLines((prev) => [...prev, `🔒 Native idle timer disabled: keepAwake=${result?.keepAwake} (screen will stay on)`]);
    } catch (e: any) {
      setLogLines((prev) => [...prev, `⚠️ Native keep-awake FAILED: ${e.message}`]);
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Clear all old results and statuses to prevent corruption on re-run
    suiteResultsRef.current = {};
    setSuiteStatuses(buildInitialStatuses);
    setStatusText('Starting all suites...');

    try {
      for (const suite of SUITE_DEFINITIONS) {
        if (controller.signal.aborted) break;

        const suiteId = suite.suiteId;
        setSuiteStatuses((prev) => ({ ...prev, [suiteId]: 'running' }));

        const callbacks = makeCallbacks(suiteId);
        const result = await runSuite(suiteId, callbacks, controller.signal);

        suiteResultsRef.current[suiteId] = result;
        await saveSuiteResult(result);

        setSuiteStatuses((prev) => ({
          ...prev,
          [suiteId]: result.status === 'complete' ? 'complete' : 'partial',
        }));
      }

      if (!controller.signal.aborted) {
        setStatusText('All suites complete');
      } else {
        setStatusText('Run cancelled');
      }
    } catch (error: any) {
      setStatusText(`Error: ${error.message}`);
      setLogLines((prev) => [...prev, `\nERROR: ${error.message}`]);
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
      // Re-enable the idle timer (allow screen to lock again)
      try {
        await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: false });
        setLogLines((prev) => [...prev, '🔓 Native idle timer re-enabled (screen can lock)']);
      } catch (e) {
        // Non-fatal
      }
    }
  }, [isRunning, makeCallbacks]);

  // ── Cancel ───────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setStatusText('Cancelling... (finishing current lifecycle)');
  }, []);

  // ── Action Buttons ───────────────────────────────────────────────────
  const handleCopyLog = useCallback(async () => {
    // Prefer structured results if available (includes summary table)
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
      const path = await saveExportFile(
        `benchmark-${timestamp}.csv`,
        csv,
      );
      await copyToClipboard(csv);
      Alert.alert(
        'CSV Exported',
        `Saved to: ${path}\n\nAlso copied to clipboard.`,
      );
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
      const path = await saveExportFile(
        `benchmark-${timestamp}.json`,
        json,
      );
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
      'Reset All Results',
      'This will delete all saved benchmark results from disk. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await deleteAllResults();
            suiteResultsRef.current = {};
            setSuiteStatuses(buildInitialStatuses);
            setLogLines([]);
            setStatusText('All results cleared');
            setHasResults(false);
          },
        },
      ],
    );
  }, []);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* 1. Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Comprehensive Benchmark</Text>
        <Text style={styles.subtitle}>
          Swift SDK vs C SDK | Nested Documents | Lifecycle Testing
        </Text>
      </View>

      {/* 2. Suite Selector */}
      <View style={styles.suiteSelectorContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suiteSelector}
        >
          {SUITE_DEFINITIONS.map((suite) => {
            const stats = getSuiteStats(suite.suiteId);
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
                    (status === 'running' ||
                      status === 'complete' ||
                      status === 'partial') &&
                      styles.suiteButtonLabelActive,
                  ]}
                >
                  {suite.label}
                </Text>
                <Text
                  style={[
                    styles.suiteButtonInfo,
                    (status === 'running' ||
                      status === 'complete' ||
                      status === 'partial') &&
                      styles.suiteButtonInfoActive,
                  ]}
                >
                  {stats.totalPermutations} tests ~{stats.estimatedMinutes}m
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

      {/* 3 & 4. Run All / Cancel */}
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

      {/* 5. Status Text */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Status:</Text>
        <Text style={styles.statusValue} numberOfLines={2}>
          {statusText}{isRunning ? ` | alive ${heartbeat * 5}s` : ''}
        </Text>
      </View>

      {/* 6. Raw Log Output */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.logContainer}
        contentContainerStyle={styles.logContent}
      >
        {logLines.length === 0 ? (
          <Text style={styles.logPlaceholder}>
            Tap a suite button or "Run All Suites" to start benchmarking.{'\n\n'}
            Each suite runs independently. If the app crashes, completed suite
            results are preserved on disk. Re-run only the suite that failed.
          </Text>
        ) : (
          <Text style={styles.logText}>{logLines.join('\n')}</Text>
        )}
      </ScrollView>

      {/* 7. Action Buttons */}
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

  // ── Header ───────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#1A237E',
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

  // ── Suite Selector ───────────────────────────────────────────────────
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
    width: 72,
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

  // ── Control Row ──────────────────────────────────────────────────────
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
    backgroundColor: '#1A237E',
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

  // ── Status ───────────────────────────────────────────────────────────
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E8EAF6',
    borderRadius: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A237E',
    marginRight: 8,
  },
  statusValue: {
    flex: 1,
    fontSize: 11,
    color: '#37474F',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // ── Log Viewer ───────────────────────────────────────────────────────
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

  // ── Action Buttons ───────────────────────────────────────────────────
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
    backgroundColor: '#1A237E',
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
