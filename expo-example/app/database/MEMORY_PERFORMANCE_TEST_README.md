# Memory Performance Test

This test suite measures memory usage differences between **Turbo Modules** and **Legacy Bridge** modules to identify where Turbo Modules provide memory savings.

## Overview

While speed tests show minimal differences due to I/O-bound operations, memory tests reveal architectural advantages of Turbo Modules:

- **Zero Serialization** - No JSON conversion overhead
- **Direct Memory Access** - JSI enables shared memory between JS and Native
- **Reduced Bridge Queue** - No message queuing in memory
- **Efficient Data Transfer** - Direct memory references vs. copies

## Test Suite

### Test 1: Bulk Data Transfer 🎯 HIGH PRIORITY
**Purpose**: Measure memory overhead when transferring large amounts of data

**What it does**:
- Transfers 1,000 large documents (10KB each)
- Monitors peak memory usage
- Compares memory delta before/after

**Expected Results**:
- Legacy creates temporary JSON strings for each transfer (2x memory)
- Turbo uses direct memory access (1x memory)
- **Expected savings: 40-60% less memory with Turbo Modules**

### Test 2: Rapid Calls Test
**Purpose**: Measure memory from many small bridge calls

**What it does**:
- Makes 50,000 rapid calls with small payloads
- Tracks memory growth during execution
- Calculates per-call memory overhead

**Expected Results**:
- Legacy queues messages in memory
- Turbo makes direct calls without queuing
- **Expected savings: 20-40% less memory with Turbo Modules**

### Test 3: Memory Leak Detection
**Purpose**: Detect memory leaks through repeated cycles

**What it does**:
- Runs 5 cycles of allocate → process → deallocate
- Forces garbage collection between cycles
- Checks if memory returns to baseline

**Expected Results**:
- Both should return close to baseline after GC
- Legacy may retain serialization buffers longer
- **Expected: Minimal leaks, but Legacy may show slower cleanup**

## Running the Tests

### Prerequisites

1. **Enable Turbo Modules** in your app configuration
2. **Enable Memory Profiling** (optional but recommended):
   - Run with Chrome debugger for `performance.memory` API
   - For native memory tracking, methods are automatically available

### Steps

1. Navigate to "Memory Performance Test" in the app
2. Choose one of:
   - **Run All Tests** - Runs all 3 tests sequentially (recommended)
   - **Test 1: Bulk Transfer** - Most impactful test
   - **Test 2: Rapid Calls** - Bridge overhead focus
   - **Test 3: Leak Detection** - Long-term stability

3. Wait for results (may take several minutes)
4. Review memory metrics in the output

### Important Notes

- **Run with Chrome Debugger** for full JS heap statistics
- Without debugger, you'll see: `performance.memory not available`
- Native memory tracking works on both iOS and Android
- Results vary by device performance
- Run multiple times for accurate averages

## Interpreting Results

### Memory Metrics Explained

**JS Heap Memory**:
- `used` - Currently allocated JS memory
- `total` - Total JS heap size
- `limit` - Maximum JS heap allowed

**Native Memory** (Android):
- `usedMemory` - Currently used native memory
- `totalMemory` - Total allocated memory
- `maxMemory` - Maximum available memory

**Native Memory** (iOS):
- `residentSize` - Physical memory in use
- `virtualSize` - Virtual memory allocated

### What to Look For

**Peak Memory**: 
- Highest memory usage during test
- Shows worst-case scenario
- Turbo should show 30-60% lower peaks

**Memory Delta**:
- Change from start to finish
- Indicates retained memory
- Both should be close to 0 after GC

**Per-Operation Memory**:
- Memory cost per bridge call
- Turbo should be near 0 bytes/call
- Legacy may show 50-200 bytes/call

## Expected Turbo Module Advantages

| Metric | Legacy | Turbo | Savings |
|--------|--------|-------|---------|
| **Bulk Transfer** | High | Low | 40-60% |
| **Peak Memory** | Spiky | Stable | 30-50% |
| **Per-Call Overhead** | 50-200 bytes | ~0 bytes | ~100% |
| **Memory Leaks** | Possible | Minimal | Variable |

## Platform Differences

### Android
- Runtime.getRuntime() provides memory stats
- Generally shows larger memory deltas
- More aggressive garbage collection

### iOS
- mach_task_basic_info provides memory stats
- Generally more conservative memory use
- ARC handles memory management

## Troubleshooting

### "performance.memory not available"
- **Solution**: Run with Chrome debugger attached
- Or rely on native memory tracking only

### "Turbo modules not available"
- **Solution**: Rebuild app with Turbo Modules enabled
- Check `USE_TURBO_MODULES` feature flag

### Inconsistent results
- **Solution**: Run tests multiple times
- Close other apps to reduce interference
- Use Release build for production metrics

### GC not available
- **Solution**: Enable `global.gc()` in dev mode
- Or rely on automatic GC (less precise)

## Technical Details

### Memory Tracking Implementation

**JavaScript Side**:
```typescript
// Uses performance.memory API if available
const memory = performance.memory.usedJSHeapSize;
```

**Native Side - Android**:
```kotlin
val runtime = Runtime.getRuntime()
val usedMemory = runtime.totalMemory() - runtime.freeMemory()
```

**Native Side - iOS**:
```swift
var info = mach_task_basic_info()
// Get resident_size and virtual_size
```

### Why This Matters

Understanding memory differences helps:
1. **Choose the right architecture** for your use case
2. **Optimize bridge calls** in performance-critical code
3. **Plan capacity** for large-scale deployments
4. **Justify migration** from Legacy to Turbo Modules

## Next Steps

After running tests:
1. Document your results for your specific use case
2. Compare with speed tests to see full picture
3. Make informed decision about Turbo Module adoption
4. Monitor memory in production environments

## Contributing

Found issues or want to add more tests? Check the implementation:
- `memory-performance-test.tsx` - Test UI and logic
- `memory-utils.ts` - Memory tracking utilities
- `CblReactnativeModule.kt` - Android memory tracking
- `CblReactnative.swift` - iOS memory tracking
