# Couchbase Lite React Native: Legacy Bridge → Turbo Module Migration Plan

**Repository:** `cbl-reactnative`  
**Branch at Analysis Time:** `new_architecture_pattern`  
**Current Version:** 1.0.0  
**React Native Version:** 0.76.2  
**Couchbase Lite SDK:** 3.3.0 (iOS Swift + Android Java)  
**Analysis Date:** March 2026  

> **Change Log from v1:**
> - Removed all references to the Couchbase Lite C SDK. The C SDK experiments are fully abandoned. Only the Swift SDK (iOS) and Java SDK (Android) remain in scope.
> - Added explicit Coexistence Buffer strategy (§2.8) — a defined, hot-switchable mechanism to keep legacy and Turbo running simultaneously for as long as needed.
> - All method signatures are async-only (Promise-based). No synchronous JSI methods are used anywhere in the migration.

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Turbo Module Migration Strategy](#2-turbo-module-migration-strategy)
3. [Couchbase-Specific Concerns](#3-couchbase-specific-concerns)
4. [Risk Analysis](#4-risk-analysis)
5. [Migration Timeline Plan](#5-migration-timeline-plan)
6. [Validation Strategy](#6-validation-strategy)
7. [Final Architecture Diagram](#7-final-architecture-diagram)

---

## 1. Current Architecture Analysis

### 1.1 Current Design (Legacy Bridge)

The repository implements a Couchbase Lite SDK wrapper for React Native using the **Legacy Bridge Architecture**. The call path today is:

```
TypeScript (CblReactNativeEngine.tsx)
  → NativeModules.CblReactnative  [lookup via bridge registry]
    → [Async JSON message queue]  [serialization + deserialization]
      ┌─ iOS:  CblReactnative.mm (RCT_EXTERN_MODULE + RCT_EXTERN_METHOD macros)
      │          → CblReactnative.swift (RCTEventEmitter, 2031 lines, single monolith)
      │            → CouchbaseLiteSwift 3.3 SDK
      │              → (cbl-js-swift submodule: DatabaseManager, CollectionManager, etc.)
      │
      └─ Android: CblReactnativeModule.kt (ReactContextBaseJavaModule, 1838 lines, single monolith)
                    → cbl-js-kotlin submodule (DatabaseManager, CollectionManager, etc.)
                      → Couchbase Lite Android SDK 3.3
```

The module is registered via:
- **iOS**: `CblReactnative.mm` with ~60 `RCT_EXTERN_METHOD` declarations mapping ObjC selectors → Swift methods
- **Android**: `CblReactnativePackage.kt` returning `CblReactnativeModule` from `createNativeModules()`
- **JS**: `NativeModules.CblReactnative` proxy in `CblReactNativeEngine.tsx`

### 1.2 Git History & Architecture Evolution

The full git history reveals the following evolution:

**Initial commit (`f1d5244`):** Basic project scaffold with `ReactContextBaseJavaModule` (Android) and `RCT_EXTERN_MODULE` (iOS). No Couchbase Lite yet.

**Early feature development (commits `1352a73` → `8652bee`):** Database open/close/delete, Collections, Scopes, Documents, Indexes — all added incrementally using the legacy bridge pattern on both platforms.

**RN 0.76.3 + CBL 3.2.1 upgrade (`dbafe27`):** First significant dependency bump. The bridge remained legacy.

**CBL 3.3.0 migration (`03d7a74`, `e39bba8`):** SDK version bumped on both platforms. No architecture change.

**Version 1.0.0 (`6615b70`):** Full API surface shipped as legacy bridge.

**`new_architecture_pattern` branch (current):** Turbo Module experiments added, benchmarking infrastructure added, TypeScript specs created — but the production module remains legacy.

**Key observation from `git log --oneline --all -- src/specs/`:**
```
(empty - no commits)
```
The entire `src/specs/` directory is **uncommitted/untracked** — meaning all spec files are local work on the current branch with no history.

### 1.3 Identified Bottlenecks

#### B1. Serialization Overhead (Critical)

Every bridge call serializes all arguments to JSON, passes them through an async message queue, and deserializes on the other side. For Couchbase operations this is particularly expensive because:

- `collection_Save` sends full document JSON as a string, which is then re-parsed natively. The JSON crosses the bridge as a string, is parsed by `JSONSerialization` (iOS) / `JSONObject` (Android), converted to a `MutableDocument`, then the SDK re-serializes internally to Fleece. **Three serialization passes** for a single write.
- `collection_GetDocument` does the reverse: Fleece → JSON string → bridge → JS JSON.parse. Three full deserialization passes for a single read.
- `query_Execute` returns entire result sets as stringified JSON arrays, which for large queries can mean megabytes of data crossing the bridge in a single string.
- `replicator_Create` takes a complex `NSDictionary`/`ReadableMap` representing the full replicator config — including nested collection configs parsed from a JSON string stored inside the map.

#### B2. Unnecessary Thread Hops Per Call (High)

Every method in the current bridge uses `Promise`-based async dispatch. On Android, all calls go through `GlobalScope.launch(Dispatchers.IO)` then hop back to UI thread via `context.runOnUiQueueThread` for promise resolution — that is **two thread hops minimum per call**. On iOS, the pattern uses `backgroundQueue.async` with promise callbacks.

The Turbo Module architecture eliminates unnecessary hops: with JSI, the call dispatch is direct and `promise.resolve()` can be called from any thread without a UI queue redirect. For all operations, this reduces the per-call overhead by eliminating the UI queue redirect on both platforms.

**Android current thread hop chain per call:**
```
JS Thread → Bridge Queue → IO Thread (Dispatchers.IO) → UI Thread [runOnUiQueueThread] → Bridge → JS Thread
```

**iOS current thread hop chain per call:**
```
JS Thread → Bridge Queue → backgroundQueue (serial DispatchQueue) → Promise callback → JS Thread
```

**Turbo Module thread hop chain per call (target):**
```
JS Thread → JSI direct call → Native Queue (domain-specific) → promise.resolve() → JS Thread
            [no bridge queue]                                  [no UI thread redirect]
```

#### B3. Event Emitter Architecture (Medium-High)

The current module extends `RCTEventEmitter` (iOS) and manually uses `DeviceEventManagerModule.RCTDeviceEventEmitter` (Android) for six event types:
- `collectionChange`
- `collectionDocumentChange`
- `queryChange`
- `replicatorStatusChange`
- `replicatorDocumentChange`
- `customLogMessage`

These events all go through the legacy bridge event bus. Under high-frequency replication status updates (continuous replication can fire dozens of status events per second) or live queries (each document change triggers a full query re-execution and result delivery), this creates back-pressure on the bridge. The `allResultsChunkSize: Int = 256` property in `CblReactnative.swift` hints at a chunking intention that was never implemented.

#### B4. Monolithic Module (Medium)

Both iOS and Android implement the entire Couchbase API surface (~60+ methods spanning Database, Collection, Document, Query, Replicator, Scope, Logging, and LogSinks domains) in a single module class. This means:
- All methods are loaded at module init even if only Database APIs are needed
- The single serial `backgroundQueue` (iOS) becomes a contention point — a long-running query blocks all document saves
- The Android `GlobalScope` coroutines share the global thread pool, creating hidden contention
- Module invalidation/cleanup is all-or-nothing
- A crash in any domain takes down the entire bridge module

#### B5. Threading Model Risks (Medium-High)

**iOS:**
`CblReactnative.swift` uses a single `backgroundQueue = DispatchQueue(label: "com.cblite.reactnative.backgroundQueue")` for all operations. This serial queue is correct for preventing concurrent Couchbase access, but it means:
- A long-running query (executing over 10K documents) blocks all document saves and reads
- Replicator configuration and start blocks unrelated CRUD operations
- No domain-level parallelism possible even when it would be safe

**Android:**
`GlobalScope.launch(Dispatchers.IO)` uses Kotlin's shared IO dispatcher (default: 64 threads). The `cbl-js-kotlin` `DatabaseManager` uses synchronized maps internally, but:
- Multiple simultaneous `collection_Save` calls can execute concurrently on different threads
- `MutableDocument` objects are created in the coroutine and must not be shared — currently safe but fragile
- `GlobalScope` is an anti-pattern: coroutines outlive the module lifecycle, no cancellation on `invalidate()`

#### B6. Memory / Handle Management (Medium)

- Database instances are tracked by string name in the `DatabaseManager` singleton on both platforms. No explicit lifecycle management from the JS side — if JS forgets to call `database_Close`, the native instance persists until app restart.
- Listener tokens are tracked in `allChangeListenerTokenByUuid` dictionaries (both platforms). If the JS side loses a reference to a token UUID without calling `listenerToken_Remove`, the native listener leaks indefinitely. This is a real risk in React component unmount scenarios.
- Replicator instances are tracked by string IDs in `ReplicatorManager`. Same leak risk if `replicator_Cleanup` is not called.

#### B7. `GlobalScope` Anti-Pattern (Medium-High, Android-specific)

Every single `@ReactMethod` in `CblReactnativeModule.kt` uses:
```kotlin
GlobalScope.launch(Dispatchers.IO) {
  // ... work ...
  context.runOnUiQueueThread {
    promise.resolve(result)
  }
}
```

Problems:
1. `GlobalScope` has no lifecycle — coroutines continue running even after the module is destroyed
2. `context.runOnUiQueueThread` adds an unnecessary thread hop for promise resolution in Turbo context
3. `DelicateCoroutinesApi` annotation suppresses the warning but does not fix the underlying issue
4. If `reactContext` is invalidated while a coroutine is running, the `runOnUiQueueThread` call can crash

### 1.4 Existing Turbo Module Experiments (Three Layers)

**Layer 1: `ios/turbo/` + `android/.../turbo/` ("Turbo v1")**

Files:
- iOS: `CouchbaseLiteDatabaseModule.swift/.mm`, `CouchbaseLiteCollectionModule.swift/.mm`
- Android: `CouchbaseLiteDatabaseModule.kt`, `CouchbaseLiteCollectionModule.kt`

**Verdict: NOT true Turbo Modules.**

The iOS `.mm` files use `RCT_EXTERN_MODULE` + `RCT_EXTERN_METHOD` — these are legacy bridge macros, identical to the production module pattern. There is no `getTurboModule:` method, no conformance to a Codegen-generated protocol. The Android files extend `ReactContextBaseJavaModule` and implement the `TurboModule` marker interface, but without Codegen-generated abstract classes, the JSI binding is not established. These are registered in `CblReactnativeTurboPackage.kt` as a `TurboReactPackage` with `isTurboModule = true`, but the method dispatch still goes through the traditional bridge queue because no C++ JSI bindings exist.

**Layer 2: `ios/turbo-v2/` ("Turbo v2")**

Files: `CblSwiftAdapter.swift`, `RCTCblSwift.h`, `RCTCblSwift.mm`
TypeScript spec: `src/specs/NativeCblSwift.ts`

**Verdict: Correct architecture pattern, but built for benchmarking only.**

The ObjC++ bridge file (`RCTCblSwift.mm`) follows the correct Codegen pattern where it implements the generated protocol and returns `std::make_shared<NativeCblSwiftSpecJSI>(params)` from `getTurboModule:`. This is the real Turbo Module pattern.

However, this spec includes benchmark-specific methods and uses object-wrapping patterns (`args: { name: string; ... }`) that add unnecessary indirection. It lacks listeners, logging, scopes, full CRUD surface, and other production API surface. This entire experiment directory is removed as part of this migration.

**Layer 3: `src/specs/NativeCblDatabase.ts` + `NativeCblCollection.ts` ("Early Turbo")**

These specs use flat parameter signatures matching the "Turbo v1" native module signatures. `NativeCblCollection.ts` includes both production methods and benchmark methods. Registered as `CouchbaseLiteDatabase` and `CouchbaseLiteCollection`.

**Verdict: Bind to the v1 turbo modules via Codegen.** They work for the subset of operations implemented but are incomplete and polluted with benchmark code. These are what `CblReactNativeEngine.tsx` conditionally uses when `USE_TURBO_MODULES = true`.

### 1.5 Feature Flag System

```typescript
// src/feature-flags.ts
export const USE_TURBO_MODULES = (() => {
  const ENABLE_TURBO = true;
  return ENABLE_TURBO;
})()
```

`CblReactNativeEngine.tsx` conditionally imports `DatabaseTurbo`/`CollectionTurbo` based on this flag:
```typescript
if (USE_TURBO_MODULES) {
  DatabaseTurbo = require('./specs/NativeCblDatabase').default;
  CollectionTurbo = require('./specs/NativeCblCollection').default;
}
```

For all other operations (Query, Replicator, Scope, Logging, Listeners), the engine still falls back to `NativeModules.CblReactnative` — the legacy module — regardless of the flag value. The migration is thus **incomplete**: roughly 2 of 8 API domains are wired to the Turbo path.

This feature flag will be evolved into the **Coexistence Buffer** described in §2.8 — a deliberate, per-domain runtime switch that supports hot-toggling between legacy and Turbo for each API domain independently.

### 1.6 Codegen Configuration

```json
// package.json
"codegenConfig": {
  "name": "CouchbaseLiteSpec",
  "type": "modules",
  "jsSrcsDir": "src/specs",
  "android": {
    "javaPackageName": "com.cblreactnative"
  },
  "ios": {}
}
```

This is correctly configured. Codegen will scan all `.ts` files in `src/specs/`. Currently it finds four specs. For the production migration, this directory must be cleaned and contain only the 8 production specs.

### 1.7 Benchmark Findings Summary

**BENCHMARK_REPORT.md** (February 2026, iPhone 16 physical, 158 test cases):
- Bridge overhead comparison: Turbo async path eliminates the bridge queue dispatch and UI thread redirect, yielding a measurable reduction in per-call overhead compared to the legacy async path
- Query performance: consistent across bridge architectures (bottleneck is SQLite execution, not the bridge)
- Conclusion: Bridge overhead reduction is most visible on high-frequency, lightweight operations

**REPLICATOR_BENCHMARK_REPORT.md** (February 2026, iOS Simulator, local Docker):
- Replication performance is dominated by Sync Gateway processing overhead, not the bridge
- Conclusion: Turbo Module migration will not significantly change replication throughput; correctness and reliability improvements are the primary benefit

**CAPELLA_BENCHMARK_REPORT.md** (March 2026, iOS Simulator, Capella Cloud 3-node):
- At real-world network latencies, the bridge overhead is completely masked by network round-trip time
- Conclusion: Turbo Module migration for replication is a correctness and lifecycle improvement, not a throughput optimization

**Decision confirmed:** Keep Swift SDK (iOS) + Java SDK (Android) for production. These are the official, supported SDKs. The Turbo Module migration addresses the bridge layer independently of SDK performance.

---

## 2. Turbo Module Migration Strategy

### 2.1 High-Level Migration Roadmap

```
Phase 1: Foundation (Preparation)
  │ Clean specs, set up Codegen, extract shared code
  │ Establish coexistence buffer infrastructure
  │
Phase 2: Domain-Decomposed Turbo Module Implementation
  │ Implement 8 modules per-domain, running alongside legacy
  │ Coexistence buffer active — both paths hot-switchable
  │
Phase 3: Gradual Feature Migration
  │ Migrate CblReactNativeEngine one domain at a time via buffer
  │ Legacy remains fully operational as rollback target
  │
Phase 4: Full Cutover
  │ Remove legacy modules, bridge, coexistence buffer
  │
Phase 5: Cleanup & Optimization
    Remove benchmark artifacts, optimize event delivery, profile
```

### 2.2 TypeScript Spec Design Plan

#### Domain Decomposition Decision

Rather than one monolithic spec, split into domain-specific Turbo Modules:

| Spec File | Module Name | API Methods |
|-----------|-------------|-------------|
| `NativeCblDatabase.ts` | `CouchbaseLiteDatabase` | Open, Close, Delete, Copy, Exists, GetPath, PerformMaintenance, ChangeEncryptionKey |
| `NativeCblCollection.ts` | `CouchbaseLiteCollection` | CreateCollection, DeleteCollection, GetCollection, GetCollections, GetDefault, GetCount, GetFullName, CreateIndex, DeleteIndex, GetIndexes |
| `NativeCblDocument.ts` | `CouchbaseLiteDocument` | Save, GetDocument, DeleteDocument, PurgeDocument, GetBlobContent, Get/SetDocumentExpiration |
| `NativeCblQuery.ts` | `CouchbaseLiteQuery` | Execute, Explain |
| `NativeCblReplicator.ts` | `CouchbaseLiteReplicator` | Create, Start, Stop, GetStatus, Cleanup, ResetCheckpoint, GetPendingDocumentIds, IsDocumentPending |
| `NativeCblScope.ts` | `CouchbaseLiteScope` | GetDefault, GetScope, GetScopes |
| `NativeCblLogging.ts` | `CouchbaseLiteLogging` | SetFileLoggingConfig, SetLogLevel, logsinks_SetConsole, logsinks_SetFile, logsinks_SetCustom |
| `NativeCblListener.ts` | `CouchbaseLiteListener` | AddCollectionChangeListener, AddDocumentChangeListener, AddQueryChangeListener, AddReplicatorChangeListener, AddReplicatorDocumentChangeListener, RemoveChangeListener, listenerToken_Remove |

**Rationale for domain decomposition:**
- **Lazy loading:** Only modules you use get initialized (Turbo Modules are lazily instantiated)
- **Parallel execution:** Each module can have its own dedicated dispatch queue
- **Maintainability:** Change to Replicator doesn't touch Document operations
- **Testing:** Modules can be tested in complete isolation
- **Crash isolation:** A bug in one domain doesn't take down all bridge operations
- **Coexistence granularity:** Each domain can be independently switched between legacy and Turbo via the buffer

#### Spec Conventions

1. **Use flat parameter signatures, not object-wrapping.** Codegen handles flat params cleanly. The object-wrapping pattern (`args: { name: string; ... }`) used in the benchmark experiment specs adds indirection with no benefit and was only adopted for those experiments.

2. **All methods return `Promise<T>` (async without exception).** Every method — including metadata lookups like `collection_GetCount` and `database_GetPath` — returns a `Promise`. No synchronous JSI methods (`isBlockingSynchronousMethod`) are used anywhere in this migration. Async-only ensures consistent behaviour across all operation types, avoids JS thread blocking under any circumstances, and simplifies the threading model.

3. **Null safety:** Codegen requires explicit `| null` for nullable return types. Be explicit — this prevents Codegen from generating incorrect type assertions.

4. **No benchmark methods in production specs.** All `collection_PerformanceCheck*`, `collection_BatchEcho*`, and any other benchmark-only methods must remain outside the production specs.

#### Example Production Spec: `NativeCblDocument.ts`

```typescript
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  collection_Save(
    document: string,
    blobs: string,
    docId: string,
    databaseName: string,
    scopeName: string,
    collectionName: string,
    concurrencyControl: number
  ): Promise<{ _id: string; _revId: string; _sequence: number }>;

  collection_GetDocument(
    docId: string,
    databaseName: string,
    scopeName: string,
    collectionName: string
  ): Promise<{
    _id: string;
    _data: string;
    _revId: string;
    _sequence: number;
  } | null>;

  collection_DeleteDocument(
    docId: string,
    databaseName: string,
    scopeName: string,
    collectionName: string,
    concurrencyControl: number
  ): Promise<void>;

  collection_PurgeDocument(
    docId: string,
    databaseName: string,
    scopeName: string,
    collectionName: string
  ): Promise<void>;

  collection_GetBlobContent(
    key: string,
    docId: string,
    databaseName: string,
    scopeName: string,
    collectionName: string
  ): Promise<{ data: number[] }>;

  collection_GetDocumentExpiration(
    docId: string,
    databaseName: string,
    scopeName: string,
    collectionName: string
  ): Promise<{ expiration: string | null }>;

  collection_SetDocumentExpiration(
    expiration: string,
    docId: string,
    databaseName: string,
    scopeName: string,
    collectionName: string
  ): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'CouchbaseLiteDocument'
);
```

#### Example Production Spec: `NativeCblListener.ts`

```typescript
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  collection_AddChangeListener(
    changeListenerToken: string,
    collectionName: string,
    databaseName: string,
    scopeName: string
  ): Promise<void>;

  collection_AddDocumentChangeListener(
    changeListenerToken: string,
    documentId: string,
    collectionName: string,
    databaseName: string,
    scopeName: string
  ): Promise<void>;

  collection_RemoveChangeListener(
    changeListenerToken: string
  ): Promise<void>;

  query_AddChangeListener(
    changeListenerToken: string,
    query: string,
    parameters: string,
    databaseName: string
  ): Promise<void>;

  query_RemoveChangeListener(
    changeListenerToken: string
  ): Promise<void>;

  replicator_AddChangeListener(
    changeListenerToken: string,
    replicatorId: string
  ): Promise<void>;

  replicator_AddDocumentChangeListener(
    changeListenerToken: string,
    replicatorId: string
  ): Promise<void>;

  replicator_RemoveChangeListener(
    changeListenerToken: string,
    replicatorId: string
  ): Promise<void>;

  listenerToken_Remove(
    changeListenerToken: string
  ): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'CouchbaseLiteListener'
);
```

#### Example Production Spec: `NativeCblDatabase.ts`

```typescript
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  database_Open(
    name: string,
    directory: string | null,
    encryptionKey: string | null
  ): Promise<{ databaseUniqueName: string }>;

  database_Close(name: string): Promise<void>;

  database_Delete(name: string): Promise<void>;

  database_DeleteWithPath(
    databaseName: string,
    directory: string
  ): Promise<void>;

  database_Copy(
    path: string,
    newName: string,
    directory: string | null,
    encryptionKey: string | null
  ): Promise<void>;

  database_Exists(
    name: string,
    directory: string
  ): Promise<{ exists: boolean }>;

  database_GetPath(name: string): Promise<{ path: string }>;

  database_PerformMaintenance(
    maintenanceType: number,
    databaseName: string
  ): Promise<void>;

  database_ChangeEncryptionKey(
    newKey: string,
    databaseName: string
  ): Promise<void>;

  file_GetDefaultPath(): Promise<{ path: string }>;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'CouchbaseLiteDatabase'
);
```

### 2.3 Codegen Setup Plan

**Step 1: Clean `src/specs/`**

Remove or relocate:
- `NativeCblSwift.ts` → delete entirely (benchmark experiment, no production use)
- All `collection_PerformanceCheck*`, `collection_BatchEcho*` methods from any existing spec
- All object-wrapping (`args: { ... }`) patterns — rewrite as flat params

**Step 2: Update `codegenConfig` in `package.json`**

```json
"codegenConfig": {
  "name": "CouchbaseLiteSpec",
  "type": "modules",
  "jsSrcsDir": "src/specs",
  "android": {
    "javaPackageName": "com.cblreactnative.codegen"
  },
  "ios": {
    "outputDir": "ios/generated"
  }
}
```

Note: Use a separate `javaPackageName` (`com.cblreactnative.codegen`) for generated code to avoid collisions with the existing `com.cblreactnative` package.

**Step 3: Run Codegen and verify outputs**

```bash
# From project root
npx react-native codegen
```

iOS output (in `ios/generated/`):
- `CouchbaseLiteSpec.h` — ObjC protocol definitions for each module
- Protocol methods matching every spec method signature
- `NativeCouchbaseLiteDatabaseSpecJSI` C++ class (used in `getTurboModule:`)

Android output (in `android/build/generated/`):
- Abstract Kotlin/Java class per spec: `NativeCouchbaseLiteDatabaseSpec`, `NativeCouchbaseLiteDocumentSpec`, etc.
- Each abstract class has one abstract method per spec method
- The generated class extends `ReactContextBaseJavaModule` + implements `TurboModule`

**Step 4: Update `cbl-reactnative.podspec`**

The podspec already uses `install_modules_dependencies(s)` which handles Codegen deps for RN >=0.71. Ensure:
- `s.source_files` includes `"ios/generated/**/*.{h,m,mm}"` or the generated directory is in the header search path
- `HEADER_SEARCH_PATHS` includes the Codegen output directory

**Step 5: Update Android `build.gradle`**

Ensure the Codegen output directory is included in the source sets. The React Native Gradle plugin handles this automatically when `newArchEnabled=true` is set in `gradle.properties`.

**Step 6: Add Codegen verification to CI**

```bash
# CI step: verify Codegen output is up to date
npx react-native codegen
git diff --exit-code ios/generated/ android/build/generated/
```

This fails the build if specs changed without updating generated files.

### 2.4 iOS-Specific Migration Plan

#### Current iOS File Structure

```
ios/
├── CblReactnative.mm             ← Legacy: 60+ RCT_EXTERN_METHOD declarations
├── CblReactnative.swift           ← Legacy: 2031-line monolith, RCTEventEmitter
├── CblReactnative-Bridging-Header.h
├── CollectionArgs.swift            ← Shared argument types
├── DataAdapter.swift               ← Shared data conversion (singleton)
├── DocumentArgs.swift
├── IndexArgs.swift
├── QueryArgs.swift
├── ScopeArgs.swift
├── cbl-js-swift/                   ← Submodule: DatabaseManager, CollectionManager, etc.
├── turbo/                          ← "Turbo v1" (legacy pattern, NOT real Turbo) — REMOVE
└── turbo-v2/                       ← Benchmark experiment only — REMOVE
```

#### Target iOS File Structure

```
ios/
├── CblReactnative.mm              ← RETAINED during Phases 1-3 (removed Phase 4)
├── CblReactnative.swift            ← RETAINED during Phases 1-3 (removed Phase 4)
├── CblReactnative-Bridging-Header.h ← Updated in Phase 4
├── generated/                      ← Codegen output (auto-generated, do not edit)
│   ├── CouchbaseLiteSpec.h
│   └── CouchbaseLiteSpec-generated.mm
├── shared/                         ← Extracted from root ios/ in Phase 1
│   ├── DataAdapter.swift
│   ├── CollectionArgs.swift
│   ├── DocumentArgs.swift
│   ├── IndexArgs.swift
│   ├── QueryArgs.swift
│   └── ScopeArgs.swift
├── cbl-js-swift/                   ← Submodule (unchanged)
├── turbo-modules/                  ← NEW in Phase 2
│   ├── CblDatabaseModule.swift     ← implements NativeCouchbaseLiteDatabaseSpec
│   ├── CblDatabaseModule.mm        ← getTurboModule: + ObjC delegate methods
│   ├── CblCollectionModule.swift
│   ├── CblCollectionModule.mm
│   ├── CblDocumentModule.swift
│   ├── CblDocumentModule.mm
│   ├── CblQueryModule.swift
│   ├── CblQueryModule.mm
│   ├── CblReplicatorModule.swift
│   ├── CblReplicatorModule.mm
│   ├── CblScopeModule.swift
│   ├── CblScopeModule.mm
│   ├── CblLoggingModule.swift
│   ├── CblLoggingModule.mm
│   ├── CblListenerModule.swift
│   └── CblListenerModule.mm
├── turbo/                          ← REMOVED in Phase 4
└── turbo-v2/                       ← REMOVED in Phase 4
```

#### Key iOS Pattern: ObjC++ Bridge File Structure

Every Turbo Module on iOS requires two files:

**`CblDocumentModule.mm` (ObjC++ bridge — the critical piece):**

```objc
#import <React/RCTBridgeModule.h>
#import <ReactCommon/RCTTurboModule.h>
#import <ReactCommon/RCTUtils.h>

// Codegen-generated protocol:
#import "CouchbaseLiteSpec/CouchbaseLiteSpec.h"

// Swift implementation class bridging header:
#import "cbl_reactnative-Swift.h"

@interface CblDocumentModule : NSObject <NativeCouchbaseLiteDocumentSpec, RCTTurboModule>
@end

@implementation CblDocumentModule

RCT_EXPORT_MODULE(CouchbaseLiteDocument)

/**
 * THE CRITICAL METHOD that makes this a REAL Turbo Module.
 * Returns a C++ JSI binding generated by Codegen.
 * Without this method, the module falls back to legacy bridge dispatch.
 */
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeCouchbaseLiteDocumentSpecJSI>(params);
}

// Delegate to Swift implementation:
- (void)collection_Save:(NSString *)document
                  blobs:(NSString *)blobs
                  docId:(NSString *)docId
           databaseName:(NSString *)databaseName
              scopeName:(NSString *)scopeName
         collectionName:(NSString *)collectionName
      concurrencyControl:(double)concurrencyControl
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
  [CblDocumentModuleImpl.shared
    saveDocument:document blobs:blobs docId:docId
    databaseName:databaseName scopeName:scopeName
    collectionName:collectionName
    concurrencyControl:concurrencyControl
    resolve:resolve reject:reject];
}

// ... (one delegate per spec method)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

@end
```

**`CblDocumentModule.swift` (Swift implementation):**

```swift
import Foundation
import CouchbaseLiteSwift

@objc(CblDocumentModuleImpl)
class CblDocumentModuleImpl: NSObject {
  
  @objc static let shared = CblDocumentModuleImpl()
  
  // Document operations use a serial queue for thread safety
  // All methods dispatch to this queue and resolve the promise from within it
  private let documentQueue = DispatchQueue(
    label: "com.cblite.turbo.document",
    qos: .userInitiated
  )
  
  @objc func saveDocument(
    _ document: String,
    blobs: String,
    docId: String,
    databaseName: String,
    scopeName: String,
    collectionName: String,
    concurrencyControl: Double,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    documentQueue.async {
      do {
        let blobsDict = try CollectionManager.shared.blobsFromJsonString(blobs)
        let cc = DataAdapter.shared.toConcurrencyControl(Int(concurrencyControl))
        let result = try CollectionManager.shared.saveDocument(
          docId,
          document: document,
          blobs: blobsDict,
          concurrencyControl: cc,
          collectionName: collectionName,
          scopeName: scopeName,
          databaseName: databaseName
        )
        resolve(["_id": result.id, "_revId": result.revId ?? "", "_sequence": result.sequence])
      } catch {
        reject("DOCUMENT_ERROR", error.localizedDescription, nil)
      }
    }
  }
  
  // ... remaining methods follow the same async pattern
}
```

#### Critical iOS Rule: `requiresMainQueueSetup`

All new Turbo Modules must return `false` from `requiresMainQueueSetup`. This was already done in the legacy `CblReactnative.mm`. It must be explicit in every new module's `.mm` file.

#### iOS Threading Model

Each module gets its own dedicated serial `DispatchQueue`. All methods on a module dispatch to that module's queue and resolve the Promise from within the queue:

| Module | Queue Label | QoS |
|--------|-------------|-----|
| `CblDatabaseModule` | `com.cblite.turbo.database` | `.userInitiated` |
| `CblCollectionModule` | `com.cblite.turbo.collection` | `.userInitiated` |
| `CblDocumentModule` | `com.cblite.turbo.document` | `.userInitiated` |
| `CblQueryModule` | `com.cblite.turbo.query` | `.utility` |
| `CblReplicatorModule` | `com.cblite.turbo.replicator` | `.background` |
| `CblScopeModule` | `com.cblite.turbo.scope` | `.userInitiated` |
| `CblLoggingModule` | `com.cblite.turbo.logging` | `.background` |
| `CblListenerModule` | `com.cblite.turbo.listener` | `.userInitiated` |

Rationale for serial queues:
- Database open/close must be serialized to prevent concurrent access on initialization
- `MutableDocument` objects must be created, mutated, and saved in a single serial execution
- Listener registration/deregistration must be atomic
- Query execution can be concurrent with CRUD (CBL 3.x has internal locking) but serial within the query domain prevents result set confusion

### 2.5 Android-Specific Migration Plan

#### Current Android File Structure

```
android/src/main/java/com/cblreactnative/
├── CblReactnativeModule.kt        ← Legacy: 1838-line monolith
├── CblReactnativePackage.kt       ← ReactPackage: registers legacy + v1 turbo
├── CblReactnativeTurboPackage.kt  ← TurboReactPackage: v1 experiment
├── DataAdapter.kt                  ← Shared data conversion
├── DataValidation.kt               ← Input validation
├── IndexDto.kt                     ← Index DTO
├── cbl-js-kotlin/                  ← Submodule: DatabaseManager, CollectionManager, etc.
└── turbo/
    ├── CouchbaseLiteDatabaseModule.kt
    └── CouchbaseLiteCollectionModule.kt
```

#### Target Android File Structure

```
android/src/main/java/com/cblreactnative/
├── CblReactnativeModule.kt        ← RETAINED Phases 1-3 (removed Phase 4)
├── CblReactnativePackage.kt       ← Updated to register both legacy and turbo modules
├── CblReactnativeTurboPackage.kt  ← Updated with 8 new turbo modules
├── shared/
│   ├── DataAdapter.kt
│   ├── DataValidation.kt
│   └── IndexDto.kt
├── cbl-js-kotlin/                  ← Submodule (unchanged)
├── turbo/                          ← REMOVED in Phase 4
└── turbo-modules/
    ├── CblDatabaseTurboModule.kt   ← extends NativeCouchbaseLiteDatabaseSpec
    ├── CblCollectionTurboModule.kt
    ├── CblDocumentTurboModule.kt
    ├── CblQueryTurboModule.kt
    ├── CblReplicatorTurboModule.kt
    ├── CblScopeTurboModule.kt
    ├── CblLoggingTurboModule.kt
    └── CblListenerTurboModule.kt
```

#### Key Android Pattern: Codegen-Based Turbo Module

With Codegen, React Native generates an abstract class per spec (e.g., `NativeCouchbaseLiteDatabaseSpec`). The implementation **must extend this abstract class**, not `ReactContextBaseJavaModule` directly:

```kotlin
@ReactModule(name = CblDatabaseTurboModule.NAME)
class CblDatabaseTurboModule(reactContext: ReactApplicationContext) :
    NativeCouchbaseLiteDatabaseSpec(reactContext) {

    // CoroutineScope with lifecycle — NOT GlobalScope
    private val scope = CoroutineScope(
        SupervisorJob() +
        Dispatchers.IO +
        CoroutineName("CblDatabase")
    )

    override fun getName(): String = NAME

    /**
     * CRITICAL: Called by RN when module is torn down.
     * Cancel all pending coroutines to prevent leaks.
     */
    override fun invalidate() {
        scope.cancel("Module invalidated")
        super.invalidate()
    }

    override fun database_Open(
        name: String,
        directory: String?,
        encryptionKey: String?,
        promise: Promise
    ) {
        scope.launch {
            try {
                if (!DataValidation.validateDatabaseName(name, promise)) return@launch
                val config = DataAdapter.toDatabaseConfigJson(directory, encryptionKey)
                val uniqueName = DatabaseManager.openDatabase(name, config, reactApplicationContext)
                val result = Arguments.createMap()
                result.putString("databaseUniqueName", uniqueName)
                // NOTE: No runOnUiQueueThread — Turbo promise resolves from any thread
                promise.resolve(result)
            } catch (e: Throwable) {
                promise.reject("DATABASE_ERROR", e.message)
            }
        }
    }

    // ... remaining overrides

    companion object {
        const val NAME = "CouchbaseLiteDatabase"
    }
}
```

#### Critical Android Changes vs. Current Code

| Current Pattern | Turbo Pattern | Reason |
|----------------|---------------|--------|
| `GlobalScope.launch(Dispatchers.IO)` | `scope.launch` (module-scoped) | Lifecycle management, cancellation |
| `context.runOnUiQueueThread { promise.resolve(...) }` | `promise.resolve(...)` directly | No thread hop needed in Turbo |
| `extends ReactContextBaseJavaModule` | `extends NativeCouchbaseLiteXxxSpec` | Required for JSI binding |
| No `invalidate()` implementation | `override fun invalidate()` | Cleanup coroutines + listeners |
| Single monolith class | 8 domain-specific classes | Domain isolation, lazy loading |

#### Updated `CblReactnativeTurboPackage.kt`

```kotlin
class CblReactnativeTurboPackage : TurboReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return when (name) {
            CblDatabaseTurboModule.NAME -> CblDatabaseTurboModule(reactContext)
            CblCollectionTurboModule.NAME -> CblCollectionTurboModule(reactContext)
            CblDocumentTurboModule.NAME -> CblDocumentTurboModule(reactContext)
            CblQueryTurboModule.NAME -> CblQueryTurboModule(reactContext)
            CblReplicatorTurboModule.NAME -> CblReplicatorTurboModule(reactContext)
            CblScopeTurboModule.NAME -> CblScopeTurboModule(reactContext)
            CblLoggingTurboModule.NAME -> CblLoggingTurboModule(reactContext)
            CblListenerTurboModule.NAME -> CblListenerTurboModule(reactContext)
            else -> null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            listOf(
                CblDatabaseTurboModule.NAME,
                CblCollectionTurboModule.NAME,
                CblDocumentTurboModule.NAME,
                CblQueryTurboModule.NAME,
                CblReplicatorTurboModule.NAME,
                CblScopeTurboModule.NAME,
                CblLoggingTurboModule.NAME,
                CblListenerTurboModule.NAME,
            ).associate { name ->
                name to ReactModuleInfo(
                    name,
                    name,
                    false, // canOverrideExistingModule
                    false, // needsEagerInit
                    true,  // isCxxModule
                    true   // isTurboModule
                )
            }
        }
    }
}
```

### 2.6 JSI Layer Considerations

#### What JSI Provides vs. Legacy Bridge

| Aspect | Legacy Bridge | Turbo Module (JSI) |
|--------|---------------|-------------------|
| Call dispatch | Async message queue | Direct C++ function call |
| Serialization | Full JSON round-trip every call | Typed values via `jsi::Value` |
| Thread dispatch | Bridge thread → Native queue → UI thread redirect | JS thread → Native queue directly |
| Sync methods | Not possible | **Not used in this migration (async-only policy)** |
| Type safety | Runtime deserialization errors | Compile-time via Codegen |
| Lazy loading | All modules loaded at startup | Loaded on first use (`TurboModuleRegistry.get`) |
| Memory model | Bridge retains all args during flight | Direct value passing, no intermediate copies |
| Promise resolution | Must hop to UI thread on Android | Can resolve from any thread |

#### JSI Threading Rules (Non-Negotiable)

1. `jsi::Runtime` **must only be accessed from the JS thread.** Never call `jsi::Value` methods from a background queue.
2. All methods return `Promise` and dispatch to native queues. The JS thread is never blocked.
3. Event callbacks from native to JS **must be invoked via** the JS CallInvoker (`jsCallInvoker->invokeAsync`), not directly.
4. `promise.resolve()` and `promise.reject()` in Turbo Modules are thread-safe — no UI thread redirect needed (unlike legacy).

#### All Methods Are Async (No Exceptions)

Every method across all 8 modules returns a `Promise`. This policy applies without exception — including operations that could theoretically return quickly such as `collection_GetCount`, `database_GetPath`, or `database_Exists`. The reasons are:

- **Consistency:** A uniform async contract means consumer code never needs to branch on method type
- **Safety:** Even "fast" operations may hit I/O on cold cache (SQLite page fault, file stat). Making them synchronous would block the JS engine unpredictably
- **Simplicity:** One threading model everywhere — dispatch to native queue, resolve Promise — removes an entire class of edge cases
- **Future-proofing:** If a method's implementation needs to become I/O-heavy later, its signature doesn't change

### 2.7 Event/Listener Design for Turbo Modules

#### Current Event Architecture

```
Native CBL SDK fires callback
  → Native code creates result map
  → Dispatches to UI thread (iOS: via sendEvent, Android: via RCTDeviceEventEmitter)
  → Event crosses legacy bridge queue
  → JS NativeEventEmitter receives event
  → CblReactNativeEngine dispatches to registered callbacks by token
```

#### Turbo Module Event Architecture

```
Native CBL SDK fires callback
  → Native code creates result map
  → Uses JSI CallInvoker to schedule on JS thread
  → CblReactNativeEngine listener callback invoked directly
```

**Implementation detail:** The `CblListenerTurboModule` holds a reference to the `CallInvoker` from the `ReactApplicationContext` (Android) / the `RCTCallInvoker` from the bridge (iOS). When a CBL change event fires:

1. Native creates the event payload as a native map
2. Calls `jsCallInvoker->invokeAsync([eventName, payload]{ /* send to JS */ })`
3. On next JS microtask turn, JS listener callback executes

This eliminates the legacy event bus entirely while maintaining the same token-based dispatch pattern in `CblReactNativeEngine.tsx`.

**Important:** The six event types (`collectionChange`, `collectionDocumentChange`, `queryChange`, `replicatorStatusChange`, `replicatorDocumentChange`, `customLogMessage`) remain unchanged at the TypeScript API surface. Only the internal delivery mechanism changes.

### 2.8 Coexistence Buffer Strategy

> **This is a first-class architectural feature, not a transitional hack.**
> 
> The Coexistence Buffer provides a defined, production-safe mechanism to run Legacy Bridge and Turbo Modules simultaneously on a per-domain basis. It exists to give a safe fallback at every point in the migration and to allow gradual rollout without a big-bang cutover.

#### What the Coexistence Buffer Is

The Coexistence Buffer is a per-domain runtime switch built into `CblReactNativeEngine.tsx`. For each of the 8 API domains, the engine can route calls to either:
- **Turbo path:** calls the corresponding Turbo Module via `TurboModuleRegistry.getEnforcing`
- **Legacy path:** calls `NativeModules.CblReactnative` as before

Both the legacy module and all Turbo Modules are registered and available simultaneously during Phases 2 and 3. The buffer determines which one is actually called.

#### Buffer Design

```typescript
// src/coexistence-buffer.ts

/**
 * Per-domain feature flags controlling which bridge path is active.
 * Each domain can be independently toggled between Legacy and Turbo.
 * 
 * During Phase 2: all false (legacy for everything)
 * During Phase 3: domains flipped to true one at a time
 * After Phase 4: this file is deleted entirely
 */
export const TURBO_DOMAINS = {
  database: false,   // database_* and file_* methods
  collection: false, // collection_Create/Delete/Get/etc. (non-document)
  document: false,   // collection_Save/GetDocument/Delete/Purge/Blob/Expiration
  query: false,      // query_Execute/Explain
  replicator: false, // replicator_Create/Start/Stop/etc.
  scope: false,      // scope_GetDefault/GetScope/GetScopes
  logging: false,    // database_SetFileLogging/SetLogLevel/logsinks_*
  listener: false,   // all *_AddChangeListener/*_RemoveChangeListener
} as const;

export type DomainKey = keyof typeof TURBO_DOMAINS;
```

```typescript
// In CblReactNativeEngine.tsx

async database_Open(args: DatabaseOpenArgs): Promise<...> {
  if (TURBO_DOMAINS.database) {
    return DatabaseTurbo.database_Open(args.name, args.directory, args.encryptionKey);
  }
  return this.CblReactNative.database_Open(args.name, args.directory, args.encryptionKey);
}
```

#### Coexistence Contract Rules

These rules must hold for the entire duration of Phases 2 and 3:

1. **Both module registrations active simultaneously.** `CblReactnativePackage` registers the legacy module. `CblReactnativeTurboPackage` registers all 8 Turbo Modules. Both are in the app's package list.

2. **Identical return shapes.** A Turbo Module method and its legacy counterpart must return values with identical shapes. If they differ, the engine's mapping layer handles normalization before returning to the caller.

3. **Identical error codes.** Error domain strings (`"DATABASE_ERROR"`, `"DOCUMENT_ERROR"`, etc.) must match between legacy and Turbo paths. Consumer code cannot depend on which path was used.

4. **No shared mutable state between paths.** The `DatabaseManager`, `CollectionManager`, and `ReplicatorManager` singletons are shared between the legacy and Turbo paths (they are the same underlying managers). This is intentional — both paths operate on the same native CBL state. Listener tokens, however, must be managed separately per path and must not be mixed.

5. **Listener domain atomicity.** When `TURBO_DOMAINS.listener` is flipped to `true`, ALL listener operations move to the Turbo path simultaneously. Never mix listener registration paths (e.g., register on legacy, remove on Turbo) — this would leave dangling native tokens.

6. **Domain pairs:** The `document` domain covers all document-level operations. The `collection` domain covers structural operations (create/delete/get collection, indexes). These can be enabled independently. However, `listener` should only be enabled after `database`, `collection`, `document`, `query`, and `replicator` are all on Turbo — because the listener module needs to reference Turbo-path objects.

#### Emergency Rollback Procedure

If any Turbo domain shows unexpected behaviour in production:

1. Set the corresponding `TURBO_DOMAINS` flag back to `false`
2. Ship a hotfix build — no native code change required
3. Investigate the issue against the legacy path
4. Re-enable once fixed and validated

This rollback can be done in minutes and requires only a JS bundle update (no app store resubmission if using OTA updates).

#### Buffer Lifetime

| Phase | Buffer State |
|-------|-------------|
| Phase 1 | Buffer infrastructure added to codebase; all domains set to `false` |
| Phase 2 | All domains still `false`; Turbo Modules are built and registered but not called |
| Phase 3 | Domains flipped to `true` one at a time as each passes validation |
| Phase 4 | All domains are `true`; legacy module removed; buffer deleted |

---

## 3. Couchbase-Specific Concerns

### 3.1 What Must Move to JSI vs. What Remains Native

| Layer | Where It Runs | Notes |
|-------|--------------|-------|
| TypeScript API surface (Database, Collection, Document, etc.) | JS thread | Application-level calls |
| Turbo Module specs (NativeCblXxx.ts) | JSI bridge layer | Codegen-enforced type contract |
| Module implementations (Swift/Kotlin) | Native dispatch queues | Thin dispatchers to SDK managers |
| `DataAdapter`, `DataValidation` (shared layer) | Native | Data conversion utilities |
| `DatabaseManager`, `CollectionManager`, `ReplicatorManager` (submodules) | Native | Stateful SDK object lifecycle |
| CouchbaseLiteSwift 3.3 SDK (iOS) | Native | Actual database engine |
| Couchbase Lite Android 3.3 SDK (Android) | Native | Actual database engine |
| LiteCore C++ core (inside SDK) | Native | SQLite, Fleece, WebSocket |

**Nothing from the Couchbase Lite SDK moves to JSI.** JSI is purely the call dispatch and argument passing mechanism. All database state, handles, query execution, and replication happen entirely in native code.

### 3.2 Database Handle Safety

**Current Pattern (Keep):**
Databases are identified by string names. `DatabaseManager.shared.getDatabase("mydb")` returns a cached `Database` instance from an internal `[String: Database]` dictionary. There are no raw pointers crossing the bridge.

**Why raw pointer handles must never be used in production:**
Passing native object pointers as numeric handles across the bridge is inherently unsafe:
- JavaScript `number` is IEEE 754 double-precision floating point. Values > 2^53 (approximately 9 quadrillion) lose integer precision. Modern 64-bit pointer addresses routinely exceed 2^53.
- No automatic cleanup: JS GC has no way to call `CBLDatabase_Release`
- No protection against use-after-free if JS holds a stale handle
- No thread affinity enforcement on the handle

**Continue using string-based identifiers as opaque handles:**
- Database: `"mydb"` (the user-provided name)
- Replicator: UUID strings (e.g., `"repl_550e8400-e29b-41d4-a716"`)
- Listener: UUID strings (e.g., `"listener_550e8400-e29b-41d4-a716"`)

The native `DatabaseManager`/`ReplicatorManager` singletons manage the actual object lifecycle. String handles are safe, garbage-collectable, and printable for debugging.

### 3.3 Threading Safety for Couchbase Lite

**CBL 3.x Thread Safety Guarantees:**
- `Database` operations are internally synchronized (thread-safe since CBL 3.0)
- `MutableDocument`: NOT thread-safe. Must be created, populated, and saved within a single serial execution context.
- `Replicator`: Thread-safe for start/stop/getStatus calls
- `Collection`: Thread-safe for reads. Mutations internally synchronized.
- `Query`: Thread-safe for `execute()`. `ResultSet` iteration: NOT thread-safe.
- `ListenerToken`: Thread-safe for `remove()`

**Threading Strategy Per Domain:**

```
Database Module Queue (serial, userInitiated):
  database_Open → DatabaseManager.openDatabase (may create SQLite file)
  database_Close → DatabaseManager.closeDatabase (flushes SQLite WAL)
  database_ChangeEncryptionKey → long-running, must not interrupt other DB ops

Document Module Queue (serial, userInitiated):
  collection_Save → creates MutableDocument, saves to collection
  collection_GetDocument → reads from collection, iterates fields
  collection_DeleteDocument → gets doc by ID, marks deleted
  (MutableDocument never leaves this queue)

Query Module Queue (serial, utility):
  query_Execute → creates Query, executes, iterates ResultSet to JSON
  query_Explain → same
  (ResultSet fully consumed within queue before return)

Replicator Module Queue (serial, background):
  replicator_Create → builds ReplicatorConfig, creates Replicator
  replicator_Start → CBL starts internal background threads
  replicator_Stop → CBL stops internal threads
  (Replicator handles itself have internal thread safety)

Listener Module Queue (serial, userInitiated):
  addChangeListener → attaches native listener to CBL object
  removeChangeListener → removes native listener
  (Token dictionary mutations serialized by this queue)
  
  Event callbacks fire on CBL's internal thread pool.
  They MUST dispatch to the JSI CallInvoker (JS thread) for delivery.
  They must NOT attempt to call back into this listener queue (deadlock risk).
```

### 3.4 `MutableDocument` Lifecycle (Critical)

The most common threading violation in CBL applications:

```swift
// WRONG - MutableDocument escapes the creation context
let doc = MutableDocument(id: docId)  // Created on queue A
DispatchQueue.global().async {
  try col.save(document: doc)  // Used on queue B - CRASH or data corruption
}

// CORRECT - MutableDocument lives entirely within one queue
documentQueue.async {
  let doc = MutableDocument(id: docId)  // Created on documentQueue
  doc.setString(value, forKey: key)
  try col.save(document: doc)  // Saved on same queue
  // doc goes out of scope here - never crosses queue boundary
}
```

This constraint is already handled correctly in the current `CblReactnative.swift` (everything in `backgroundQueue.async`). The Turbo Module implementation must maintain this invariant by ensuring `collection_Save` creates and destroys `MutableDocument` within the single document queue dispatch.

### 3.5 ResultSet Lifecycle (Critical)

```swift
// WRONG - ResultSet used outside the query queue
let results = try query.execute()
documentQueue.async {
  while results.next() {  // ResultSet accessed from different queue - undefined behavior
    // ...
  }
}

// CORRECT - ResultSet fully consumed within query queue
queryQueue.async {
  let results = try query.execute()
  var jsonRows: [String] = []
  while results.next() {  // Consumed immediately on same queue
    jsonRows.append(results.toJSON())
  }
  resolve("[" + jsonRows.joined(separator: ",") + "]")
  // results goes out of scope here
}
```

### 3.6 Live Queries / Streaming

**Current Implementation:**
```
JS: query_AddChangeListener(token, query, params, dbName)
  → Native: creates Query object, attaches addChangeListener
  → CBL SDK fires callback on internal thread when results change
  → Native: serializes results to JSON, emits event with token
  → JS: CblReactNativeEngine matches token to callback
```

**Turbo Module Enhancement:**

1. **Incremental result delivery for large result sets:**

   The current `allResultsChunkSize: Int = 256` hint in `CblReactnative.swift` was never implemented. In the Turbo Module listener implementation, add chunked delivery:
   
   ```swift
   // First event: metadata
   emitEvent("queryChange", ["token": token, "status": "started", "totalRows": count])
   
   // Data chunks
   stride(from: 0, to: rows.count, by: 256).forEach { offset in
     let chunk = Array(rows[offset..<min(offset + 256, rows.count)])
     emitEvent("queryChange", ["token": token, "status": "data", "rows": chunk, "offset": offset])
   }
   
   // Completion
   emitEvent("queryChange", ["token": token, "status": "complete"])
   ```

2. **Query object lifecycle management:**
   The `Query` object must remain alive for the lifetime of the live query listener. Store it alongside the `ListenerToken` in the listener registry:
   ```swift
   struct LiveQueryRecord {
     let query: Query
     let listenerToken: ListenerToken
   }
   var liveQueryRegistry: [String: LiveQueryRecord] = [:]
   ```

3. **Cancellation safety:**
   When `query_RemoveChangeListener` is called, remove the listener token AND release the `Query` object. If the module is invalidated (app backgrounded, component unmounted), iterate all live queries and clean up.

### 3.7 Replicator Lifecycle

**Replicator state machine in CBL:**
```
stopped → connecting → idle → busy → idle → stopped
```

Each state transition fires a `replicatorStatusChange` event. The listener registration pattern must survive module invalidation:

1. `replicator_Create` → Native creates `Replicator`, stores by UUID. Returns UUID.
2. `replicator_AddChangeListener(token, replicatorId)` → Attaches listener to stored Replicator. Stores token.
3. `replicator_Start(replicatorId)` → Calls `replicator.start()`. Internal CBL threads begin.
4. Status events fire → Native emits `replicatorStatusChange` events via CallInvoker.
5. `replicator_Stop(replicatorId)` → Calls `replicator.stop()`. Status transitions to `stopped`.
6. `replicator_Cleanup(replicatorId)` → Removes listener tokens, releases Replicator object.

**Order enforcement:** The module must enforce this lifecycle order. Calling `replicator_Start` before `replicator_Create` must return an error. Calling `replicator_AddChangeListener` after `replicator_Cleanup` must return an error.

### 3.8 Listener Memory Leak Prevention

**Root cause of leaks in current code:**
The `allChangeListenerTokenByUuid` dictionary is never cleaned up if:
- JS forgets to call `listenerToken_Remove`
- React component unmounts without cleanup
- App goes to background and JS context is reset

**Defense-in-depth strategy:**

1. **Module `invalidate()` cleanup:**
   ```swift
   override func invalidate() {
     listenerQueue.sync {
       allChangeListenerTokenByUuid.values.forEach { record in
         record.nativeListenerToken.remove()
       }
       allChangeListenerTokenByUuid.removeAll()
     }
   }
   ```

2. **Bounded registry size (production safeguard):**
   Log a warning if token count exceeds 100. This indicates a leak.
   ```swift
   if allChangeListenerTokenByUuid.count > 100 {
     logWarning("Listener registry has \(count) entries — possible leak")
   }
   ```

3. **JS-side defense (in `CblReactNativeEngine.tsx`):**
   Use React `useEffect` cleanup to remove all listeners when components unmount. The engine's `_emitterSubscriptions` map already tracks this — ensure it's cleaned up in all paths.

---

## 4. Risk Analysis

### 4.1 Breaking Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Codegen spec method signature doesn't match native implementation | **Critical** | Medium | Run Codegen as mandatory CI step; build fails on type mismatch |
| Legacy consumers depending on `NativeModules.CblReactnative` | **Critical** | High | Coexistence Buffer maintains legacy path through Phase 3; removal only in Phase 4 |
| iOS `source_files` glob includes both legacy and new modules causing duplicate symbol errors | **High** | Medium | Use explicit file lists in podspec; remove old files before adding new ones in Phase 4 |
| Submodule (`cbl-js-swift`, `cbl-js-kotlin`) API changes breaking turbo module implementations | **High** | Low | Pin submodule commits; isolate submodule interface in a shared adapter layer |
| `NativeEventEmitter` incompatibility with Turbo event emission | **High** | Medium | Use `RCTDeviceEventEmitter` compatible pattern throughout; test on both Old+New Arch |
| Android Codegen abstract class method signature mismatch (different nullability) | **Medium** | Medium | Verify Codegen output carefully; use `@Nullable` annotations consistently |
| iOS generated header not found (HEADER_SEARCH_PATHS incomplete) | **Medium** | High | Explicitly add `ios/generated` to search paths in podspec |
| Listener domain atomicity violation (register on legacy, remove on Turbo) | **High** | Medium | Coexistence Buffer rule: listener domain must be flipped atomically; enforce in buffer logic |

### 4.2 Memory Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Listener token leaks when JS loses reference without calling remove | **High** | `invalidate()` cleanup; bounded registry size warning; JS-side `useEffect` cleanup |
| `GlobalScope` coroutines surviving module invalidation (Android) | **High** | Replace with `CoroutineScope(SupervisorJob())` per module; cancel in `invalidate()` |
| Large query result sets held in native memory during serialization | **Medium** | Stream results in 256-row chunks; release `ResultSet` immediately after iteration |
| Dual module loading (legacy + turbo) during transition doubling native memory | **Medium** | Legacy module is fully loaded; Turbo modules are lazily instantiated. Net overhead is negligible since both share the same underlying `DatabaseManager` singletons |
| CBL `Database` instances not closed when module is invalidated | **Medium** | `DatabaseManager.invalidate()` should close all open databases; call from module `invalidate()` |

### 4.3 Deadlock Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| iOS: Listener callback fires and tries to dispatch on the same serial queue that is waiting for the callback | **High** | Listener event emission must use a **separate** event emission queue or the CallInvoker, never the same queue as the triggering operation |
| Android: `Dispatchers.IO` coroutine suspended waiting for UI thread that is blocked | **Medium** | Remove all `runOnUiQueueThread` wrappers in Turbo Modules; promise.resolve() is thread-safe |
| `DatabaseManager.getDatabase()` holding an internal lock while CBL fires a change listener that tries to call `getDatabase()` again | **Medium** | Ensure listener callbacks do not call back into the manager; emit events via opaque UUIDs only |
| Coexistence Buffer: both paths attempting to operate on the same listener token simultaneously | **Medium** | Coexistence contract: listener domain is atomic — never partially migrated |

### 4.4 Startup Performance Impact

| Factor | Direction | Magnitude | Notes |
|--------|-----------|-----------|-------|
| Turbo Modules are lazily loaded | **Positive** | Medium | First `database_Open` call triggers module init; no startup overhead if CBL not immediately needed |
| Codegen adds ~200-500ms to first Gradle/Xcode build | **Neutral** | N/A | Build-time only; zero runtime impact |
| Multiple smaller modules vs. one large module | **Neutral** | Negligible | Each module init <5ms; all 8 if used = ~40ms, comparable to current monolith |
| Removing `GlobalScope` coroutine initialization | **Positive** | Negligible | Structured scopes start on first use |
| Dual module loading during coexistence period | **Neutral** | Negligible | Both modules share underlying singletons; total native memory increase is minimal |
| `CouchbaseLite.init(context, true)` (Android) still called at first module use | **Neutral** | Medium | Consider deferring to first `database_Open` if app doesn't use CBL immediately |

### 4.5 Debugging Complexity

| Factor | Complexity | Mitigation |
|--------|-----------|------------|
| JSI calls don't appear in Chrome DevTools Network panel | **High** | Use Flipper JSI plugin; add explicit native `os.log` / `android.util.Log` at module entry points |
| Codegen-generated C++ code is hard to read and modify | **Medium** | Never modify generated code; debug at spec level and implementation level only |
| Stack traces crossing C++ / ObjC++ / Swift boundaries | **Medium** | Use structured error types with `domain` + `code` + `message`; capture native stack in error domain |
| Turbo module type mismatches fail with cryptic JSI errors | **High** | Enforce strict Codegen in CI; integration tests on every method |
| `CoroutineScope` cancellation exceptions appearing in logs (Android) | **Low** | Add `CancellationException` filtering in the coroutine exception handler |
| Multiple queues make call tracing harder | **Medium** | Add unique request IDs that flow through native → JS; log entry/exit with same ID |
| Coexistence Buffer: unclear which path was actually taken for a given call | **Medium** | Log the active path at module boundary in debug builds; add a `debug_GetActivePaths()` method in dev mode |

### 4.6 CI/CD Changes Required

1. **Enable New Architecture builds:**
   - iOS: Set `RCT_NEW_ARCH_ENABLED=1` in CI environment
   - Android: Set `newArchEnabled=true` in `expo-example/android/gradle.properties`

2. **Add Codegen verification step:**
   ```bash
   npx react-native codegen
   git diff --exit-code ios/generated/ android/build/generated/
   ```
   Fails the build if specs changed without regenerating.

3. **Dual build matrix (Phases 2-3):**
   - All `TURBO_DOMAINS` flags `false` + New Architecture (tests legacy path on New Arch)
   - All `TURBO_DOMAINS` flags `true` + New Architecture (tests full Turbo path)
   - Old Architecture (regression prevention for existing consumers)

4. **Add Turbo Module integration test suite:**
   - Every method of every module must have at least one integration test
   - Tests must run on physical device (not just simulator) for iOS

5. **Benchmark regression gate:**
   - Automated benchmark comparing Turbo vs. legacy for key operations
   - Fail the build if any operation regresses >10% vs. baseline

6. **Coexistence Buffer test matrix:**
   - CI must test all meaningful domain flag combinations (at minimum: all-legacy, all-turbo, each domain individually)

---

## 5. Migration Timeline Plan

> Note: Timeline is provided for sequencing/dependency purposes only. As stated, correctness takes priority over speed.

### Phase 1 — Preparation

**Goals:**
- Clean up spec directory to contain only production-quality specs (all async, no benchmark methods)
- Establish functioning Codegen pipeline on both platforms
- Define all 8 production TypeScript specs completely
- Extract shared code to `shared/` directories
- Add Coexistence Buffer infrastructure to `CblReactNativeEngine.tsx`
- Establish baseline benchmarks for regression detection
- Set up CI for dual-architecture builds

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 1.1 | Clean `src/specs/` | Delete `NativeCblSwift.ts` (benchmark experiment). Remove all `collection_PerformanceCheck*`, `collection_BatchEcho*` methods. Remove all object-wrapping `args: { ... }` patterns. |
| 1.2 | Write 8 production specs | `NativeCblDatabase.ts`, `NativeCblCollection.ts`, `NativeCblDocument.ts`, `NativeCblQuery.ts`, `NativeCblReplicator.ts`, `NativeCblScope.ts`, `NativeCblLogging.ts`, `NativeCblListener.ts` — all methods async, flat params, no sync methods |
| 1.3 | Verify Codegen output | Run `npx react-native codegen`. Inspect generated ObjC protocols (iOS) and abstract Kotlin/Java classes (Android). Confirm all 8 modules produce correct output. |
| 1.4 | Update `cbl-reactnative.podspec` | Ensure `HEADER_SEARCH_PATHS` includes generated directory. Verify `install_modules_dependencies` handles Codegen. Add `ios/generated/` to `source_files`. |
| 1.5 | Update Android `build.gradle` | Verify Codegen plugin is active. Confirm generated abstract classes appear in `android/build/generated/`. |
| 1.6 | Extract iOS shared code | Move `DataAdapter.swift`, `CollectionArgs.swift`, `DocumentArgs.swift`, `IndexArgs.swift`, `QueryArgs.swift`, `ScopeArgs.swift` from `ios/` root to `ios/shared/`. Update all imports. |
| 1.7 | Extract Android shared code | Move `DataAdapter.kt`, `DataValidation.kt`, `IndexDto.kt` from `android/.../cblreactnative/` to `android/.../cblreactnative/shared/`. Update all imports. |
| 1.8 | Add Coexistence Buffer | Add `src/coexistence-buffer.ts` with all 8 domain flags set to `false`. Update `CblReactNativeEngine.tsx` to route through buffer for all methods. Add `debug_GetActivePaths()` dev helper. |
| 1.9 | Set up CI | Build matrix: Old Arch + New Arch (all-legacy) + New Arch (all-turbo). All must pass. |
| 1.10 | Establish baseline benchmarks | Run CRUD benchmark (document sizes 100B/1KB/10KB/100KB, counts 1/100/1000) and query benchmark (100/500/1K/5K/10K rows). Save as `BENCHMARK_BASELINE.md`. |
| 1.11 | Audit `cbl-js-swift` submodule | Confirm `DatabaseManager`, `CollectionManager`, `ReplicatorManager` APIs match what Turbo Modules will call. Document any gaps. |
| 1.12 | Audit `cbl-js-kotlin` submodule | Same audit for Android side. |

**Phase 1 Risks:**
- Codegen may fail on complex TypeScript types (nested objects, union types). Simplify problematic types to primitives + JSON strings.
- `cbl-js-swift` and `cbl-js-kotlin` submodules may not expose all methods needed by the new domain-decomposed modules.

**Phase 1 Validation:**
- Codegen runs without errors or warnings on both platforms
- Generated code compiles (no build errors)
- Legacy module works unchanged — full `cblite-js-tests` pass rate maintained
- Coexistence Buffer is transparent (all domains `false` = identical behaviour to pre-buffer)
- CI passes for all three build configurations

### Phase 2 — Parallel Implementation

**Goals:**
- Implement all 8 Turbo Modules on iOS (async-only throughout)
- Implement all 8 Turbo Modules on Android (async-only throughout)
- Both co-exist with legacy module via Coexistence Buffer
- Coexistence Buffer domains remain `false` — Turbo Modules are built and registered but not called in production yet
- Validate each module against the legacy path before enabling

**iOS Tasks:**

| # | Task | Methods Implemented |
|---|------|-------------------|
| 2.1 | iOS `CblDatabaseModule` | `database_Open/Close/Delete/Copy/Exists/GetPath/PerformMaintenance/ChangeEncryptionKey/file_GetDefaultPath` — all using `backgroundQueue.async` |
| 2.2 | iOS `CblCollectionModule` | `collection_CreateCollection/DeleteCollection/GetCollection/GetCollections/GetDefault/GetCount/GetFullName/CreateIndex/DeleteIndex/GetIndexes` |
| 2.3 | iOS `CblDocumentModule` | `collection_Save/GetDocument/DeleteDocument/PurgeDocument/GetBlobContent/GetDocumentExpiration/SetDocumentExpiration` |
| 2.4 | iOS `CblQueryModule` | `query_Execute/Explain` |
| 2.5 | iOS `CblReplicatorModule` | `replicator_Create/Start/Stop/GetStatus/Cleanup/ResetCheckpoint/GetPendingDocumentIds/IsDocumentPending` |
| 2.6 | iOS `CblScopeModule` | `scope_GetDefault/GetScope/GetScopes` |
| 2.7 | iOS `CblLoggingModule` | `database_SetFileLoggingConfig/SetLogLevel/logsinks_SetConsole/logsinks_SetFile/logsinks_SetCustom` |
| 2.8 | iOS `CblListenerModule` | All 9 listener methods + event emission via CallInvoker |
| 2.9 | Register iOS modules | Update podspec `source_files` + bridging header |

**Android Tasks:**

| # | Task | Methods Implemented |
|---|------|-------------------|
| 2.10 | Android `CblDatabaseTurboModule` | Same as 2.1 — extends `NativeCouchbaseLiteDatabaseSpec`, uses `scope.launch` |
| 2.11 | Android `CblCollectionTurboModule` | Same as 2.2 |
| 2.12 | Android `CblDocumentTurboModule` | Same as 2.3 |
| 2.13 | Android `CblQueryTurboModule` | Same as 2.4 |
| 2.14 | Android `CblReplicatorTurboModule` | Same as 2.5 |
| 2.15 | Android `CblScopeTurboModule` | Same as 2.6 |
| 2.16 | Android `CblLoggingTurboModule` | Same as 2.7 |
| 2.17 | Android `CblListenerTurboModule` | Same as 2.8 |
| 2.18 | Update `CblReactnativeTurboPackage.kt` | Register all 8 new modules |
| 2.19 | Update `CblReactnativePackage.kt` | Keep legacy module; ensure both packages registered simultaneously |

**Implementation Order (respects dependency graph):**
1. Database (no cross-module dependencies)
2. Scope (depends on Database singleton only)
3. Collection (depends on Database + Scope)
4. Document (depends on Collection)
5. Query (depends on Database)
6. Replicator (most complex config, depends on Collection)
7. Logging (independent)
8. Listener (last — depends on all other modules for listener targets; most complex event wiring)

**Phase 2 Risks:**
- Listener module is the most complex (6 event types, bidirectional). Budget the most time here.
- The `cbl-js-swift` `DatabaseManager` singleton is accessed by multiple Turbo Modules concurrently. Verify thread safety under concurrent access from different queues.
- Android: Codegen-generated abstract class may require stub implementations of React Native internal methods not in the spec.

**Phase 2 Validation:**
- Each module passes its domain-specific unit tests with Coexistence Buffer flag set to `true` for that domain only
- A/B comparison with Buffer flag: identical results from legacy and Turbo for all test cases from `cblite-js-tests`
- No memory leaks under 100 cycles of listener register/deregister per Turbo module
- Both iOS and Android Turbo modules compile and register without errors

### Phase 3 — Gradual Feature Migration

**Goals:**
- Flip Coexistence Buffer domains to `true` one at a time
- Legacy remains fully operational as hot-rollback target for each domain
- Run complete test suite after each domain flip
- Full replication integration testing with Turbo path active

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 3.1 | Enable `TURBO_DOMAINS.database = true` | Flip database domain. Run full database API tests. If issues: flip back, investigate. |
| 3.2 | Enable `TURBO_DOMAINS.scope = true` | Flip scope domain. Run scope + database combined tests. |
| 3.3 | Enable `TURBO_DOMAINS.collection = true` | Flip collection structural domain. Run collection lifecycle tests. |
| 3.4 | Enable `TURBO_DOMAINS.document = true` | Flip document domain. Run full CRUD tests. Run benchmark comparison vs. baseline. |
| 3.5 | Enable `TURBO_DOMAINS.query = true` | Flip query domain. Run SQL++ tests. Run query benchmark vs. baseline. |
| 3.6 | Enable `TURBO_DOMAINS.replicator = true` | Flip replicator domain. Run replication tests against Docker Sync Gateway and Capella. |
| 3.7 | Enable `TURBO_DOMAINS.logging = true` | Flip logging domain. Run log sink tests including custom log callback. |
| 3.8 | Enable `TURBO_DOMAINS.listener = true` | Flip listener domain (last). Run all change listener tests. Verify all 6 event types. |
| 3.9 | Full regression sweep | Run complete `cblite-js-tests` suite with all domains on Turbo. Target: identical pass rate to legacy. |
| 3.10 | 72-hour soak test | Continuous replication with all Turbo domains active. Monitor memory (should be flat). |
| 3.11 | Benchmark comparison | Compare Turbo vs. Legacy for all operations in baseline. Expect improvement or parity. |

**Phase 3 Risks:**
- Subtle behavioural differences between legacy and turbo (error message formats, empty vs. null returns, timing of event delivery).
- Event delivery timing differences could affect UI components that depend on specific event ordering.
- The `customLogMessage` event has a different registration pattern — verify end-to-end in Turbo.

**Phase 3 Validation:**
- Full `cblite-js-tests` pass rate: 100% (same as legacy baseline)
- Benchmark results: no operation regresses >10% vs. baseline
- Memory: no growth after 72-hour soak test with all Turbo domains active
- All 6 event types verified firing correctly through Turbo listener path
- Rollback test: flip any domain back to `false` and verify immediate reversion to legacy behaviour

### Phase 4 — Full Cutover

**Goals:**
- Remove all legacy bridge code
- Remove Coexistence Buffer
- Remove all experimental turbo v1 and v2 code
- Ship as a clean New Architecture library

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 4.1 | Remove `ios/CblReactnative.mm` | The ObjC++ bridge file with 60+ `RCT_EXTERN_METHOD` declarations |
| 4.2 | Remove `ios/CblReactnative.swift` | The 2031-line Swift monolith extending `RCTEventEmitter` |
| 4.3 | Remove `ios/turbo/` directory | Experimental v1 pseudo-turbo modules |
| 4.4 | Remove `ios/turbo-v2/` directory | Swift SDK benchmark experiment modules |
| 4.5 | Remove `android/.../CblReactnativeModule.kt` | The 1838-line Android monolith |
| 4.6 | Remove `android/.../turbo/` directory | Experimental v1 pseudo-turbo modules |
| 4.7 | Update `CblReactnativePackage.kt` | Remove legacy module registration; keep only `CblReactnativeTurboPackage` |
| 4.8 | Remove `src/coexistence-buffer.ts` | No more conditional paths — Turbo is the only path |
| 4.9 | Simplify `CblReactNativeEngine.tsx` | Remove all `if (TURBO_DOMAINS.xxx)` branches; single Turbo path only |
| 4.10 | Remove `NativeModules` import | Remove `NativeModules.CblReactnative` entirely from engine |
| 4.11 | Update `cbl-reactnative.podspec` | Remove `RCT_NEW_ARCH_ENABLED` conditional branches; single New Architecture code path |
| 4.12 | Update `package.json` | Change `"create-react-native-library": { "type": "module-legacy" }` → `"module-new-arch"` |
| 4.13 | Update minimum requirements | Document: React Native >=0.73, New Architecture required |
| 4.14 | Remove `react-native.config.js` | Legacy dependency config not needed for pure Turbo library |
| 4.15 | Update README | Document New Architecture requirement; update installation instructions |
| 4.16 | Update CHANGELOG | Major version bump to 2.0.0 (breaking change: requires New Architecture) |

**Phase 4 Risks:**
- Consumers of the library who haven't migrated to New Architecture will break on version 2.0.0. Must communicate via CHANGELOG, migration guide, and deprecation warnings in 1.x.
- Any remaining references to `NativeModules.CblReactnative` in consumer apps will produce `null` reference errors.

**Phase 4 Validation:**
- Clean build on both platforms with zero legacy code
- `grep -r "RCT_EXTERN_METHOD\|NativeModules\|ReactContextBaseJavaModule\|GlobalScope\|TURBO_DOMAINS" src/ ios/ android/` returns 0 results
- Full test suite passes on clean install
- `npx react-native doctor` shows New Architecture enabled

### Phase 5 — Cleanup & Optimization

**Goals:**
- Improve serialization for large payloads
- Add production observability
- Clean benchmark infrastructure
- Future-proof for React Native Fabric

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 5.1 | Optimize document serialization | Profile JSON serialization cost at production document sizes. Consider passing pre-serialized Fleece bytes directly via `jsi::ArrayBuffer` instead of JSON string round-trip for large documents (>10KB). |
| 5.2 | Implement native batch operations | Add `collection_BatchSave`, `collection_BatchGet`, `collection_BatchDelete` to `NativeCblDocument.ts` spec as production-quality methods (all async). Process arrays in a single bridge call with a single native transaction. |
| 5.3 | Optimize event emission | Profile event delivery latency. For high-frequency replication status events, consider debouncing at native level before emitting to JS. |
| 5.4 | Add per-request tracing | Add optional `requestId` parameter to all methods. Native logs entry/exit with requestId for performance profiling. |
| 5.5 | Audit and fix listener lifecycle | Instrument token registry; add `debug_GetListenerCount` method for development builds. |
| 5.6 | Remove 20+ benchmark test screens | Clean `expo-example/app/database/` of all benchmark test files. Move to a separate `expo-example-benchmark/` app if benchmark tooling is still needed. |
| 5.7 | Update CONTRIBUTING.md | Document Turbo Module development patterns, Codegen workflow, async-only contract, testing requirements. |
| 5.8 | Fabric compatibility check | Verify all modules work correctly with Fabric renderer (concurrent mode). Ensure no assumptions about synchronous rendering. |

---

## 6. Validation Strategy

### 6.1 Legacy vs. Turbo Performance Comparison

**Methodology:**

Use the same measurement infrastructure already built in `expo-example/app/database/`. All measurements taken on physical device (iPhone 16 for iOS, equivalent Android flagship), release build, repeated 3 times with median reported.

**Async Echo Benchmark (Bridge Overhead Isolation):**

```
Test: Call async echo() with "hello world" string (Promise-based roundtrip)
Measure: Roundtrip latency (JS call → async native dispatch → Promise resolve → JS)
Iterations: 1,000 / 10,000 / 100,000
Metrics: median latency (ms), calls/second, overhead per call (μs)

Legacy path:  JS → Bridge Queue → Native → UI Thread redirect → Bridge → JS
Turbo path:   JS → JSI direct → Native Queue → promise.resolve() → JS (no UI redirect)

Expected: Turbo async measurably faster due to eliminated bridge queue and UI thread redirect
```

**Document CRUD Benchmark:**

```
Test Matrix:
  Doc sizes: 100B, 1KB, 10KB, 100KB, 1MB (5 sizes)
  Doc counts: 1, 10, 100, 1000 (4 counts)
  Operations: Save, Get, Update (Save existing), Delete (4 operations)
  
  Total: 5 × 4 × 4 = 80 test cases

Metrics per test:
  - Total operation time (ms)
  - Per-operation time (ms)
  - Bridge overhead contribution (ms) [isolated via echo baseline]
  - Native operation time (ms) [total - bridge overhead]
  - Throughput (docs/sec)

Pass criterion: Turbo total time ≤ Legacy total time for all test cases
```

**Query Benchmark:**

```
Test Matrix:
  Row counts: 100, 500, 1K, 5K, 10K (matches BENCHMARK_REPORT.md methodology)
  Doc sizes: 100B, 1KB (key sizes for query perf)
  Query types: SELECT *, SELECT with WHERE, SELECT with INDEX
  
  Total: 5 × 2 × 3 = 30 test cases

Metrics:
  - Query execution time (ms)
  - Result serialization time (ms)
  - Bridge transfer time (ms)
  - Total JS-visible time (ms)
  
Pass criterion: Query execution time parity; bridge transfer time improved
```

### 6.2 Benchmark DB Reads/Writes

**Full Test Matrix:**

| Operation | Doc Sizes | Doc Counts | Metrics |
|-----------|-----------|------------|---------|
| Single document save | 100B, 1KB, 10KB, 100KB | 1 | Latency (ms), bridge overhead |
| Batch save (single transaction) | 1KB | 100, 500, 1000 | Total (ms), per-doc (ms), docs/sec |
| Single document read | 100B, 1KB, 10KB, 100KB | 1 | Latency (ms), deserialization |
| Batch read (multi-get) | 1KB | 100, 500, 1000 | Total (ms), per-doc (ms) |
| Read-modify-write cycle | 1KB | 100, 500 | Total (ms), conflict rate |
| Document delete | 1KB | 100, 500, 1000 | Total (ms), per-doc (ms) |
| Document purge | 1KB | 100, 500, 1000 | Total (ms), per-doc (ms) |

**Expected improvements with Turbo Modules:**
- Small documents (100B-1KB): Eliminated bridge queue and UI thread redirect savings are visible on high-frequency calls
- Large documents (100KB+): Native serialization (Fleece) dominates; bridge improvement smaller in percentage terms but still present
- Batch operations: Turbo improvement mainly from reduced per-call queue hopping

### 6.3 Threading Safety Validation

**Test 1: Concurrent writes to same collection:**
```
4 parallel tasks × 250 documents = 1000 total writes
Expected: All 1000 documents persisted, count = 1000, no crashes
```

**Test 2: Write during live query:**
```
Start live query on collection
Concurrently save 100 documents
Expected: Live query fires for each batch, query results consistent
```

**Test 3: Replicator + concurrent local CRUD:**
```
Start continuous push replication
Write 500 documents locally during replication
Expected: All 500 documents eventually pushed, no deadlocks, no crashes
```

**Test 4: Listener lifecycle stress:**
```
Register 100 collection change listeners
Write 1000 documents (100 batches of 10)
Deregister all 100 listeners
Verify: token map is empty, no listener fires after removal
```

**Test 5: Module invalidation under load:**
```
Start 10 concurrent document writes (all async via Promise)
Simulate module invalidation after 5 writes
Expected: In-flight operations either complete or throw CancellationException
Expected: Module cleanup completes without crash, no dangling listeners
```

**Test 6: Coexistence Buffer domain flip under load:**
```
While 100 document operations are in flight on the legacy path,
flip TURBO_DOMAINS.document to true.
Expected: In-flight operations complete on legacy path.
New operations use Turbo path.
No mixing of paths within a single operation.
```

### 6.4 Stress Test Replication

**Test 1: Local Docker Sync Gateway (matches REPLICATOR_BENCHMARK_REPORT.md methodology):**
```
Push: 1000 documents, 1KB each
Pull: 1000 documents, 1KB each
Bidirectional: 500 + 500 documents, 1KB each

For each document size: 100B, 1KB, 10KB, 100KB, 1MB
Measure: Total time, throughput (docs/sec), error count

Compare to baseline from REPLICATOR_BENCHMARK_REPORT.md.
Pass criterion: No regression >10% vs. baseline.
```

**Test 2: Capella Cloud (matches CAPELLA_BENCHMARK_REPORT.md methodology):**
```
Same test matrix but against Capella Cloud 3-node cluster
Compare to baseline from CAPELLA_BENCHMARK_REPORT.md.
```

**Test 3: Continuous replication endurance:**
```
Duration: 24 hours
Local writes: 1 document per minute
Replication: Continuous push
Monitoring: Memory usage every 5 minutes (should be flat after warm-up)
Expected: No memory growth, no crashes, all documents synced
```

**Test 4: Replicator lifecycle stress:**
```
100 iterations:
  1. replicator_Create (config: push 10 documents)
  2. replicator_Start
  3. Wait for idle status (via async status polling)
  4. replicator_Stop
  5. replicator_Cleanup

Expected: No resource leaks, all iterations complete, token map empty after each cycle
```

### 6.5 High Concurrency Testing

**Test 1: 10 concurrent independent queries:**
```
10 different queries executing simultaneously on the same database
Expected: All 10 return correct, complete results without interference
```

**Test 2: Rapid-fire async bridge calls:**
```
10,000 sequential async calls: alternating collection_Save and collection_GetDocument
Measure: Total throughput, error rate, memory during test
```

**Test 3: Event flood:**
```
Register live query on a collection
Write 10,000 documents in rapid succession
Measure: Number of queryChange events delivered to JS, timing of first vs. last event
Expected: All changes eventually delivered, no dropped events, no OOM
```

**Test 4: Parallel module initialization:**
```
Cold app start: first operation on all 8 modules simultaneously
Expected: All 8 initialize correctly without race conditions
```

---

## 7. Final Architecture Diagram

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                         REACT NATIVE APPLICATION LAYER                           ║
║                                                                                   ║
║  ┌─────────────────────────────────────────────────────────────────────────────┐  ║
║  │                     TypeScript Application Code                              │  ║
║  │                                                                              │  ║
║  │  import { Database } from 'cbl-reactnative'                                 │  ║
║  │  const db = new Database('mydb', config)                                    │  ║
║  │  await db.open()                                                             │  ║
║  │  const col = await db.defaultCollection()                                   │  ║
║  │  await col.save(doc)                                                         │  ║
║  └──────────────────────────────────┬──────────────────────────────────────────┘  ║
║                                     │                                             ║
║  ┌──────────────────────────────────▼──────────────────────────────────────────┐  ║
║  │             CblReactNativeEngine.tsx  (implements ICoreEngine)               │  ║
║  │                                                                              │  ║
║  │  ┌──────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────────┐            │  ║
║  │  │ database_*   │ │collection_*│ │ query_*  │ │ replicator_* │  ...        │  ║
║  │  │ methods      │ │ methods    │ │ methods  │ │ methods      │            │  ║
║  │  └──────┬───────┘ └─────┬──────┘ └────┬─────┘ └──────┬───────┘            │  ║
║  │         │               │             │              │                      │  ║
║  │  Manages JS-side listener callbacks, event subscriptions,                   │  ║
║  │  token-to-callback mapping, NativeEventEmitter subscriptions               │  ║
║  └──────────────────────────────────┬──────────────────────────────────────────┘  ║
║                                     │                                             ║
║  ┌──────────────────────────────────▼──────────────────────────────────────────┐  ║
║  │         COEXISTENCE BUFFER (Phases 2-3 only; removed in Phase 4)            │  ║
║  │                                                                              │  ║
║  │  TURBO_DOMAINS = { database, collection, document, query,                   │  ║
║  │                    replicator, scope, logging, listener }                   │  ║
║  │                                                                              │  ║
║  │  Each domain independently routes to: Legacy Path  OR  Turbo Path          │  ║
║  │  Hot-switchable at runtime. Emergency rollback: flip flag back to false.    │  ║
║  └──────────┬───────────────────────────────────────────────┬──────────────────┘  ║
║             │ (legacy path, Phases 1-3)                      │ (turbo path, Phase 2+)
║  ┌──────────▼──────────────┐              ┌─────────────────▼───────────────────┐  ║
║  │  NativeModules          │              │  TURBO MODULE REGISTRY (src/specs/) │  ║
║  │  .CblReactnative        │              │                                     │  ║
║  │  (Legacy Bridge)        │              │  NativeCblDatabase                  │  ║
║  │                         │              │  NativeCblCollection                │  ║
║  │  Removed in Phase 4     │              │  NativeCblDocument                  │  ║
║  └──────────┬──────────────┘              │  NativeCblQuery                     │  ║
║             │                             │  NativeCblReplicator                │  ║
║             │                             │  NativeCblScope                     │  ║
║             │                             │  NativeCblLogging                   │  ║
║             │                             │  NativeCblListener                  │  ║
║             │                             │                                     │  ║
║             │                             │  TurboModuleRegistry                │  ║
║             │                             │    .getEnforcing<Spec>(name)        │  ║
║             │                             │  → Lazy loaded on first use         │  ║
║             │                             │  → Type-safe via Codegen            │  ║
║             │                             │  → All methods async (Promise)      │  ║
║             │                             └─────────────────┬───────────────────┘  ║
╚═════════════║═══════════════════════════════════════════════║════════════════════╝
              │                                               │
              │                             ╔════════════════╧════════════╗
              │                             ║      JSI BRIDGE LAYER        ║
              │                             ║                              ║
              │                             ║  C++ direct function calls   ║
              │                             ║  No JSON serialization       ║
              │                             ║  Typed via jsi::Value        ║
              │                             ║  All methods async (Promise) ║
              │                             ║  CallInvoker for events      ║
              │                             ║  promise.resolve() any thread║
              │                             ╚════════════════╤════════════╝
              │                                              │
            ┌─┴──────────────────────────────────────────────┤
            │                                                 │
            ▼                                                 ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                       iOS NATIVE LAYER         ANDROID NATIVE LAYER               │
│                                                                                   │
│  ┌─────────────────────────────┐      ┌────────────────────────────────────────┐ │
│  │       CODEGEN LAYER         │      │           CODEGEN LAYER                │ │
│  │                             │      │                                        │ │
│  │  ObjC++ .mm files per domain│      │  Abstract Kotlin classes per domain:  │ │
│  │                             │      │                                        │ │
│  │  CblDatabaseModule.mm       │      │  NativeCouchbaseLiteDatabaseSpec       │ │
│  │    ↓ conforms to            │      │  NativeCouchbaseLiteDocumentSpec       │ │
│  │    NativeCblDatabaseSpec    │      │  NativeCouchbaseLiteQuerySpec          │ │
│  │    ↓ getTurboModule: →      │      │  NativeCouchbaseLiteReplicatorSpec     │ │
│  │    std::make_shared         │      │  NativeCouchbaseLiteScopeSpec          │ │
│  │    <NativeCblDatabaseSpecJSI│      │  NativeCouchbaseLiteCollectionSpec     │ │
│  │    >(params)                │      │  NativeCouchbaseLiteLoggingSpec        │ │
│  │  (8 .mm files total)        │      │  NativeCouchbaseLiteListenerSpec       │ │
│  └─────────────┬───────────────┘      └──────────────────┬─────────────────────┘ │
│                │                                         │                       │
│  ┌─────────────▼───────────────┐      ┌──────────────────▼─────────────────────┐ │
│  │    SWIFT TURBO MODULES      │      │         KOTLIN TURBO MODULES           │ │
│  │                             │      │                                        │ │
│  │  CblDatabaseModule.swift    │      │  CblDatabaseTurboModule.kt             │ │
│  │  CblCollectionModule.swift  │      │  CblCollectionTurboModule.kt           │ │
│  │  CblDocumentModule.swift    │      │  CblDocumentTurboModule.kt             │ │
│  │  CblQueryModule.swift       │      │  CblQueryTurboModule.kt                │ │
│  │  CblReplicatorModule.swift  │      │  CblReplicatorTurboModule.kt           │ │
│  │  CblScopeModule.swift       │      │  CblScopeTurboModule.kt                │ │
│  │  CblLoggingModule.swift     │      │  CblLoggingTurboModule.kt              │ │
│  │  CblListenerModule.swift    │      │  CblListenerTurboModule.kt             │ │
│  │                             │      │                                        │ │
│  │  Each: serial DispatchQueue │      │  Each: CoroutineScope(SupervisorJob    │ │
│  │  All methods: queue.async   │      │  + Dispatchers.IO)                     │ │
│  │  All resolve from queue     │      │  All methods: scope.launch             │ │
│  │  invalidate() drains queue  │      │  promise.resolve() direct (no UI hop)  │ │
│  └─────────────┬───────────────┘      │  invalidate() → scope.cancel()         │ │
│                │                      └──────────────────┬─────────────────────┘ │
│  ┌─────────────▼───────────────┐      ┌──────────────────▼─────────────────────┐ │
│  │       SHARED LAYER          │      │            SHARED LAYER                │ │
│  │                             │      │                                        │ │
│  │  ios/shared/DataAdapter     │      │  DataAdapter.kt                        │ │
│  │  ios/shared/CollectionArgs  │      │  DataValidation.kt                     │ │
│  │  ios/shared/DocumentArgs    │      │  IndexDto.kt                           │ │
│  │  ios/shared/QueryArgs       │      │                                        │ │
│  └─────────────┬───────────────┘      └──────────────────┬─────────────────────┘ │
│                │                                         │                       │
│  ┌─────────────▼───────────────┐      ┌──────────────────▼─────────────────────┐ │
│  │      cbl-js-swift           │      │         cbl-js-kotlin                  │ │
│  │      (submodule)            │      │         (submodule)                    │ │
│  │                             │      │                                        │ │
│  │  DatabaseManager            │      │  DatabaseManager                       │ │
│  │  CollectionManager          │      │  CollectionManager                     │ │
│  │  ReplicatorManager          │      │  ReplicatorManager                     │ │
│  │  LoggingManager             │      │  LoggingManager                        │ │
│  │  LogSinksManager            │      │  LogSinksManager                       │ │
│  └─────────────┬───────────────┘      └──────────────────┬─────────────────────┘ │
│                │                                         │                       │
│  ┌─────────────▼───────────────┐      ┌──────────────────▼─────────────────────┐ │
│  │  CouchbaseLiteSwift SDK 3.3 │      │  Couchbase Lite Android SDK 3.3        │ │
│  │                             │      │                                        │ │
│  │  ┌───────────────────────┐  │      │  ┌────────────────────────────────┐   │ │
│  │  │      LiteCore (C++)   │  │      │  │        LiteCore (C++)          │   │ │
│  │  │  SQLite WAL           │  │      │  │  SQLite WAL                    │   │ │
│  │  │  Fleece encoding      │  │      │  │  Fleece encoding               │   │ │
│  │  │  WebSocket / BLIP     │  │      │  │  WebSocket / BLIP              │   │ │
│  │  │  TLS / ALPN           │  │      │  │  TLS / ALPN                    │   │ │
│  │  │  P2P sync             │  │      │  │  P2P sync                      │   │ │
│  │  └───────────────────────┘  │      │  └────────────────────────────────┘   │ │
│  └─────────────────────────────┘      └────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────┘
                                      │
                          ┌───────────▼───────────┐
                          │   SYNC GATEWAY /       │
                          │   CAPELLA CLOUD        │
                          │                        │
                          │  WebSocket connections │
                          │  BLIP protocol         │
                          │  Delta sync            │
                          │  Conflict resolution   │
                          └────────────────────────┘
```

### Architecture Legend

```
Component                           Description
────────────────────────────────────────────────────────────────────────────────────
TypeScript App                      User application code
CblReactNativeEngine                Unified TS facade; manages listeners/subscriptions
Coexistence Buffer                  Per-domain hot-switch between Legacy and Turbo
                                    Phases 2-3 only; deleted in Phase 4
Turbo Module Registry               TurboModuleRegistry.getEnforcing; lazy loading
JSI Bridge                          C++ direct calls; replaces async JSON bridge queue
                                    All methods async; no sync JSI used
Codegen Layer (iOS .mm)             ObjC++ bridge; getTurboModule: returns JSI binding
Codegen Layer (Android)             Generated abstract class; enables JSI binding
Swift Turbo Modules                 Thin dispatchers using serial DispatchQueue.async
Kotlin Turbo Modules                Thin dispatchers using CoroutineScope.launch
Shared Layer                        DataAdapter, DataValidation — used by all modules
cbl-js-swift / cbl-js-kotlin        Submodule SDK managers (shared by legacy + turbo)
CouchbaseLiteSwift SDK              iOS database engine (only SDK used on iOS)
CouchbaseLite Android SDK           Android database engine (only SDK used on Android)
LiteCore                            C++ core embedded in both SDKs
Sync Gateway / Capella              Backend replication targets
```

---

## Appendix A: Key Architectural Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| **Keep Swift SDK on iOS** | The Swift SDK is the official, supported Couchbase Lite iOS SDK. It has full error handling, memory safety, and a complete Swift API. Benchmark data confirmed it performs best at real-world (Capella Cloud) network conditions for replication. |
| **Keep Android Java SDK** | `cbl-js-kotlin` wraps the official Couchbase Lite Java SDK. It has full feature parity, is actively maintained, and is the correct SDK for production Android use. |
| **No C SDK** | The C SDK (`libcblite`) was evaluated in benchmark experiments. Those experiments are complete and concluded. The C SDK is fully removed from this migration — no production code, no specs, no native files. The Swift and Java SDKs remain the sole native implementations. |
| **Domain-decomposed modules (8 modules vs. 1 monolith)** | Lazy loading, dedicated dispatch queues per domain, isolated testing, crash isolation, and per-domain coexistence buffer granularity. |
| **Flat parameter signatures (not object-wrapped)** | Codegen handles flat params efficiently. Object-wrapping (`args: { name: string; ... }`) adds indirection with no benefit and was only used in benchmark experiment specs. |
| **String-based opaque handles** | JS `number` is `double`; 64-bit pointers lose precision. String UUIDs are safe, debuggable, garbage-collectable, and prevent use-after-free errors. |
| **Serial dispatch queue per module (iOS)** | Prevents data races within a domain. The `MutableDocument` constraint requires single-queue execution. Cross-domain concurrency is safe due to CBL 3.x internal locking. |
| **Structured `CoroutineScope` per module (Android)** | Replaces `GlobalScope` anti-pattern. Cancellation on `invalidate()` prevents dangling coroutines. `SupervisorJob` ensures one failed coroutine doesn't cancel sibling operations. |
| **Remove `runOnUiQueueThread` wrappers (Android)** | In Turbo Modules, `promise.resolve()` is thread-safe from any thread. The UI queue dispatch added unnecessary overhead per call. |
| **All methods async (Promise-based, no sync JSI)** | Consistency, safety, and simplicity. Even "fast" operations remain async — their implementation may become I/O-heavy in future SDK versions. Async-only eliminates an entire class of threading edge cases. |
| **Coexistence Buffer as first-class feature** | Rather than a big-bang cutover, the buffer enables per-domain migration with hot rollback. It is a defined, documented mechanism — not a hack. It is removed cleanly in Phase 4 once all domains are validated on Turbo. |
| **Centralize listener management in `CblListenerModule`** | Current code spreads listener logic across the monolith. Centralizing enables unified cleanup, leak detection, and atomic domain flip. |
| **Chunked event delivery for large query results** | The `allResultsChunkSize = 256` hint in `CblReactnative.swift` was never implemented. For production workloads with thousands of query rows, unbuffered delivery causes JS heap spikes. 256-row chunks balance latency and memory. |
| **No C++ host objects** | We are NOT implementing JSI host objects that wrap CBL handles. This would require C++ development, bridging headers, and strict lifetime management. The string-based singleton pattern provides equivalent functionality safely. |

---

## Appendix B: Files to Remove in Phase 4

**iOS:**
- `ios/CblReactnative.mm` — legacy `RCT_EXTERN_MODULE` bridge (409 lines, 60+ methods)
- `ios/CblReactnative.swift` — legacy `RCTEventEmitter` monolith (2031 lines)
- `ios/turbo/CouchbaseLiteDatabaseModule.mm` — v1 pseudo-turbo bridge
- `ios/turbo/CouchbaseLiteDatabaseModule.swift` — v1 pseudo-turbo swift
- `ios/turbo/CouchbaseLiteCollectionModule.mm` — v1 pseudo-turbo bridge
- `ios/turbo/CouchbaseLiteCollectionModule.swift` — v1 pseudo-turbo swift
- `ios/turbo-v2/CblSwiftAdapter.swift` — Swift SDK benchmark adapter
- `ios/turbo-v2/RCTCblSwift.h` — Swift SDK benchmark bridge header
- `ios/turbo-v2/RCTCblSwift.mm` — Swift SDK benchmark bridge

**Android:**
- `android/src/main/java/com/cblreactnative/CblReactnativeModule.kt` — legacy monolith (1838 lines)
- `android/src/main/java/com/cblreactnative/turbo/CouchbaseLiteDatabaseModule.kt` — v1 pseudo-turbo
- `android/src/main/java/com/cblreactnative/turbo/CouchbaseLiteCollectionModule.kt` — v1 pseudo-turbo

**TypeScript:**
- `src/coexistence-buffer.ts` — per-domain runtime switch (no longer needed after Phase 4)
- `src/feature-flags.ts` — original binary feature flag (replaced by buffer in Phase 1)

**Root:**
- `react-native.config.js` — legacy dependency config
- `capella-test.txt`, `flags.txt`, `test_crud_results.txt`, `test_query_results.txt`, `test_replicator_results.txt` — test artifacts
- `test-bidirection-replicator.txt`, `test-pull-replicator.txt`, `test-push-replicator.txt` — test artifacts
- `turbo-v2-plan.md` — superseded by this document
- `turbotest.md` — superseded by this document
- `MEMORY_TEST_IMPLEMENTATION.md` — benchmark artifact

**expo-example/app/database/ (benchmark test screens — all removed):**
- `async-queue-test.tsx`
- `bridge-overhead-test.tsx`
- `c-library-memory-test.tsx`
- `c-library-performance-test.tsx`
- `c-library-sync-test.tsx`
- `comprehensive-benchmark.tsx`
- `crash-diagnostic.tsx`
- `local-replicator-test.tsx`
- `manual-replicator-benchmark.tsx`
- `memory-performance-test.tsx`
- `metadata-performance-test.tsx`
- `minimal-comparison-test.tsx`
- `performance-test.tsx`
- `query-scaling-benchmark.tsx`
- `replicator-benchmark.tsx`
- `semi-auto-replicator-benchmark.tsx`
- `sync-async-comparison-test.tsx`
- `sync-vs-async-test.tsx`
- `turbo-test.tsx`
- `turbo-v2-benchmark.tsx`

---

## Appendix C: Files to Create in Phase 2

**iOS (16 new files):**

| File | Purpose |
|------|---------|
| `ios/turbo-modules/CblDatabaseModule.mm` | ObjC++ bridge with `getTurboModule:` |
| `ios/turbo-modules/CblDatabaseModule.swift` | Swift implementation, all methods async via queue |
| `ios/turbo-modules/CblCollectionModule.mm` | ObjC++ bridge |
| `ios/turbo-modules/CblCollectionModule.swift` | Swift implementation |
| `ios/turbo-modules/CblDocumentModule.mm` | ObjC++ bridge |
| `ios/turbo-modules/CblDocumentModule.swift` | Swift implementation |
| `ios/turbo-modules/CblQueryModule.mm` | ObjC++ bridge |
| `ios/turbo-modules/CblQueryModule.swift` | Swift implementation |
| `ios/turbo-modules/CblReplicatorModule.mm` | ObjC++ bridge |
| `ios/turbo-modules/CblReplicatorModule.swift` | Swift implementation |
| `ios/turbo-modules/CblScopeModule.mm` | ObjC++ bridge |
| `ios/turbo-modules/CblScopeModule.swift` | Swift implementation |
| `ios/turbo-modules/CblLoggingModule.mm` | ObjC++ bridge |
| `ios/turbo-modules/CblLoggingModule.swift` | Swift implementation |
| `ios/turbo-modules/CblListenerModule.mm` | ObjC++ bridge |
| `ios/turbo-modules/CblListenerModule.swift` | Swift implementation, event emission via CallInvoker |

**Android (8 new files):**

| File | Purpose |
|------|---------|
| `android/.../turbo-modules/CblDatabaseTurboModule.kt` | Extends `NativeCouchbaseLiteDatabaseSpec`, all methods `scope.launch` |
| `android/.../turbo-modules/CblCollectionTurboModule.kt` | Extends `NativeCouchbaseLiteCollectionSpec` |
| `android/.../turbo-modules/CblDocumentTurboModule.kt` | Extends `NativeCouchbaseLiteDocumentSpec` |
| `android/.../turbo-modules/CblQueryTurboModule.kt` | Extends `NativeCouchbaseLiteQuerySpec` |
| `android/.../turbo-modules/CblReplicatorTurboModule.kt` | Extends `NativeCouchbaseLiteReplicatorSpec` |
| `android/.../turbo-modules/CblScopeTurboModule.kt` | Extends `NativeCouchbaseLiteScopeSpec` |
| `android/.../turbo-modules/CblLoggingTurboModule.kt` | Extends `NativeCouchbaseLiteLoggingSpec` |
| `android/.../turbo-modules/CblListenerTurboModule.kt` | Extends `NativeCouchbaseLiteListenerSpec` |

**TypeScript (8 new spec files + 1 buffer file):**

| File | Module Name |
|------|-------------|
| `src/specs/NativeCblDatabase.ts` | `CouchbaseLiteDatabase` |
| `src/specs/NativeCblCollection.ts` | `CouchbaseLiteCollection` |
| `src/specs/NativeCblDocument.ts` | `CouchbaseLiteDocument` |
| `src/specs/NativeCblQuery.ts` | `CouchbaseLiteQuery` |
| `src/specs/NativeCblReplicator.ts` | `CouchbaseLiteReplicator` |
| `src/specs/NativeCblScope.ts` | `CouchbaseLiteScope` |
| `src/specs/NativeCblLogging.ts` | `CouchbaseLiteLogging` |
| `src/specs/NativeCblListener.ts` | `CouchbaseLiteListener` |
| `src/coexistence-buffer.ts` | Per-domain TURBO_DOMAINS flags (all `false` initially) |

---

## Appendix D: Assumptions

1. **React Native version >= 0.73** is the minimum supported version post-migration. The existing `devDependencies` list RN 0.76.2, which is well within this range. New Architecture is stable since RN 0.73.

2. **Expo SDK >= 50** for the expo-example app. New Architecture support in Expo is stable since SDK 50. Current `expo-example/app.json` is compatible.

3. **`cbl-js-swift` and `cbl-js-kotlin` submodule APIs are stable** — The Turbo Modules delegate to the same `DatabaseManager`, `CollectionManager`, `ReplicatorManager` singletons. If submodule APIs change, only the thin Turbo Module layer needs updating, not the spec contracts.

4. **No C++ JSI host objects needed** — All native state is managed in Swift/Kotlin singletons accessed by string key. C++ host objects would provide theoretical performance benefits but introduce C++ development complexity, bridging issues, and strict lifetime management requirements that are not justified given the current architecture.

5. **The Couchbase Lite C SDK (`libcblite`) is fully removed** — All benchmark experiments using the C SDK are concluded. No C SDK files, headers, frameworks, ObjC++ wrappers, or TypeScript specs appear anywhere in the production codebase after Phase 1. The production architecture uses only CouchbaseLiteSwift (iOS) and Couchbase Lite Android (Android).

6. **All methods are async-only** — No `isBlockingSynchronousMethod = true` is used on Android. No direct-return (non-Promise) methods are used on iOS. This policy applies universally across all 8 modules and all methods. There are no exceptions.

7. **Single codebase supports both Old and New Architecture during Phases 1-3 via Coexistence Buffer** — The buffer routes to the legacy module when domain flags are `false` (Old Arch compatible). From Phase 4 onwards, only New Architecture is supported.

8. **No JSI host objects or Fabric components required** — This library is purely a native module (not a native UI component). Fabric/Yoga layout concerns do not apply.

9. **The `cbl-js-swift` and `cbl-js-kotlin` submodules are maintained separately** — Changes to the submodule business logic (e.g., new CBL SDK methods) are out of scope for this migration. The migration only changes how the bridge calls the submodule managers, not what the managers do.

10. **Coexistence Buffer is temporary infrastructure** — It is introduced in Phase 1, actively used in Phases 2-3, and deleted entirely in Phase 4. It is not a permanent abstraction layer. Its sole purpose is to provide per-domain hot-rollback capability during the migration window.

---

*This migration plan reflects three deliberate constraints: (1) the Couchbase Lite C SDK is fully out of scope and entirely removed, (2) the Coexistence Buffer is a first-class architectural feature providing hot-switchable per-domain fallback for as long as needed, and (3) all method signatures are async-only — no synchronous JSI calls are used anywhere in the migration. All architectural recommendations are repository-specific and grounded in the actual codebase, git history, and benchmark data.*
