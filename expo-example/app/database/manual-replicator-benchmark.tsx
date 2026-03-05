import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import NativeCblSwiftModule from '../../../src/specs/NativeCblSwift';
import NativeCblCModule from '../../../src/specs/NativeCblC';
import {
  DEFAULT_ENDPOINT,
  DEFAULT_USERNAME,
  DEFAULT_PASSWORD,
  DEFAULT_SCOPE,
  TOTAL_ITERATIONS,
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
  IterationResult,
  ExecCtx,
} from '../../lib/benchmark/replicator-shared';

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

export default function ManualReplicatorBenchmark() {
  // ── Connection config ──────────────────────────────────────────────────────
  const [endpoint,   setEndpoint]   = useState(DEFAULT_ENDPOINT);
  const [username,   setUsername]   = useState(DEFAULT_USERNAME);
  const [password,   setPassword]   = useState(DEFAULT_PASSWORD);
  const [scope,      setScope]      = useState(DEFAULT_SCOPE);

  // ── Test config ────────────────────────────────────────────────────────────
  const [selectedSize,  setSelectedSize]  = useState(100);
  const [selectedCount, setSelectedCount] = useState(100);
  const [selectedType,  setSelectedType]  = useState<OperationType>('push_create');

  // ── Run state ──────────────────────────────────────────────────────────────
  const [currentIteration, setCurrentIteration] = useState(1);
  const [currentStepIdx,   setCurrentStepIdx]   = useState(0);
  const [stepStatuses,     setStepStatuses]     = useState<StepStatus[]>([]);
  const [stepNotes,        setStepNotes]        = useState<Record<number, string>>({});
  const [isRunning,        setIsRunning]        = useState(false);
  const [runId,            setRunId]            = useState(() => makeRunId());
  const [iterResults,      setIterResults]      = useState<IterationResult[]>([]);
  const [logLines,         setLogLines]         = useState<string[]>([]);
  const [activeSlot,       setActiveSlot]       = useState<1 | 2>(1);
  const [isCleaningSlot,   setIsCleaningSlot]   = useState<0 | 1 | 2>(0);
  const [independentMode,  setIndependentMode]  = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const swiftDbRef = useRef<string | null>(null);
  const cDbRef     = useRef<string | null>(null);
  const logScrollRef = useRef<ScrollView>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const swiftFirst  = currentIteration % 2 !== 0;     // odd → Swift first
  const slotSuffix  = activeSlot === 2 ? '_2' : '';
  const swiftDb     = getDbName(selectedSize, 'swift') + slotSuffix;
  const cDb         = getDbName(selectedSize, 'c')     + slotSuffix;
  const swiftColl   = getDbName(selectedSize, 'swift') + slotSuffix; // bench_${size}_swift[_2]
  const cColl       = getDbName(selectedSize, 'c')     + slotSuffix; // bench_${size}_c[_2]
  const steps      = useMemo(() => buildSteps(selectedType, swiftFirst), [selectedType, swiftFirst]);
  const allDone    = currentStepIdx >= steps.length;

  // ── Count options filtered to stay within 1 GB total ────────────────────────
  const availableCountOptions = useMemo(
    () => COUNT_OPTIONS.filter(o => selectedSize * o.value <= MAX_TOTAL_BYTES),
    [selectedSize],
  );

  // ── Reset steps when steps array changes (type or iteration changes) ───────
  useEffect(() => {
    setStepStatuses(steps.map((_, i) => (i === 0 ? 'ready' : 'locked') as StepStatus));
    setCurrentStepIdx(0);
    setStepNotes({});
  }, [steps]);

  // ── Also reset when size/count changes (they don't affect step definitions) ─
  useEffect(() => {
    setStepStatuses(steps.map((_, i) => (i === 0 ? 'ready' : 'locked') as StepStatus));
    setCurrentStepIdx(0);
    setStepNotes({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSize, selectedCount]);

  // ── Clamp selectedCount when size change makes it unavailable ───────────────
  useEffect(() => {
    if (selectedSize * selectedCount > MAX_TOTAL_BYTES) {
      const largest = availableCountOptions[availableCountOptions.length - 1];
      if (largest) setSelectedCount(largest.value);
    }
  }, [selectedSize, availableCountOptions, selectedCount]);

  // ── Auto-scroll log ────────────────────────────────────────────────────────
  useEffect(() => {
    if (logLines.length > 0) {
      setTimeout(() => logScrollRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [logLines]);

  const addLog = useCallback((msg: string) => {
    setLogLines(prev => [...prev, msg]);
  }, []);

  const resetSteps = useCallback(() => {
    setStepStatuses(steps.map((_, i) => (i === 0 ? 'ready' : 'locked') as StepStatus));
    setCurrentStepIdx(0);
    setStepNotes({});
  }, [steps]);

  // ── Config change guards ───────────────────────────────────────────────────
  const guardedChange = useCallback(<T,>(
    setter: (v: T) => void,
    clearResults = false,
  ) => (v: T) => {
    if (currentStepIdx > 0) {
      Alert.alert('Reset Progress?', 'Changing config will reset current step progress.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change & Reset',
          onPress: () => {
            setter(v);
            if (clearResults) setIterResults([]);
          },
        },
      ]);
    } else {
      setter(v);
      if (clearResults) setIterResults([]);
    }
  }, [currentStepIdx]);

  // ── Step press handler ─────────────────────────────────────────────────────
  const handleStepPress = useCallback(async (stepIdx: number) => {
    if (isRunning) return;
    if (!independentMode && stepIdx !== currentStepIdx) return;
    const step = steps[stepIdx];
    if (!step) return;

    if (!NativeCblSwiftModule || !NativeCblCModule) {
      Alert.alert('Error', 'Native modules not available.');
      return;
    }

    setIsRunning(true);
    setStepStatuses(prev => {
      const n = [...prev]; n[stepIdx] = 'running'; return n;
    });

    try {
      await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: true });
    } catch { /* ok */ }

    const ctx: ExecCtx = {
      ep: endpoint, user: username, pass: password,
      scope, swiftColl, cColl, swiftFirst,
      size: selectedSize, count: selectedCount, testType: selectedType,
      swiftDb, cDb, runId,
      swiftRef: swiftDbRef, cRef: cDbRef,
      log: addLog,
    };

    try {
      const result = await executeStep(step.id, ctx);

      if (result.timedResult) {
        const { sdk, timeMs, opsCount } = result.timedResult;
        const note = `${timeMs.toFixed(0)}ms · ${opsCount} docs`;
        setStepNotes(prev => ({ ...prev, [stepIdx]: note }));
        setIterResults(prev => {
          const existing = prev.find(r => r.iteration === currentIteration);
          const updated: IterationResult = existing
            ? { ...existing, [sdk]: { timeMs, opsCount } }
            : { iteration: currentIteration, swiftFirst, runId, [sdk]: { timeMs, opsCount } };
          return existing
            ? prev.map(r => r.iteration === currentIteration ? updated : r)
            : [...prev, updated];
        });
      }

      setStepStatuses(prev => {
        const n = [...prev];
        n[stepIdx] = 'done';
        if (stepIdx + 1 < n.length) n[stepIdx + 1] = 'ready';
        return n;
      });
      setCurrentStepIdx(stepIdx + 1);

      if (stepIdx + 1 >= steps.length) {
        addLog(`\n✅ Iteration ${currentIteration}/${TOTAL_ITERATIONS} complete!`);
        if (currentIteration >= TOTAL_ITERATIONS) {
          addLog(`🎉 All ${TOTAL_ITERATIONS} iterations done!`);
        }
      }
    } catch (err: any) {
      addLog(`\n❌ "${step.label}" failed: ${err.message}`);
      setStepStatuses(prev => {
        const n = [...prev]; n[stepIdx] = 'error'; return n;
      });
    } finally {
      setIsRunning(false);
      try { await NativeCblSwiftModule?.setKeepScreenAwake({ enabled: false }); } catch { /* ok */ }
    }
  }, [
    isRunning, independentMode, currentStepIdx, steps, endpoint, username, password,
    scope, swiftColl, cColl, swiftFirst, selectedSize, selectedCount, selectedType,
    swiftDb, cDb, runId, currentIteration, addLog,
  ]);

  // ── Next iteration ─────────────────────────────────────────────────────────
  const handleNextIteration = useCallback(() => {
    if (currentIteration >= TOTAL_ITERATIONS) return;
    const nextIter = currentIteration + 1;
    const newRunId = makeRunId();
    const nextSwiftFirst = nextIter % 2 !== 0;
    setCurrentIteration(nextIter);
    setRunId(newRunId);
    addLog(
      `\n${'─'.repeat(48)}\n` +
      `Iteration ${nextIter}/${TOTAL_ITERATIONS}  ` +
      `[${nextSwiftFirst ? '🔵 Swift First' : '🟠 C First'}]  RunID: ${newRunId}\n` +
      `${'─'.repeat(48)}`,
    );
    // stepStatuses reset via useEffect when `steps` changes (swiftFirst changed)
  }, [currentIteration, addLog]);

  // ── Clear all DBs + server ─────────────────────────────────────────────────
  const handleClearAll = useCallback(async () => {
    if (isRunning || isCleaningSlot !== 0) return;
    if (!NativeCblSwiftModule || !NativeCblCModule) {
      Alert.alert('Error', 'Native modules not available.');
      return;
    }
    setIsRunning(true);
    addLog(`\n[${clock()}] ♻ Clearing all local DBs and server collections (all sizes)...`);
    try {
      if (swiftDbRef.current) {
        try { await NativeCblSwiftModule.database_Close({ name: swiftDbRef.current }); } catch { /* ok */ }
        swiftDbRef.current = null;
      }
      if (cDbRef.current) {
        try { await NativeCblCModule.database_Close({ name: cDbRef.current }); } catch { /* ok */ }
        cDbRef.current = null;
      }
      // Drop every local bench DB variant — both slots
      for (const sizeOpt of SIZE_OPTIONS) {
        for (const suffix of ['', '_2']) {
          const sw = getDbName(sizeOpt.value, 'swift') + suffix;
          const cc = getDbName(sizeOpt.value, 'c') + suffix;
          await dropDb(NativeCblSwiftModule!, sw);
          await dropDb(NativeCblCModule!, cc);
          addLog(`  Deleted local DBs: ${sw}, ${cc}`);
        }
      }
      // Clean every size/slot variant on the server — continue even if one collection fails
      const serverErrors: string[] = [];
      for (const sizeOpt of SIZE_OPTIONS) {
        for (const suffix of ['', '_2']) {
          const sw = getDbName(sizeOpt.value, 'swift') + suffix;
          const cc = getDbName(sizeOpt.value, 'c') + suffix;
          try {
            await serverCleanup(NativeCblSwiftModule!, endpoint, username, password, scope, sw, addLog);
          } catch (e: any) {
            const msg = `${sw}: ${e?.message ?? e}`;
            serverErrors.push(msg);
            addLog(`  ⚠ Server cleanup skipped for ${sw}: ${e?.message ?? e}`);
          }
          try {
            await serverCleanup(NativeCblSwiftModule!, endpoint, username, password, scope, cc, addLog);
          } catch (e: any) {
            const msg = `${cc}: ${e?.message ?? e}`;
            serverErrors.push(msg);
            addLog(`  ⚠ Server cleanup skipped for ${cc}: ${e?.message ?? e}`);
          }
        }
      }
      if (serverErrors.length > 0) {
        addLog(`\n⚠ ${serverErrors.length} server collection(s) could not be cleaned (may not exist on server).`);
      }
      addLog(`\n✅ All cleared. Ready for the next run.`);
      resetSteps();
    } catch (err: any) {
      addLog(`\n❌ Clear failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, endpoint, username, password, scope, addLog, resetSteps]);

  // ── Clear a single slot (runs in background — does NOT set isRunning) ───────
  const handleClearSlot = useCallback(async (slot: 1 | 2) => {
    if (isCleaningSlot !== 0) {
      Alert.alert('Busy', `Slot ${isCleaningSlot} is already being cleared. Wait until it finishes.`);
      return;
    }
    if (isRunning && activeSlot === slot) {
      Alert.alert('Busy', 'Cannot clear the active slot while a step is running.');
      return;
    }
    if (!NativeCblSwiftModule || !NativeCblCModule) {
      Alert.alert('Error', 'Native modules not available.');
      return;
    }
    const suffix = slot === 2 ? '_2' : '';
    setIsCleaningSlot(slot);
    addLog(`\n[${clock()}] ♻ Clearing Slot ${slot} (local + server, all sizes)…`);
    try {
      // Close open DB handles only if they belong to the slot being cleared
      if (slot === activeSlot) {
        if (swiftDbRef.current) {
          try { await NativeCblSwiftModule.database_Close({ name: swiftDbRef.current }); } catch { /* ok */ }
          swiftDbRef.current = null;
        }
        if (cDbRef.current) {
          try { await NativeCblCModule.database_Close({ name: cDbRef.current }); } catch { /* ok */ }
          cDbRef.current = null;
        }
      }
      for (const sizeOpt of SIZE_OPTIONS) {
        const sw = getDbName(sizeOpt.value, 'swift') + suffix;
        const cc = getDbName(sizeOpt.value, 'c') + suffix;
        await dropDb(NativeCblSwiftModule, sw);
        await dropDb(NativeCblCModule, cc);
        addLog(`  Deleted local: ${sw}, ${cc}`);
      }
      for (const sizeOpt of SIZE_OPTIONS) {
        const sw = getDbName(sizeOpt.value, 'swift') + suffix;
        const cc = getDbName(sizeOpt.value, 'c') + suffix;
        try {
          await serverCleanup(NativeCblSwiftModule, endpoint, username, password, scope, sw, addLog);
        } catch (e: any) {
          addLog(`  ⚠ Server cleanup skipped for ${sw}: ${e?.message ?? e}`);
        }
        try {
          await serverCleanup(NativeCblSwiftModule, endpoint, username, password, scope, cc, addLog);
        } catch (e: any) {
          addLog(`  ⚠ Server cleanup skipped for ${cc}: ${e?.message ?? e}`);
        }
      }
      addLog(`\n✅ Slot ${slot} cleared.`);
      if (slot === activeSlot) resetSteps();
    } catch (err: any) {
      addLog(`\n❌ Clear Slot ${slot} failed: ${err.message}`);
    } finally {
      setIsCleaningSlot(0);
    }
  }, [isCleaningSlot, isRunning, activeSlot, endpoint, username, password, scope, addLog, resetSteps]);

  // ── Switch active slot ─────────────────────────────────────────────────────
  const handleSwitchSlot = useCallback(() => {
    if (isRunning) return;
    const nextSlot = activeSlot === 1 ? 2 : 1;
    setActiveSlot(nextSlot);
    const newRunId = makeRunId();
    setRunId(newRunId);
    resetSteps();
    addLog(
      `\n${'─'.repeat(48)}\n` +
      `Switched to Slot ${nextSlot}  RunID: ${newRunId}\n` +
      `${'─'.repeat(48)}`,
    );
  }, [isRunning, activeSlot, addLog, resetSteps]);

  // ── Reset steps only ───────────────────────────────────────────────────────
  const handleResetSteps = useCallback(() => {
    if (isRunning) return;
    Alert.alert('Reset Steps', 'Reset step progress to Step 1? (Does not clear DBs or log.)', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', onPress: () => { resetSteps(); addLog(`[${clock()}] Steps reset to beginning.`); } },
    ]);
  }, [isRunning, resetSteps, addLog]);

  // ── Copy log ───────────────────────────────────────────────────────────────
  const handleCopyLog = useCallback(async () => {
    if (logLines.length === 0) return;
    await Clipboard.setStringAsync(logLines.join('\n'));
    Alert.alert('Copied', 'Log output copied to clipboard.');
  }, [logLines]);

  // ── New session ────────────────────────────────────────────────────────────
  const handleNewSession = useCallback(() => {
    if (isRunning) return;
    Alert.alert('New Session', 'Reset everything — iteration counter, results, and steps?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'New Session',
        onPress: () => {
          const newRunId = makeRunId();
          setCurrentIteration(1);
          setRunId(newRunId);
          setIterResults([]);
          setLogLines([]);
          addLog(`[${clock()}] New session started. RunID: ${newRunId}`);
        },
      },
    ]);
  }, [isRunning, addLog]);

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
        <Text style={s.title}>Manual Replicator Benchmark</Text>
        <Text style={s.subtitle}>
          Step-by-step control · Swift vs C · {TOTAL_ITERATIONS} iterations · Slot {activeSlot}
        </Text>
      </View>

      {/* ── Connection Config ── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Sync Gateway Connection</Text>
        {[
          { label: 'Endpoint', value: endpoint, setter: setEndpoint, placeholder: 'ws://...' },
          { label: 'Username', value: username, setter: setUsername },
          { label: 'Password', value: password, setter: setPassword, secure: true },
          { label: 'Scope',    value: scope,    setter: setScope },
        ].map(f => (
          <View key={f.label} style={s.cfgRow}>
            <Text style={s.cfgLbl}>{f.label}</Text>
            <TextInput
              style={[s.cfgInput, isRunning && s.cfgInputOff]}
              value={f.value}
              onChangeText={f.setter}
              editable={!isRunning}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={(f as any).secure}
              selectTextOnFocus
              placeholder={(f as any).placeholder}
            />
          </View>
        ))}
        <View style={s.cfgRow}>
          <Text style={s.cfgLbl}>🔵 Coll</Text>
          <Text style={[s.cfgInput, s.cfgInputReadOnly]} numberOfLines={1}>{swiftColl}</Text>
        </View>
        <View style={s.cfgRow}>
          <Text style={s.cfgLbl}>🟠 Coll</Text>
          <Text style={[s.cfgInput, s.cfgInputReadOnly]} numberOfLines={1}>{cColl}</Text>
        </View>
      </View>

      {/* ── Test Configuration ── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Test Configuration</Text>
        <Dropdown
          label="Doc Size"
          value={selectedSize}
          options={SIZE_OPTIONS}
          onChange={guardedChange(setSelectedSize, true)}
          disabled={isRunning}
        />
        <Dropdown
          label="Doc Count"
          value={selectedCount}
          options={availableCountOptions}
          onChange={guardedChange(setSelectedCount, true)}
          disabled={isRunning}
        />
        <Dropdown
          label="Test Type"
          value={selectedType}
          options={TYPE_OPTIONS}
          onChange={guardedChange(setSelectedType, true)}
          disabled={isRunning}
        />
        <View style={s.dbRow}>
          <Text style={s.dbLabel}>🔵 Swift DB:</Text>
          <Text style={s.dbValue}>{swiftDb}</Text>
        </View>
        <View style={s.dbRow}>
          <Text style={s.dbLabel}>🟠 C DB:</Text>
          <Text style={s.dbValue}>{cDb}</Text>
        </View>
      </View>

      {/* ── Iteration Banner ── */}
      <View style={[s.iterBanner, swiftFirst ? s.iterBannerSw : s.iterBannerC]}>
        <View>
          <Text style={s.iterTitle}>
            Iteration {currentIteration} / {TOTAL_ITERATIONS} · Slot {activeSlot}
          </Text>
          <Text style={s.iterSub}>
            {swiftFirst ? '🔵 Swift First' : '🟠 C First'} · RunID: {runId}
          </Text>
          {isCleaningSlot !== 0 && (
            <Text style={s.iterCleaning}>⏳ Cleaning Slot {isCleaningSlot} in background…</Text>
          )}
        </View>
        <Text style={s.iterType}>
          {TYPE_OPTIONS.find(o => o.value === selectedType)?.label}
        </Text>
      </View>

      {/* ── Steps Panel ── */}
      <View style={s.card}>
        <View style={s.indepRow}>
          <View style={s.indepLeft}>
            <Text style={s.indepLabel}>Independent Mode</Text>
            <Text style={s.indepSub}>
              {independentMode ? 'Any step can be tapped freely' : 'Steps unlock sequentially'}
            </Text>
          </View>
          <Switch
            value={independentMode}
            onValueChange={setIndependentMode}
            trackColor={{ false: '#CFD8DC', true: '#1565C0' }}
            thumbColor={independentMode ? '#FFF' : '#FFF'}
          />
        </View>

        <Text style={s.cardTitle}>
          Manual Steps · {selectedCount.toLocaleString()} docs · {SIZE_OPTIONS.find(o => o.value === selectedSize)?.label}
        </Text>

        {steps.map((step, idx) => {
          const status    = stepStatuses[idx] ?? 'locked';
          const note      = stepNotes[idx];
          const isLocked  = status === 'locked';
          const isDone    = status === 'done';
          const isError   = status === 'error';
          const isActive  = idx === currentStepIdx && !isLocked;
          const isExec    = status === 'running';

          return (
            <TouchableOpacity
              key={`${step.id}-${idx}`}
              style={[
                s.step,
                isDone    && s.stepDone,
                isActive  && s.stepActive,
                isError   && s.stepError,
                isExec    && s.stepExec,
                isLocked  && !independentMode && s.stepLocked,
                step.isTimed && isActive && s.stepTimed,
              ]}
              onPress={() => handleStepPress(idx)}
              disabled={isRunning || isExec || (!independentMode && (isLocked || isDone))}
              activeOpacity={0.7}
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
                isDone    && s.stepStatusDone,
                isActive  && s.stepStatusActive,
                isError   && s.stepStatusErr,
              ]}>
                {isExec ? '…' : isDone ? 'Done' : isError ? 'Err' : isActive ? '▶ Tap' : '○'}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* ── Results Table ── */}
        {iterResults.length > 0 && (
          <View style={s.results}>
            <Text style={s.resultsTitle}>Results</Text>
            <View style={s.resultsRow}>
              <Text style={[s.rCell, s.rHead, { flex: 0.6 }]}>Iter</Text>
              <Text style={[s.rCell, s.rHead]}>Swift (ms)</Text>
              <Text style={[s.rCell, s.rHead]}>C (ms)</Text>
              <Text style={[s.rCell, s.rHead]}>Δ Swift/C</Text>
            </View>
            {iterResults.map(r => {
              const sw   = r.swift?.timeMs;
              const cc2  = r.c?.timeMs;
              const pct  = sw != null && cc2 != null
                ? `${((sw - cc2) / cc2 * 100).toFixed(1)}%`
                : '—';
              const pctColor = sw != null && cc2 != null
                ? sw < cc2 ? '#1B5E20' : '#B71C1C'
                : '#888';
              return (
                <View
                  key={r.iteration}
                  style={[s.resultsRow, r.iteration === currentIteration && s.resultsRowCur]}
                >
                  <Text style={[s.rCell, { flex: 0.6, fontWeight: '600' }]}>
                    {r.iteration}{r.swiftFirst ? 'S↑' : 'C↑'}
                  </Text>
                  <Text style={s.rCell}>{sw != null ? sw.toFixed(0) : '—'}</Text>
                  <Text style={s.rCell}>{cc2 != null ? cc2.toFixed(0) : '—'}</Text>
                  <Text style={[s.rCell, { color: pctColor }]}>{pct}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Step Action Buttons ── */}
        <View style={s.actions}>
          {/* Next Iteration — always visible */}
          <TouchableOpacity
            style={[s.btn, s.btnNext, isRunning && s.btnOff]}
            onPress={handleNextIteration}
            disabled={isRunning}
          >
            <Text style={s.btnTxt}>
              ▶ Next Iteration ({currentIteration + 1}/{TOTAL_ITERATIONS})
            </Text>
          </TouchableOpacity>

          {/* Complete badge */}
          {allDone && currentIteration >= TOTAL_ITERATIONS && (
            <View style={s.completeBanner}>
              <Text style={s.completeTxt}>🎉 All {TOTAL_ITERATIONS} iterations complete!</Text>
            </View>
          )}

          {/* Switch Slot */}
          <TouchableOpacity
            style={[s.btn, s.btnSwitch, isRunning && s.btnOff]}
            onPress={handleSwitchSlot}
            disabled={isRunning}
          >
            <Text style={s.btnTxt}>⇄ Switch to Slot {activeSlot === 1 ? 2 : 1}</Text>
          </TouchableOpacity>

          {/* Clear Slot 1 — background, does NOT block running steps on slot 2 */}
          <TouchableOpacity
            style={[s.btn, s.btnClearSlot, (isCleaningSlot === 1 || (isRunning && activeSlot === 1)) && s.btnOff]}
            onPress={() => handleClearSlot(1)}
            disabled={isCleaningSlot === 1 || (isRunning && activeSlot === 1)}
          >
            <Text style={s.btnTxt}>
              {isCleaningSlot === 1 ? '⏳ Clearing Slot 1…' : '♻ Clear Slot 1 (background)'}
            </Text>
          </TouchableOpacity>

          {/* Clear Slot 2 — background, does NOT block running steps on slot 1 */}
          <TouchableOpacity
            style={[s.btn, s.btnClearSlot, (isCleaningSlot === 2 || (isRunning && activeSlot === 2)) && s.btnOff]}
            onPress={() => handleClearSlot(2)}
            disabled={isCleaningSlot === 2 || (isRunning && activeSlot === 2)}
          >
            <Text style={s.btnTxt}>
              {isCleaningSlot === 2 ? '⏳ Clearing Slot 2…' : '♻ Clear Slot 2 (background)'}
            </Text>
          </TouchableOpacity>

          {/* Clear All DBs + Server (both slots — blocking) */}
          <TouchableOpacity
            style={[s.btn, s.btnClear, (isRunning || isCleaningSlot !== 0) && s.btnOff]}
            onPress={handleClearAll}
            disabled={isRunning || isCleaningSlot !== 0}
          >
            <Text style={s.btnTxt}>♻ Clear ALL DBs + Server (both slots)</Text>
          </TouchableOpacity>

          {/* Reset Steps */}
          <TouchableOpacity
            style={[s.btn, s.btnReset, isRunning && s.btnOff]}
            onPress={handleResetSteps}
            disabled={isRunning}
          >
            <Text style={s.btnTxt}>↺ Reset Steps</Text>
          </TouchableOpacity>

          {/* New Session */}
          <TouchableOpacity
            style={[s.btn, s.btnSession, isRunning && s.btnOff]}
            onPress={handleNewSession}
            disabled={isRunning}
          >
            <Text style={s.btnTxt}>✦ New Session</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Log Panel ── */}
      <View style={s.card}>
        <View style={s.logHeader}>
          <Text style={s.cardTitle}>Log Output</Text>
          <View style={s.logActions}>
            <TouchableOpacity onPress={handleCopyLog} disabled={logLines.length === 0}>
              <Text style={[s.logClear, logLines.length === 0 && s.logActionDisabled]}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setLogLines([])}>
              <Text style={s.logClear}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView
          ref={logScrollRef}
          style={s.log}
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          {logLines.length === 0
            ? <Text style={s.logEmpty}>No output yet — press a step button above.</Text>
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
  wrap:       { marginTop: 8 },
  label:      { fontSize: 11, fontWeight: '600', color: '#555', marginBottom: 3 },
  btn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#D0D0D0', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FAFAFA' },
  btnDisabled:{ backgroundColor: '#EEEEEE', borderColor: '#E0E0E0' },
  val:        { fontSize: 13, color: '#333', flex: 1 },
  arrow:      { fontSize: 14, color: '#888', marginLeft: 8 },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 30 },
  sheet:      { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden' },
  sheetTitle: { fontSize: 14, fontWeight: '700', color: '#333', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  opt:        { paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  optActive:  { backgroundColor: '#E8F5E9' },
  optTxt:     { fontSize: 14, color: '#333' },
  optTxtActive:{ color: '#1B5E20', fontWeight: '600' },
  check:      { fontSize: 14, color: '#1B5E20' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#ECEFF1' },

  header:       { backgroundColor: '#004D40', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20 },
  title:        { fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  subtitle:     { fontSize: 12, color: '#80CBC4' },

  card:         { backgroundColor: '#FFF', marginHorizontal: 12, marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: '#DDE', padding: 12 },
  cardTitle:    { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8 },

  cfgRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  cfgLbl:       { width: 76, fontSize: 12, fontWeight: '600', color: '#555' },
  cfgInput:         { flex: 1, borderWidth: 1, borderColor: '#D0D0D0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, fontSize: 12, color: '#333', backgroundColor: '#FAFAFA', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  cfgInputOff:      { backgroundColor: '#EEE', color: '#999' },
  cfgInputReadOnly: { backgroundColor: '#F0F4F8', color: '#546E7A', borderColor: '#CFD8DC' },

  dbRow:        { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  dbLabel:      { fontSize: 11, fontWeight: '700', color: '#555', width: 70 },
  dbValue:      { fontSize: 11, color: '#333', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  iterBanner:    { marginHorizontal: 12, marginTop: 10, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iterBannerSw:  { backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#90CAF9' },
  iterBannerC:   { backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFCC80' },
  iterTitle:     { fontSize: 16, fontWeight: '800', color: '#1A237E' },
  iterSub:       { fontSize: 11, color: '#555', marginTop: 2 },
  iterCleaning:  { fontSize: 10, color: '#6A1B9A', fontWeight: '700', marginTop: 3 },
  iterType:      { fontSize: 12, fontWeight: '600', color: '#37474F', textAlign: 'right', maxWidth: 120 },

  // Steps
  step:         { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 10, marginBottom: 5, backgroundColor: '#FAFAFA' },
  stepActive:   { borderColor: '#1565C0', backgroundColor: '#EFF7FF', borderWidth: 1.5 },
  stepTimed:    { borderColor: '#E65100', backgroundColor: '#FFF3E0', borderWidth: 2 },
  stepDone:     { borderColor: '#A5D6A7', backgroundColor: '#F9FFF9' },
  stepError:    { borderColor: '#EF9A9A', backgroundColor: '#FFF5F5' },
  stepExec:     { borderColor: '#FFA000', backgroundColor: '#FFFDE7' },
  stepLocked:   { opacity: 0.38 },

  stepLeft:     { flexDirection: 'row', alignItems: 'center', width: 48 },
  numBadge:     { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center' },
  numBadgeDone: { backgroundColor: '#4CAF50' },
  numBadgeErr:  { backgroundColor: '#E53935' },
  numTxt:       { fontSize: 10, fontWeight: '700', color: '#666' },
  numTxtWhite:  { color: '#FFF' },

  badge:        { marginLeft: 4, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, fontSize: 9, fontWeight: '800', overflow: 'hidden' },
  badgeSwift:   { backgroundColor: '#1565C0', color: '#FFF' },
  badgeC:       { backgroundColor: '#E65100', color: '#FFF' },
  badgeHelper:  { backgroundColor: '#546E7A', color: '#FFF' },

  stepMid:      { flex: 1, marginLeft: 8 },
  stepLbl:      { fontSize: 13, color: '#333', lineHeight: 18 },
  stepLblLocked:{ color: '#AAAAAA' },
  stepLblDone:  { color: '#777' },
  stepNote:     { fontSize: 11, color: '#1B5E20', fontWeight: '700', marginTop: 2 },

  stepStatus:   { fontSize: 11, color: '#CCC', textAlign: 'right', minWidth: 40 },
  stepStatusDone:  { color: '#4CAF50', fontWeight: '600' },
  stepStatusActive:{ color: '#1565C0', fontWeight: '700' },
  stepStatusErr:   { color: '#E53935', fontWeight: '700' },

  // Results
  results:      { marginTop: 12, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10 },
  resultsTitle: { fontSize: 12, fontWeight: '700', color: '#333', marginBottom: 6 },
  resultsRow:   { flexDirection: 'row', paddingVertical: 4 },
  resultsRowCur:{ backgroundColor: '#F5F5F5', borderRadius: 4 },
  rCell:        { flex: 1, fontSize: 11, color: '#333', textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  rHead:        { fontWeight: '700', color: '#555' },

  // Actions
  actions:      { marginTop: 12, gap: 7 },
  btn:          { paddingVertical: 13, borderRadius: 8, alignItems: 'center' },
  btnNext:      { backgroundColor: '#1B5E20' },
  btnSwitch:    { backgroundColor: '#1565C0' },
  btnClearSlot: { backgroundColor: '#6A1B9A' },
  btnClear:     { backgroundColor: '#BF360C' },
  btnReset:     { backgroundColor: '#546E7A' },
  btnSession:   { backgroundColor: '#37474F' },
  btnOff:       { opacity: 0.45 },
  btnTxt:       { color: '#FFF', fontSize: 14, fontWeight: '700' },

  completeBanner:{ alignItems: 'center', paddingVertical: 10, backgroundColor: '#E8F5E9', borderRadius: 8 },
  completeTxt:   { fontSize: 16, fontWeight: '700', color: '#1B5E20' },

  // Independent Mode row
  indepRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 4, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  indepLeft:  { flex: 1, marginRight: 12 },
  indepLabel: { fontSize: 13, fontWeight: '700', color: '#1565C0' },
  indepSub:   { fontSize: 11, color: '#777', marginTop: 2 },

  // Log
  logHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  logActions:      { flexDirection: 'row', gap: 14 },
  logClear:        { fontSize: 12, color: '#1565C0', fontWeight: '600' },
  logActionDisabled: { opacity: 0.35 },
  log:          { height: 240, backgroundColor: '#F8FAFB', borderRadius: 6, padding: 8 },
  logEmpty:     { fontSize: 12, color: '#AAAAAA', textAlign: 'center', paddingVertical: 20 },
  logTxt:       { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#263238', lineHeight: 16 },
});
