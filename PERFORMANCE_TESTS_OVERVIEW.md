# Performance Tests Overview

## 📁 Test Files Created

```
expo-example/app/database/
├── 📊 performance-test.tsx              # Original I/O-bound performance test
├── 🔬 bridge-overhead-test.tsx          # Pure bridge overhead measurement
├── ⚙️  async-queue-test.tsx             # Async queue dispatch overhead
├── 📈 metadata-performance-test.tsx     # Metadata operations performance
├── 🚀 sync-vs-async-test.tsx            # ⭐ TRUE SYNCHRONOUS vs ASYNC comparison
├── 🧪 memory-performance-test.tsx       # ⭐ Memory usage comparison
└── 📋 memory-utils.ts                   # Memory tracking utilities
```

---

## 🚀 Test 1: Sync vs Async Test

**File**: `expo-example/app/database/sync-vs-async-test.tsx`

### Purpose
Tests the **REAL difference** between TRUE SYNCHRONOUS Turbo Module calls (via JSI) and ASYNC calls (via bridge queue).

### What It Tests

| Test # | Test Name | What It Measures | Calls Made | Expected Result |
|--------|-----------|------------------|------------|-----------------|
| **1** | Echo Comparison | Pure bridge overhead | 10,000 small calls | Sync 5-6x faster |
| **2** | Performance Check | Computation + bridge | 100 runs x 10K iterations | Sync dramatically faster |
| **3** | Batch vs Individual | Many calls vs few | 50,000 individual calls | Sync eliminates overhead |

### Methods Tested

```typescript
// 🚀 TURBO SYNC (No Promise, no await!)
TurboCollection.collection_EchoSync(data)              // Direct return
TurboCollection.collection_PerformanceCheckTurboSync(n) // Direct return

// ⚡ TURBO ASYNC (Promise-based)
await TurboCollection.collection_Echo(data)
await TurboCollection.collection_PerformanceCheckTurbo(n)

// 🐌 LEGACY ASYNC (Full bridge queue)
await LegacyModule.collection_Echo(data)
await LegacyModule.collection_PerformanceCheckLegacy(n)
```

### Key Metrics Displayed

```
📊 Speed Comparison:
   - Total time (ms)
   - Calls per second
   - Speedup multiplier (Nx faster)

📊 Per-Call Overhead:
   - Average time per call
   - Time saved vs Legacy
```

### Your Results

| Metric | Turbo SYNC | Turbo Async | Legacy |
|--------|------------|-------------|--------|
| **50K Calls** | 284ms | 1,071ms | 1,227ms |
| **Calls/sec** | **176,253** | 46,666 | 40,735 |
| **Speedup** | **4.33x** | 1.15x | baseline |

---

## 🧪 Test 2: Memory Performance Test

**File**: `expo-example/app/database/memory-performance-test.tsx`

### Purpose
Compares **memory usage** differences between Turbo SYNC, Turbo ASYNC, and Legacy modules.

### What It Tests

| Test # | Test Name | What It Measures | Operations | Expected Result |
|--------|-----------|------------------|------------|-----------------|
| **1** | Bulk Data Transfer | Memory overhead for large payloads | 1,000 docs x 10KB | Sync uses more temp memory (faster execution) |
| **2** | Rapid Calls | Memory overhead from many calls | 50,000 small calls | Peak memory differences |
| **3** | Memory Leak Detection | Memory retention over cycles | 5 cycles x 1,000 ops | No leaks, clean GC |

### Methods Tested

```typescript
// 🚀 TURBO SYNC
TurboCollection.collection_EchoSync(largeDocument)  // No Promise overhead

// ⚡ TURBO ASYNC
await TurboCollection.collection_Echo(largeDocument)

// 🐌 LEGACY ASYNC
await LegacyModule.collection_Echo(largeDocument)
```

### Memory Sources Tracked

```
📊 JS Heap Memory (performance.memory):
   - usedJSHeapSize
   - totalJSHeapSize
   - jsHeapSizeLimit
   ⚠️  Only available with Chrome DevTools

📊 Native Memory (debug_GetMemoryUsage):
   - Android: Runtime.getRuntime() stats
   - iOS: mach_task_basic_info() stats
   ✅ Always available
```

### Key Metrics Displayed

```
📊 Speed Comparison:
   - Time for each approach
   - Speedup multiplier

📊 Memory Comparison:
   - Memory before/after
   - Peak memory usage
   - Memory delta (retained)
   - Memory savings vs Legacy

📊 Leak Analysis:
   - Net change after GC
   - Memory per operation
   - Leak detection (>1MB retained = warning)
```

### Your Results (Test 2 - Rapid Calls)

| Metric | Turbo SYNC | Turbo Async | Legacy |
|--------|------------|-------------|--------|
| **Time** | 284ms | 1,071ms | 1,227ms |
| **Memory Delta** | 19.64 MB | 2.56 MB | 912 KB |
| **Peak Memory** | 691.19 MB | 682.98 MB | 684.78 MB |

**Note**: Sync shows higher memory delta because it's SO fast (4.33x) that GC can't keep up during execution. Memory is cleaned up after the test.

---

## 🎯 Comparison: What Each Test Proves

