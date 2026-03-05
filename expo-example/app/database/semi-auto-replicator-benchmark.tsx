import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import NativeCblSwiftModule from '../../../src/specs/NativeCblSwift';
import NativeCblCModule from '../../../src/specs/NativeCblC';
import {
  DEFAULT_ENDPOINT,
  DEFAULT_USERNAME,
  DEFAULT_PASSWORD,
  DEFAULT_SCOPE,
  MAX_TOTAL_BYTES,
  SIZE_OPTIONS,
  COUNT_OPTIONS,
  TYPE_OPTIONS,
  makeRunId,
  getDbName,
  clock,
  dropDb,
  serverCleanup,
  buildSteps,
  executeStep,
} from '../../lib/benchmark/replicator-shared';
import type {
  OperationType,
  StepDef,
  StepStatus,
  TimedResult,
  ExecCtx,
} from '../../lib/benchmark/replicator-shared';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SizeResult {
  size: number;
  iter1?: { swift?: TimedResult; c?: TimedResult };
  iter2?: { swift?: TimedResult; c?: TimedResult };
  done: boolean;
}

// Human-readable byte formatter
function fmtBytes(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} GB`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(0)} MB`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)} KB`;
  return `${n} B`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown Component
// ─────────────────────────────────────────────────────────────────────────────

function Dropdown<T extends string | number>({
  label, value, options, onChange, disabled,
}: {
  label: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <View style={dd.wrap}>
      <Text style={dd.label}>{label}</Text>
      <TouchableOpacity
        style={[dd.btn, disabled && dd.btnDisabled]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        <Text style={dd.val} numberOfLines={1}>{selected?.label ?? '—'}</Text>
        <Text style={dd.arrow}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={dd.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={dd.sheet}>
            <Text style={dd.sheetTitle}>{label}</Text>
            {options.map(opt => (
              <TouchableOpacity
                key={String(opt.value)}
                style={[dd.opt, opt.value === value && dd.optActive]}
                onPress={() => { onChange(opt.value); setOpen(false); }}
              >
                <Text style={[dd.optTxt, opt.value === value && dd.optTxtActive]}>{opt.label}</Text>
                {opt.value === value && <Text style={dd.check}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SemiAutoReplicatorBenchmark() {
  // ── Connection config ──────────────────────────────────────────────────────
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [scope,    setScope]    = useState(DEFAULT_SCOPE);

  // ── Test config ────────────────────────────────────────────────────────────
  const [selectedCount, setSelectedCount] = useState(100);
  const [selectedType,  setSelectedType]  = useState<OperationType>('push_create');

  // ── Automation state ───────────────────────────────────────────────────────
  const [isAutoRunning,    setIsAutoRunning]    = useState(false);
  const [currentSizeIdx,   setCurrentSizeIdx]   = useState(0);
  const [currentIteration, setCurrentIteration] = useState(1);
  const [activeSlot,       setActiveSlot]       = useState<1 | 2>(1);
  const [currentStepIdx,   setCurrentStepIdx]   = useState(0);
  const [stepStatuses,     setStepStatuses]     = useState<StepStatus[]>([]);
  const [stepNotes,        setStepNotes]        = useState<Record<number, string>>({});
  const [currentSteps,     setCurrentSteps]     = useState<StepDef[]>([]);
  const [runId,            setRunId]            = useState(() => makeRunId());
  const [logLines,         setLogLines]         = useState<string[]>([]);
  const [sizeResults,      setSizeResults]      = useState<SizeResult[]>([]);
  const [isComplete,       setIsComplete]       = useState(false);
  const [hasFailed,        setHasFailed]        = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const abortRef    = useRef(false);
  const swiftDbRef  = useRef<string | null>(null);
  const cDbRef      = useRef<string | null>(null);
  const failedAtRef = useRef<{ sizeIdx: number; iteration: 1 | 2 } | null>(null);
  const logScrollRef = useRef<ScrollView>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const swiftFirst = currentIteration % 2 !== 0; // odd → Swift first
  const currentSize = SIZE_OPTIONS[currentSizeIdx]?.value ?? 100;

  // All count options shown; large-size runs clamp at runtime.
  const availableCountOptions = COUNT_OPTIONS;

  // Pre-compute skip status + total bytes for every size (used in config table + pills)
  const sizeCountMatrix = SIZE_OPTIONS.map(sizeOpt => {
    const totalBytes = selectedCount * sizeOpt.value;
    const willSkip   = totalBytes > MAX_TOTAL_BYTES;
    return { size: sizeOpt.value, label: sizeOpt.label, willSkip, totalBytes };
  });

  // ── Auto-scroll log ────────────────────────────────────────────────────────
  useEffect(() => {
    if (logLines.length > 0) {
      setTimeout(() => logScrollRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [logLines]);

  const addLog = useCallback((msg: string) => {
    setLogLines(prev => [...prev, msg]);
  }, []);

  // ── Clear all DBs + server (all sizes, both slots) ────────────────────────
  const clearAllDbsAndServer = useCallback(async (log: (m: string) => void) => {
    log(`\n[${clock()}] ♻ Clearing ALL local DBs and server collections (all sizes, both slots)...`);
    if (swiftDbRef.current) {
      try { await NativeCblSwiftModule!.database_Close({ name: swiftDbRef.current }); } catch { /* ok */ }
      swiftDbRef.current = null;
    }
    if (cDbRef.current) {
      try { await NativeCblCModule!.database_Close({ name: cDbRef.current }); } catch { /* ok */ }
      cDbRef.current = null;
    }
    for (const sizeOpt of SIZE_OPTIONS) {
      for (const suffix of ['', '_2']) {
        const sw = getDbName(sizeOpt.value, 'swift') + suffix;
        const cc = getDbName(sizeOpt.value, 'c') + suffix;
        await dropDb(NativeCblSwiftModule!, sw);
        await dropDb(NativeCblCModule!, cc);
        log(`  Deleted local: ${sw}, ${cc}`);
      }
    }
    // Clean both base and _2 server collections for every size.
    for (const sizeOpt of SIZE_OPTIONS) {
      for (const suffix of ['', '_2']) {
        const sw = getDbName(sizeOpt.value, 'swift') + suffix;
        const cc = getDbName(sizeOpt.value, 'c') + suffix;
        await serverCleanup(NativeCblSwiftModule!, endpoint, username, password, scope, sw, log);
        await serverCleanup(NativeCblSwiftModule!, endpoint, username, password, scope, cc, log);
      }
    }
    log(`\n✅ All cleared.`);
  }, [endpoint, username, password, scope]);

  // ── Shared loop (called by fresh start and retry) ─────────────────────────
  const runLoop = useCallback(async (
    startSizeIdx: number,
    startIteration: 1 | 2,
    capturedCount: number,
    capturedType: OperationType,
    capturedEp: string,
    capturedUser: string,
    capturedPass: string,
    capturedScope: string,
  ) => {
    for (let sizeIdx = startSizeIdx; sizeIdx < SIZE_OPTIONS.length; sizeIdx++) {
      if (abortRef.current) break;

      const sizeOpt = SIZE_OPTIONS[sizeIdx];
      const size    = sizeOpt.value;

      setCurrentSizeIdx(sizeIdx);

      if (capturedCount * size > MAX_TOTAL_BYTES) {
        addLog(`\n⏭ Skipping ${sizeOpt.label} — ${capturedCount.toLocaleString()} docs × ${sizeOpt.label} = ${fmtBytes(capturedCount * size)} > 1 GB`);
        continue;
      }

      addLog(`\n${'─'.repeat(52)}`);
      addLog(`SIZE: ${sizeOpt.label}  (${sizeIdx + 1}/${SIZE_OPTIONS.length}) · ${capturedCount.toLocaleString()} docs`);
      addLog(`${'─'.repeat(52)}`);

      setSizeResults(prev => {
        const existing = prev.find(r => r.size === size);
        if (existing) return prev;
        return [...prev, { size, done: false }];
      });

      // For the first size in a retry we may start at iter 2; afterwards always start at iter 1.
      const iterStart: 1 | 2 = sizeIdx === startSizeIdx ? startIteration : 1;

      for (const iteration of ([1, 2] as const).filter(i => i >= iterStart)) {
        if (abortRef.current) break;

        const slot: 1 | 2    = iteration;
        const isSwiftFirst   = iteration % 2 !== 0;
        const newRunId       = makeRunId();

        setCurrentIteration(iteration);
        setActiveSlot(slot);
        setRunId(newRunId);

        const steps = buildSteps(capturedType, isSwiftFirst);
        setCurrentSteps(steps);
        setStepStatuses(steps.map((_, i) => (i === 0 ? 'ready' : 'locked') as StepStatus));
        setCurrentStepIdx(0);
        setStepNotes({});

        addLog(
          `\n${'·'.repeat(48)}\n` +
          `Iter ${iteration}/2 · Slot ${slot} · ${isSwiftFirst ? '🔵 Swift First' : '🟠 C First'} · RunID: ${newRunId}\n` +
          `${'·'.repeat(48)}`,
        );

        const swiftDbForIter   = getDbName(size, 'swift') + (slot === 2 ? '_2' : '');
        const cDbForIter       = getDbName(size, 'c')     + (slot === 2 ? '_2' : '');
        // Use the same _2 suffix for server collections as for local DBs so each
        // iteration writes to its own distinct Sync Gateway collection.
        const swiftCollForIter = getDbName(size, 'swift') + (slot === 2 ? '_2' : '');
        const cCollForIter     = getDbName(size, 'c')     + (slot === 2 ? '_2' : '');

        for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
          if (abortRef.current) break;

          const step = steps[stepIdx];

          await new Promise(r => setTimeout(r, 500));
          if (abortRef.current) break;

          setCurrentStepIdx(stepIdx);
          setStepStatuses(prev => {
            const n = [...prev]; n[stepIdx] = 'running'; return n;
          });

          const ctx: ExecCtx = {
            ep: capturedEp, user: capturedUser, pass: capturedPass,
            scope: capturedScope,
            swiftColl: swiftCollForIter,
            cColl: cCollForIter,
            swiftFirst: isSwiftFirst,
            size, count: capturedCount, testType: capturedType,
            swiftDb: swiftDbForIter, cDb: cDbForIter,
            runId: newRunId,
            swiftRef: swiftDbRef, cRef: cDbRef,
            log: addLog,
          };

          try {
            const result = await executeStep(step.id, ctx);

            if (result.timedResult) {
              const { sdk, timeMs, opsCount } = result.timedResult;
              const note = `${timeMs.toFixed(0)}ms · ${opsCount} docs`;
              setStepNotes(prev => ({ ...prev, [stepIdx]: note }));

              setSizeResults(prev => prev.map(r => {
                if (r.size !== size) return r;
                const iterKey = iteration === 1 ? 'iter1' : 'iter2';
                const iterData = r[iterKey] ?? {};
                return { ...r, [iterKey]: { ...iterData, [sdk]: { timeMs, opsCount } } };
              }));
            }

            setStepStatuses(prev => {
              const n = [...prev];
              n[stepIdx] = 'done';
              if (stepIdx + 1 < n.length) n[stepIdx + 1] = 'ready';
              return n;
            });
            setCurrentStepIdx(stepIdx + 1);

          } catch (err: any) {
            addLog(`\n❌ Step "${step.label}" failed: ${err.message}`);
            setStepStatuses(prev => {
              const n = [...prev]; n[stepIdx] = 'error'; return n;
            });
            // Save failure point so the retry button can resume here.
            failedAtRef.current = { sizeIdx, iteration };
            setHasFailed(true);
            abortRef.current = true;
            break;
          }
        }

        if (abortRef.current) break;
        addLog(`\n✅ Iteration ${iteration}/2 for ${sizeOpt.label} complete.`);
      }

      if (abortRef.current) break;

      addLog(`\n[${clock()}] Both iterations for ${sizeOpt.label} done. Running full cleanup...`);
      try {
        await clearAllDbsAndServer(addLog);
      } catch (err: any) {
        addLog(`\n⚠️ Cleanup error: ${err.message} — continuing to next size.`);
      }

      setSizeResults(prev => prev.map(r => r.size === size ? { ...r, done: true } : r));
      addLog(`\n✅ Size ${sizeOpt.label} COMPLETE.`);
    }
  }, [addLog, clearAllDbsAndServer]);

  // ── Main automation loop — fresh start ─────────────────────────────────────
  const handleStartRun = useCallback(async () => {
    if (!NativeCblSwiftModule || !NativeCblCModule) {
      Alert.alert('Error', 'Native modules not available.');
      return;
    }

    abortRef.current  = false;
    failedAtRef.current = null;
    setHasFailed(false);
    setIsAutoRunning(true);
    setIsComplete(false);
    setSizeResults([]);
    setLogLines([]);

    const capturedCount = selectedCount;
    const capturedType  = selectedType;
    const capturedEp    = endpoint;
    const capturedUser  = username;
    const capturedPass  = password;
    const capturedScope = scope;

    try { await NativeCblSwiftModule.setKeepScreenAwake({ enabled: true }); } catch { /* ok */ }

    const skippedLabels = SIZE_OPTIONS
      .filter(s => capturedCount * s.value > MAX_TOTAL_BYTES)
      .map(s => s.label);

    addLog(`${'═'.repeat(52)}`);
    addLog(`Semi-Auto Replicator Benchmark`);
    addLog(`Type: ${TYPE_OPTIONS.find(o => o.value === capturedType)?.label}`);
    addLog(`Count: ${capturedCount.toLocaleString()} docs`);
    addLog(`Sizes: ${SIZE_OPTIONS.map(s => s.label).join(' → ')}`);
    if (skippedLabels.length > 0) addLog(`Skipped (> 1 GB): ${skippedLabels.join(', ')}`);
    addLog(`${'═'.repeat(52)}`);

    await runLoop(0, 1, capturedCount, capturedType, capturedEp, capturedUser, capturedPass, capturedScope);

    try { await NativeCblSwiftModule.setKeepScreenAwake({ enabled: false }); } catch { /* ok */ }

    if (!abortRef.current) {
      setIsComplete(true);
      const ranCount  = SIZE_OPTIONS.filter(s => capturedCount * s.value <= MAX_TOTAL_BYTES).length;
      const skipCount = SIZE_OPTIONS.length - ranCount;
      addLog(`\n${'═'.repeat(52)}`);
      addLog(`🎉 Run complete! ${ranCount} size${ranCount !== 1 ? 's' : ''} ran${skipCount > 0 ? `, ${skipCount} skipped (> 1 GB)` : ''}.`);
      addLog(`${'═'.repeat(52)}`);
    } else if (!hasFailed) {
      addLog(`\n⏹ Run stopped by user.`);
    }

    setIsAutoRunning(false);
  }, [selectedCount, selectedType, endpoint, username, password, scope, addLog, runLoop, hasFailed]);

  // ── Retry from the failed iteration ────────────────────────────────────────
  const handleRetryIteration = useCallback(async () => {
    const resumeFrom = failedAtRef.current;
    if (!resumeFrom || !NativeCblSwiftModule || !NativeCblCModule) return;

    abortRef.current = false;
    setHasFailed(false);
    setIsAutoRunning(true);
    setIsComplete(false);

    const capturedCount = selectedCount;
    const capturedType  = selectedType;
    const capturedEp    = endpoint;
    const capturedUser  = username;
    const capturedPass  = password;
    const capturedScope = scope;

    try { await NativeCblSwiftModule.setKeepScreenAwake({ enabled: true }); } catch { /* ok */ }

    const sizeLabel = SIZE_OPTIONS[resumeFrom.sizeIdx]?.label ?? `#${resumeFrom.sizeIdx}`;
    addLog(`\n${'═'.repeat(52)}`);
    addLog(`↩ Retrying from ${sizeLabel} · Iter ${resumeFrom.iteration}/2`);
    addLog(`${'═'.repeat(52)}`);

    await runLoop(
      resumeFrom.sizeIdx,
      resumeFrom.iteration,
      capturedCount, capturedType, capturedEp, capturedUser, capturedPass, capturedScope,
    );

    try { await NativeCblSwiftModule.setKeepScreenAwake({ enabled: false }); } catch { /* ok */ }

    if (!abortRef.current) {
      setIsComplete(true);
      const ranCount  = SIZE_OPTIONS.filter(s => capturedCount * s.value <= MAX_TOTAL_BYTES).length;
      const skipCount = SIZE_OPTIONS.length - ranCount;
      addLog(`\n${'═'.repeat(52)}`);
      addLog(`🎉 Run complete! ${ranCount} size${ranCount !== 1 ? 's' : ''} ran${skipCount > 0 ? `, ${skipCount} skipped (> 1 GB)` : ''}.`);
      addLog(`${'═'.repeat(52)}`);
    } else if (!hasFailed) {
      addLog(`\n⏹ Run stopped by user.`);
    }

    setIsAutoRunning(false);
  }, [selectedCount, selectedType, endpoint, username, password, scope, addLog, runLoop, hasFailed]);

  // ── Stop handler ───────────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    abortRef.current = true;
    addLog(`\n[${clock()}] ⏹ Stop requested — will halt after current step.`);
  }, [addLog]);

  // ── Copy log ───────────────────────────────────────────────────────────────
  const handleCopyLog = useCallback(async () => {
    if (logLines.length === 0) return;
    await Clipboard.setStringAsync(logLines.join('\n'));
    Alert.alert('Copied', 'Log output copied to clipboard.');
  }, [logLines]);

  // ── Copy results as CSV ────────────────────────────────────────────────────
  const handleCopyResults = useCallback(async () => {
    if (sizeResults.length === 0) return;
    const header = 'Size,Iter1-Swift(ms),Iter1-C(ms),Iter2-Swift(ms),Iter2-C(ms),Avg-Swift(ms),Avg-C(ms),Delta%';
    const rows = sizeResults.map(r => {
      const i1s = r.iter1?.swift?.timeMs;
      const i1c = r.iter1?.c?.timeMs;
      const i2s = r.iter2?.swift?.timeMs;
      const i2c = r.iter2?.c?.timeMs;
      const avgSw = i1s != null && i2s != null ? ((i1s + i2s) / 2).toFixed(0) : '';
      const avgC  = i1c != null && i2c != null ? ((i1c + i2c) / 2).toFixed(0) : '';
      const delta = avgSw !== '' && avgC !== ''
        ? (((Number(avgSw) - Number(avgC)) / Number(avgC)) * 100).toFixed(1) + '%'
        : '';
      const sizeLabel = SIZE_OPTIONS.find(s => s.value === r.size)?.label ?? String(r.size);
      return `${sizeLabel},${i1s?.toFixed(0) ?? ''},${i1c?.toFixed(0) ?? ''},${i2s?.toFixed(0) ?? ''},${i2c?.toFixed(0) ?? ''},${avgSw},${avgC},${delta}`;
    });
    await Clipboard.setStringAsync([header, ...rows].join('\n'));
    Alert.alert('Copied', 'Results copied as CSV.');
  }, [sizeResults]);

  // ── Step badge ─────────────────────────────────────────────────────────────
  const renderBadge = (step: StepDef) => {
    if (step.isHelper) return <Text style={[s.badge, s.badgeHelper]}>⚙</Text>;
    if (step.sdk === 'swift') return <Text style={[s.badge, s.badgeSwift]}>S</Text>;
    if (step.sdk === 'c') return <Text style={[s.badge, s.badgeC]}>C</Text>;
    return null;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={s.screen} keyboardShouldPersistTaps="handled">

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.title}>Semi-Auto Replicator Benchmark</Text>
        <Text style={s.subtitle}>
          Auto-runs all 5 sizes · 2 iterations each · 500ms step delay
        </Text>
      </View>

      {/* ── Connection Config ── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Sync Gateway Connection</Text>
        {[
          { label: 'Endpoint', value: endpoint, setter: setEndpoint, placeholder: 'wss://...' },
          { label: 'Username', value: username, setter: setUsername },
          { label: 'Password', value: password, setter: setPassword, secure: true },
          { label: 'Scope',    value: scope,    setter: setScope },
        ].map(f => (
          <View key={f.label} style={s.cfgRow}>
            <Text style={s.cfgLbl}>{f.label}</Text>
            <TextInput
              style={[s.cfgInput, isAutoRunning && s.cfgInputOff]}
              value={f.value}
              onChangeText={f.setter}
              editable={!isAutoRunning}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={(f as any).secure}
              selectTextOnFocus
              placeholder={(f as any).placeholder}
            />
          </View>
        ))}
      </View>

      {/* ── Test Configuration ── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Test Configuration</Text>
        <Dropdown
          label="Doc Count"
          value={selectedCount}
          options={availableCountOptions}
          onChange={v => setSelectedCount(v)}
          disabled={isAutoRunning}
        />
        <Dropdown
          label="Test Type"
          value={selectedType}
          options={TYPE_OPTIONS}
          onChange={v => setSelectedType(v)}
          disabled={isAutoRunning}
        />

        {/* Size × Count preview table */}
        <View style={s.matrixWrap}>
          <Text style={s.matrixTitle}>Doc Sizes × Effective Count</Text>
          <View style={s.matrixHeader}>
            <Text style={[s.mCell, s.mHead, s.mSize]}>Size</Text>
            <Text style={[s.mCell, s.mHead, s.mCount]}>Docs</Text>
            <Text style={[s.mCell, s.mHead, s.mTotal]}>Total</Text>
          </View>
          {sizeCountMatrix.map(row => (
            <View key={row.size} style={[s.matrixRow, row.willSkip && s.matrixRowSkip]}>
              <Text style={[s.mCell, s.mSize, s.mBold, row.willSkip && s.mSkipTxt]}>
                {row.label}
              </Text>
              <Text style={[s.mCell, s.mCount, row.willSkip && s.mSkipTxt]}>
                {row.willSkip ? '⏭ SKIP' : selectedCount.toLocaleString()}
              </Text>
              <Text style={[s.mCell, s.mTotal, row.willSkip && s.mSkipTxt]}>
                {row.willSkip ? fmtBytes(row.totalBytes) : fmtBytes(row.totalBytes)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Start / Stop / Retry ── */}
      <View style={s.card}>
        {!isAutoRunning ? (
          <Pressable style={({ pressed }) => [s.btn, s.btnStart, pressed && s.btnPressed]} onPress={handleStartRun}>
            <Text style={s.btnTxt}>▶ Start Full Automated Run</Text>
          </Pressable>
        ) : (
          <Pressable style={({ pressed }) => [s.btn, s.btnStop, pressed && s.btnPressed]} onPress={handleStop}>
            <Text style={s.btnTxt}>⏹ Stop After Current Step</Text>
          </Pressable>
        )}

        {/* Retry button — shown when a step failed and we're not running */}
        {hasFailed && !isAutoRunning && failedAtRef.current && (
          <View style={s.retryWrap}>
            <View style={s.retryBanner}>
              <Text style={s.retryBannerTxt}>
                ❌ Failed at {SIZE_OPTIONS[failedAtRef.current.sizeIdx]?.label} · Iter {failedAtRef.current.iteration}/2
              </Text>
            </View>
            <View style={s.retryRow}>
              <Pressable style={({ pressed }) => [s.btn, s.btnRetry, { flex: 1 }, pressed && s.btnPressed]} onPress={handleRetryIteration}>
                <Text style={s.btnTxt}>↩ Retry from Iter {failedAtRef.current.iteration}/2</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.btn, s.btnDismiss, pressed && s.btnPressed]}
                onPress={() => { failedAtRef.current = null; setHasFailed(false); }}
              >
                <Text style={s.btnTxt}>✕</Text>
              </Pressable>
            </View>
          </View>
        )}

        {isComplete && (() => {
          const ranCount  = SIZE_OPTIONS.filter(o => selectedCount * o.value <= MAX_TOTAL_BYTES).length;
          const skipCount = SIZE_OPTIONS.length - ranCount;
          return (
            <View style={s.completeBanner}>
              <Text style={s.completeTxt}>
                🎉 Done! {ranCount} size{ranCount !== 1 ? 's' : ''} ran
                {skipCount > 0 ? ` · ${skipCount} skipped (> 1 GB)` : ''}
              </Text>
            </View>
          );
        })()}
      </View>

      {/* ── Run Overview ── */}
      {(isAutoRunning || sizeResults.length > 0) && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Run Overview</Text>

          {/* Size progress pills */}
          <View style={s.sizePills}>
            {SIZE_OPTIONS.map((sizeOpt, idx) => {
              const willSkip  = selectedCount * sizeOpt.value > MAX_TOTAL_BYTES;
              const result    = sizeResults.find(r => r.size === sizeOpt.value);
              const isDone    = result?.done ?? false;
              const isRunning = isAutoRunning && idx === currentSizeIdx && !isDone && !willSkip;
              const isPending = !isDone && !isRunning && !willSkip;
              return (
                <View
                  key={sizeOpt.value}
                  style={[
                    s.sizePill,
                    isDone    && s.sizePillDone,
                    isRunning && s.sizePillRunning,
                    willSkip  && s.sizePillSkip,
                    isPending && !isAutoRunning && s.sizePillIdle,
                  ]}
                >
                  <Text style={[
                    s.sizePillTxt,
                    isDone   && s.sizePillTxtDone,
                    isRunning && s.sizePillTxtRunning,
                    willSkip  && s.sizePillTxtSkip,
                  ]}>
                    {isDone ? '✓ ' : isRunning ? '⏳ ' : willSkip ? '⏭ ' : ''}{sizeOpt.label}
                  </Text>
                  <Text style={[s.sizePillSub, isDone && s.sizePillSubDone, willSkip && s.sizePillSubSkip]}>
                    {willSkip
                      ? `> 1 GB`
                      : isDone || isRunning
                        ? `${selectedCount.toLocaleString()} docs`
                        : `${selectedCount.toLocaleString()} docs`
                    }
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Iteration tracker for the active size */}
          {(isAutoRunning || sizeResults.length > 0) && (() => {
            const activeSizeOpt = SIZE_OPTIONS[currentSizeIdx];
            const activeResult  = sizeResults.find(r => r.size === activeSizeOpt?.value);
            const iter1Done     = activeResult?.iter1?.swift != null && activeResult?.iter1?.c != null;
            const iter2Done     = activeResult?.iter2?.swift != null && activeResult?.iter2?.c != null;
            const iter1Running  = isAutoRunning && currentIteration === 1 && !iter1Done;
            const iter2Running  = isAutoRunning && currentIteration === 2 && !iter2Done;

            return (
              <View style={s.iterTrack}>
                <Text style={s.iterTrackTitle}>
                  {activeSizeOpt?.label ?? '—'} · {TYPE_OPTIONS.find(o => o.value === selectedType)?.label}
                </Text>
                <View style={s.iterBoxRow}>
                  {/* Iteration 1 */}
                  <View style={[s.iterBox, iter1Done && s.iterBoxDone, iter1Running && s.iterBoxRunning]}>
                    <Text style={[s.iterBoxLabel, iter1Done && s.iterBoxLabelDone, iter1Running && s.iterBoxLabelRun]}>
                      {iter1Done ? '✓ ' : iter1Running ? '⏳ ' : '○ '}Iter 1 · Slot 1
                    </Text>
                    <Text style={s.iterBoxSub}>🔵 Swift First</Text>
                    {iter1Done && activeResult?.iter1 && (
                      <View style={s.iterTimings}>
                        {activeResult.iter1.swift && (
                          <Text style={s.iterTiming}>S: {activeResult.iter1.swift.timeMs.toFixed(0)}ms</Text>
                        )}
                        {activeResult.iter1.c && (
                          <Text style={[s.iterTiming, s.iterTimingC]}>C: {activeResult.iter1.c.timeMs.toFixed(0)}ms</Text>
                        )}
                      </View>
                    )}
                  </View>

                  <Text style={s.iterArrow}>→</Text>

                  {/* Iteration 2 */}
                  <View style={[s.iterBox, iter2Done && s.iterBoxDone, iter2Running && s.iterBoxRunning]}>
                    <Text style={[s.iterBoxLabel, iter2Done && s.iterBoxLabelDone, iter2Running && s.iterBoxLabelRun]}>
                      {iter2Done ? '✓ ' : iter2Running ? '⏳ ' : '○ '}Iter 2 · Slot 2
                    </Text>
                    <Text style={s.iterBoxSub}>🟠 C First</Text>
                    {iter2Done && activeResult?.iter2 && (
                      <View style={s.iterTimings}>
                        {activeResult.iter2.swift && (
                          <Text style={s.iterTiming}>S: {activeResult.iter2.swift.timeMs.toFixed(0)}ms</Text>
                        )}
                        {activeResult.iter2.c && (
                          <Text style={[s.iterTiming, s.iterTimingC]}>C: {activeResult.iter2.c.timeMs.toFixed(0)}ms</Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>

                {/* Active step callout */}
                {isAutoRunning && currentSteps.length > 0 && (
                  <View style={[s.activeStepBox, swiftFirst ? s.activeStepBoxSw : s.activeStepBoxC]}>
                    <Text style={s.activeStepLabel}>
                      Step {Math.min(currentStepIdx + 1, currentSteps.length)}/{currentSteps.length}
                    </Text>
                    <Text style={s.activeStepName} numberOfLines={1}>
                      {currentSteps[currentStepIdx]?.label ?? currentSteps[currentStepIdx - 1]?.label ?? '—'}
                    </Text>
                    <Text style={s.activeStepRunId}>RunID: {runId}</Text>
                  </View>
                )}
              </View>
            );
          })()}
        </View>
      )}

      {/* ── Live Step List ── */}
      {(isAutoRunning || currentSteps.length > 0) && (
        <View style={s.card}>
          <Text style={s.cardTitle}>
            Current Steps · {currentSteps.length > 0
              ? `${SIZE_OPTIONS[currentSizeIdx]?.label} · Iter ${currentIteration}/2`
              : '—'}
          </Text>
          {currentSteps.map((step, idx) => {
            const status   = stepStatuses[idx] ?? 'locked';
            const note     = stepNotes[idx];
            const isDone   = status === 'done';
            const isError  = status === 'error';
            const isExec   = status === 'running';
            const isLocked = status === 'locked';

            return (
              <View
                key={`${step.id}-${idx}`}
                style={[
                  s.step,
                  isDone  && s.stepDone,
                  isError && s.stepError,
                  isExec  && s.stepExec,
                  isLocked && s.stepLocked,
                  step.isTimed && isExec && s.stepTimed,
                ]}
              >
                <View style={s.stepLeft}>
                  <View style={[s.numBadge, isDone && s.numBadgeDone, isError && s.numBadgeErr]}>
                    <Text style={[s.numTxt, (isDone || isError) && s.numTxtWhite]}>
                      {isDone ? '✓' : isError ? '✗' : idx + 1}
                    </Text>
                  </View>
                  {renderBadge(step)}
                </View>
                <View style={s.stepMid}>
                  <Text style={[s.stepLbl, isLocked && s.stepLblLocked, isDone && s.stepLblDone]} numberOfLines={2}>
                    {isExec ? '⏳ ' : ''}{step.label}
                  </Text>
                  {note && <Text style={s.stepNote}>{note}</Text>}
                </View>
                <Text style={[
                  s.stepStatus,
                  isDone  && s.stepStatusDone,
                  isError && s.stepStatusErr,
                  isExec  && s.stepStatusExec,
                ]}>
                  {isExec ? '…' : isDone ? 'Done' : isError ? 'Err' : isLocked ? '○' : '▶'}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Results Table ── */}
      {sizeResults.length > 0 && (
        <View style={s.card}>
          <View style={s.resultsHeader}>
            <Text style={s.cardTitle}>Results</Text>
            <Pressable onPress={handleCopyResults} hitSlop={8}>
              <Text style={s.copyBtn}>Copy CSV</Text>
            </Pressable>
          </View>

          {/* Scrollable results table */}
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              {/* Header row */}
              <View style={s.tableRow}>
                <Text style={[s.tCell, s.tHead, s.tSize]}>Size</Text>
                <Text style={[s.tCell, s.tHead]}>I1-Swift</Text>
                <Text style={[s.tCell, s.tHead]}>I1-C</Text>
                <Text style={[s.tCell, s.tHead]}>I2-Swift</Text>
                <Text style={[s.tCell, s.tHead]}>I2-C</Text>
                <Text style={[s.tCell, s.tHead]}>Avg-Sw</Text>
                <Text style={[s.tCell, s.tHead]}>Avg-C</Text>
                <Text style={[s.tCell, s.tHead]}>Δ%</Text>
              </View>

              {sizeResults.map(r => {
                const i1s = r.iter1?.swift?.timeMs;
                const i1c = r.iter1?.c?.timeMs;
                const i2s = r.iter2?.swift?.timeMs;
                const i2c = r.iter2?.c?.timeMs;
                const avgSw  = i1s != null && i2s != null ? (i1s + i2s) / 2 : undefined;
                const avgC   = i1c != null && i2c != null ? (i1c + i2c) / 2 : undefined;
                const delta  = avgSw != null && avgC != null
                  ? ((avgSw - avgC) / avgC * 100).toFixed(1) + '%'
                  : '—';
                const deltaColor = avgSw != null && avgC != null
                  ? avgSw < avgC ? '#1B5E20' : '#B71C1C'
                  : '#888';
                const sizeLabel = SIZE_OPTIONS.find(s => s.value === r.size)?.label ?? String(r.size);
                const isCurrent = !r.done && isAutoRunning && SIZE_OPTIONS[currentSizeIdx]?.value === r.size;

                return (
                  <View key={r.size} style={[s.tableRow, isCurrent && s.tableRowActive, r.done && s.tableRowDone]}>
                    <Text style={[s.tCell, s.tSize, s.tBold]}>{sizeLabel}</Text>
                    <Text style={s.tCell}>{i1s != null ? i1s.toFixed(0) : '—'}</Text>
                    <Text style={s.tCell}>{i1c != null ? i1c.toFixed(0) : '—'}</Text>
                    <Text style={s.tCell}>{i2s != null ? i2s.toFixed(0) : '—'}</Text>
                    <Text style={s.tCell}>{i2c != null ? i2c.toFixed(0) : '—'}</Text>
                    <Text style={[s.tCell, s.tSwift]}>{avgSw != null ? avgSw.toFixed(0) : '—'}</Text>
                    <Text style={[s.tCell, s.tC]}>{avgC  != null ? avgC.toFixed(0) : '—'}</Text>
                    <Text style={[s.tCell, { color: deltaColor, fontWeight: '700' }]}>{delta}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── Log Panel ── */}
      <View style={s.card}>
        <View style={s.logHeader}>
          <Text style={s.cardTitle}>Log Output</Text>
          <View style={s.logActions}>
            <Pressable onPress={handleCopyLog} disabled={logLines.length === 0} hitSlop={8}>
              <Text style={[s.logAction, logLines.length === 0 && s.logActionDisabled]}>Copy</Text>
            </Pressable>
            <Pressable onPress={() => setLogLines([])} hitSlop={8}>
              <Text style={s.logAction}>Clear</Text>
            </Pressable>
          </View>
        </View>
        <ScrollView
          ref={logScrollRef}
          style={s.log}
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          {logLines.length === 0
            ? <Text style={s.logEmpty}>No output yet — press Start above.</Text>
            : <Text style={s.logTxt}>{logLines.join('\n')}</Text>
          }
        </ScrollView>
      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown Styles
// ─────────────────────────────────────────────────────────────────────────────

const dd = StyleSheet.create({
  wrap:        { marginTop: 8 },
  label:       { fontSize: 11, fontWeight: '600', color: '#555', marginBottom: 3 },
  btn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#D0D0D0', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FAFAFA' },
  btnDisabled: { backgroundColor: '#EEEEEE', borderColor: '#E0E0E0' },
  val:         { fontSize: 13, color: '#333', flex: 1 },
  arrow:       { fontSize: 14, color: '#888', marginLeft: 8 },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 30 },
  sheet:       { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden' },
  sheetTitle:  { fontSize: 14, fontWeight: '700', color: '#333', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  opt:         { paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  optActive:   { backgroundColor: '#E8F5E9' },
  optTxt:      { fontSize: 14, color: '#333' },
  optTxtActive:{ color: '#1B5E20', fontWeight: '600' },
  check:       { fontSize: 14, color: '#1B5E20' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: '#ECEFF1' },

  header:      { backgroundColor: '#1A237E', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20 },
  title:       { fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  subtitle:    { fontSize: 12, color: '#9FA8DA' },

  card:        { backgroundColor: '#FFF', marginHorizontal: 12, marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: '#DDE', padding: 12 },
  cardTitle:   { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8 },

  cfgRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  cfgLbl:      { width: 76, fontSize: 12, fontWeight: '600', color: '#555' },
  cfgInput:         { flex: 1, borderWidth: 1, borderColor: '#D0D0D0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, fontSize: 12, color: '#333', backgroundColor: '#FAFAFA', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  cfgInputOff:      { backgroundColor: '#EEE', color: '#999' },

  btn:         { paddingVertical: 15, borderRadius: 8, alignItems: 'center' },
  btnStart:    { backgroundColor: '#1B5E20' },
  btnStop:     { backgroundColor: '#B71C1C' },
  btnOff:      { opacity: 0.45 },
  btnPressed:  { opacity: 0.75 },
  btnTxt:      { color: '#FFF', fontSize: 15, fontWeight: '800' },

  completeBanner: { alignItems: 'center', paddingVertical: 12, backgroundColor: '#E8F5E9', borderRadius: 8, marginTop: 10 },
  completeTxt:    { fontSize: 16, fontWeight: '700', color: '#1B5E20' },

  retryWrap:    { marginTop: 10 },
  retryBanner:  { backgroundColor: '#FFEBEE', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 6 },
  retryBannerTxt:{ fontSize: 13, fontWeight: '700', color: '#B71C1C' },
  retryRow:     { flexDirection: 'row', gap: 8 },
  btnRetry:     { backgroundColor: '#E65100' },
  btnDismiss:   { backgroundColor: '#546E7A', paddingHorizontal: 16, flex: 0 },

  // Size × Count preview matrix
  matrixWrap:   { marginTop: 12, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10 },
  matrixTitle:  { fontSize: 11, fontWeight: '700', color: '#555', marginBottom: 6 },
  matrixHeader: { flexDirection: 'row', paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#EEE', marginBottom: 2 },
  matrixRow:     { flexDirection: 'row', paddingVertical: 4, borderRadius: 4 },
  matrixRowSkip: { backgroundColor: '#F5F5F5' },
  mCell:         { fontSize: 12, color: '#333', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  mHead:         { fontWeight: '700', color: '#555', fontFamily: undefined, fontSize: 11 },
  mSize:         { flex: 1 },
  mCount:        { width: 110, textAlign: 'right' },
  mTotal:        { width: 80, textAlign: 'right' },
  mBold:         { fontWeight: '700' },
  mSkipTxt:      { color: '#BDBDBD', textDecorationLine: 'line-through' },

  // Run overview — size pills
  sizePills:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  sizePill:           { flex: 1, minWidth: 58, borderRadius: 8, borderWidth: 1, borderColor: '#CFD8DC', backgroundColor: '#ECEFF1', paddingVertical: 6, paddingHorizontal: 6, alignItems: 'center' },
  sizePillDone:       { borderColor: '#A5D6A7', backgroundColor: '#E8F5E9' },
  sizePillRunning:    { borderColor: '#90CAF9', backgroundColor: '#E3F2FD', borderWidth: 2 },
  sizePillSkip:       { borderColor: '#E0E0E0', backgroundColor: '#F5F5F5', opacity: 0.6 },
  sizePillIdle:       { opacity: 0.55 },
  sizePillTxt:        { fontSize: 11, fontWeight: '700', color: '#546E7A', textAlign: 'center' },
  sizePillTxtDone:    { color: '#2E7D32' },
  sizePillTxtRunning: { color: '#1565C0' },
  sizePillTxtSkip:    { color: '#BDBDBD', textDecorationLine: 'line-through' },
  sizePillSub:        { fontSize: 9, color: '#888', marginTop: 2, textAlign: 'center' },
  sizePillSubDone:    { color: '#388E3C' },
  sizePillSubSkip:    { color: '#BDBDBD' },

  // Run overview — iteration tracker
  iterTrack:      { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10 },
  iterTrackTitle: { fontSize: 12, fontWeight: '700', color: '#333', marginBottom: 8 },
  iterBoxRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iterBox:        { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#CFD8DC', backgroundColor: '#F5F5F5', padding: 8 },
  iterBoxDone:    { borderColor: '#A5D6A7', backgroundColor: '#F1F8E9' },
  iterBoxRunning: { borderColor: '#90CAF9', backgroundColor: '#E3F2FD', borderWidth: 2 },
  iterBoxLabel:   { fontSize: 12, fontWeight: '700', color: '#546E7A' },
  iterBoxLabelDone:{ color: '#2E7D32' },
  iterBoxLabelRun: { color: '#1565C0' },
  iterBoxSub:     { fontSize: 10, color: '#888', marginTop: 2 },
  iterTimings:    { flexDirection: 'row', gap: 6, marginTop: 4 },
  iterTiming:     { fontSize: 10, fontWeight: '700', color: '#1565C0', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  iterTimingC:    { color: '#E65100' },
  iterArrow:      { fontSize: 18, color: '#90A4AE', fontWeight: '700' },

  activeStepBox:    { marginTop: 10, borderRadius: 8, padding: 10 },
  activeStepBoxSw:  { backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#90CAF9' },
  activeStepBoxC:   { backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFCC80' },
  activeStepLabel:  { fontSize: 10, fontWeight: '700', color: '#888', marginBottom: 2 },
  activeStepName:   { fontSize: 13, fontWeight: '700', color: '#1A237E' },
  activeStepRunId:  { fontSize: 10, color: '#888', marginTop: 3, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // Steps
  step:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 4, backgroundColor: '#FAFAFA' },
  stepTimed:   { borderColor: '#E65100', backgroundColor: '#FFF3E0', borderWidth: 2 },
  stepDone:    { borderColor: '#A5D6A7', backgroundColor: '#F9FFF9' },
  stepError:   { borderColor: '#EF9A9A', backgroundColor: '#FFF5F5' },
  stepExec:    { borderColor: '#FFA000', backgroundColor: '#FFFDE7' },
  stepLocked:  { opacity: 0.35 },

  stepLeft:    { flexDirection: 'row', alignItems: 'center', width: 48 },
  numBadge:    { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center' },
  numBadgeDone:{ backgroundColor: '#4CAF50' },
  numBadgeErr: { backgroundColor: '#E53935' },
  numTxt:      { fontSize: 10, fontWeight: '700', color: '#666' },
  numTxtWhite: { color: '#FFF' },

  badge:       { marginLeft: 4, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, fontSize: 9, fontWeight: '800', overflow: 'hidden' },
  badgeSwift:  { backgroundColor: '#1565C0', color: '#FFF' },
  badgeC:      { backgroundColor: '#E65100', color: '#FFF' },
  badgeHelper: { backgroundColor: '#546E7A', color: '#FFF' },

  stepMid:     { flex: 1, marginLeft: 8 },
  stepLbl:     { fontSize: 12, color: '#333', lineHeight: 17 },
  stepLblLocked:{ color: '#AAAAAA' },
  stepLblDone: { color: '#777' },
  stepNote:    { fontSize: 11, color: '#1B5E20', fontWeight: '700', marginTop: 2 },

  stepStatus:      { fontSize: 11, color: '#CCC', textAlign: 'right', minWidth: 36 },
  stepStatusDone:  { color: '#4CAF50', fontWeight: '600' },
  stepStatusErr:   { color: '#E53935', fontWeight: '700' },
  stepStatusExec:  { color: '#FFA000', fontWeight: '700' },

  // Results table
  resultsHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  copyBtn:        { fontSize: 12, color: '#1565C0', fontWeight: '600' },
  tableRow:       { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tableRowActive: { backgroundColor: '#E3F2FD' },
  tableRowDone:   { backgroundColor: '#F9FFF9' },
  tCell:          { width: 76, fontSize: 11, color: '#333', textAlign: 'right', paddingHorizontal: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  tSize:          { width: 72, textAlign: 'left', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  tHead:          { fontWeight: '700', color: '#555', fontFamily: undefined },
  tBold:          { fontWeight: '700' },
  tSwift:         { color: '#1565C0', fontWeight: '600' },
  tC:             { color: '#E65100', fontWeight: '600' },

  // Log
  logHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  logActions:       { flexDirection: 'row', gap: 14 },
  logAction:        { fontSize: 12, color: '#1565C0', fontWeight: '600' },
  logActionDisabled:{ opacity: 0.35 },
  log:              { height: 280, backgroundColor: '#F8FAFB', borderRadius: 6, padding: 8 },
  logEmpty:         { fontSize: 12, color: '#AAAAAA', textAlign: 'center', paddingVertical: 20 },
  logTxt:           { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#263238', lineHeight: 16 },
});