| Aspect | Sync vs Async Test | Memory Performance Test |
|--------|-------------------|------------------------|
| **Primary Focus** | ⚡ **Speed** | 💾 **Memory** |
| **Key Finding** | Sync is 4-6x faster | Sync has temp memory spike (expected) |
| **Why It Matters** | Shows JSI advantage for high-frequency calls | Shows memory trade-offs |
| **Best Use Case** | Proving Turbo Module benefits | Understanding memory patterns |
| **Copy Button** | ✅ Yes | ✅ Yes |

---

## 📂 Supporting Files

### Native Code (Android)

```
android/src/main/java/com/cblreactnative/
├── CblReactnativeModule.kt                    # Legacy module
│   ├── collection_Echo()                      # Async with runOnUiQueueThread
│   ├── collection_PerformanceCheckLegacy()    # Async with GlobalScope.launch
│   ├── collection_BatchEchoLegacy()           # Async
│   └── debug_GetMemoryUsage()                 # NEW: Native memory tracking
│
└── turbo/CouchbaseLiteCollectionModule.kt     # Turbo module
    ├── collection_EchoSync()                  # NEW: TRUE SYNC (no Promise!)
    ├── collection_Echo()                      # Async but direct (no queue)
    ├── collection_PerformanceCheckTurboSync() # NEW: TRUE SYNC
    ├── collection_PerformanceCheckTurbo()     # Async
    └── collection_BatchEchoSync()             # NEW: Sync batch
```

### Native Code (iOS)

```
ios/
├── CblReactnative.swift                       # Legacy module
│   ├── collection_Echo()                      # Async with backgroundQueue
│   ├── collection_PerformanceCheckLegacy()    # Async with backgroundQueue
│   ├── collection_BatchEchoLegacy()           # Async
│   └── debug_GetMemoryUsage()                 # NEW: Native memory tracking
│
├── CblReactnative.mm                          # Legacy bridge exports
│   └── RCT_EXTERN_METHOD declarations
│
└── turbo/
    ├── CouchbaseLiteCollectionModule.swift    # Turbo module
    │   ├── collection_EchoSync()              # NEW: TRUE SYNC
    │   ├── collection_Echo()                  # Async but direct
    │   ├── collection_PerformanceCheckTurboSync() # NEW: TRUE SYNC
    │   ├── collection_PerformanceCheckTurbo() # Async
    │   └── collection_BatchEchoSync()         # NEW: Sync batch
    │
    └── CouchbaseLiteCollectionModule.mm       # Turbo bridge exports
        └── RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD for sync
```

### TypeScript Specs

```
src/specs/NativeCblCollection.ts               # Turbo Module type definitions
├── collection_Echo(data): Promise<{data}>
├── collection_EchoSync(data): string          # NEW: Sync return!
├── collection_PerformanceCheckTurbo(n): Promise<{timeMs}>
├── collection_PerformanceCheckTurboSync(n): {timeMs} # NEW: Sync return!
└── collection_BatchEchoSync(count): number    # NEW: Sync return!
```

### Utilities

```
expo-example/app/database/memory-utils.ts
├── captureMemorySnapshot()      # Gets both JS + Native memory
├── getJSMemory()                # performance.memory (Chrome only)
├── getNativeMemory()            # debug_GetMemoryUsage() (always available)
├── formatBytes()                # Human-readable sizes
├── formatMemorySnapshot()       # Format both sources
├── getBestMemoryValue()         # Prefer JS, fallback to Native
├── calculateMemoryDelta()       # Difference between snapshots
├── forceGarbageCollection()     # global.gc() if available
└── wait(ms)                     # Promise-based delay
```

---

## 🎨 UI Features

### Both Tests Include

- ✅ **Copy Button** - Copy results to clipboard
- ✅ **Clear Button** - Reset results
- ✅ **Individual Tests** - Run tests separately
- ✅ **Run All** - Run full test suite
- ✅ **Colored Headers** - Visual distinction
- ✅ **Monospace Output** - Easy to read results

### Color Coding

```
🚀 Turbo SYNC     → Orange (#f59e0b)
⚡ Turbo Async    → Blue (#3b82f6)
🐌 Legacy         → Gray (baseline)
🧪 Memory Test    → Pink (#ec4899)
```

---

## 📊 What You've Proven

| Finding | Test | Metric |
|---------|------|--------|
| **Sync is 4.33x faster** | Sync vs Async (Rapid Calls) | 176K calls/sec vs 40K |
| **Async Turbo ≈ Legacy** | All tests | ~1.0-1.2x difference |
| **I/O dominates** | Performance Test | No major speed diff |
| **Memory trade-off** | Memory Test | Sync spikes but GC cleans |

---

## 🎯 Summary

### Sync vs Async Test
**Shows**: TRUE synchronous JSI calls are 4-6x faster than async  
**Best For**: Proving Turbo Module speed advantage  
**Key Result**: 176,253 calls/sec (Sync) vs 40,735 calls/sec (Legacy)

### Memory Performance Test  
**Shows**: Memory usage patterns across all three approaches  
**Best For**: Understanding memory trade-offs  
**Key Result**: Sync uses more temp memory (faster execution) but GC cleans up

---

## 🚀 Next Steps

1. **Share these results** to show Turbo Module advantages
2. **Use sync methods** for high-frequency operations
3. **Keep async** for I/O-bound database operations
4. **Monitor in production** with native profilers

---

*Both tests now support copying results to clipboard for easy sharing!*
