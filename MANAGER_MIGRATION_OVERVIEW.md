# Couchbase Lite React Native - New Architecture Migration
### Manager Overview and Planning Guide

---

## 1. Executive Summary

We are upgrading the `cbl-reactnative` library (the bridge between our React Native app and the Couchbase Lite database) to use **React Native's New Architecture (Turbo Modules)**.

This is a planned, phased engineering upgrade. It does not change any user-facing features. What it changes is the internal communication channel between the JavaScript layer of our app and the native (iOS/Android) database engine. Making this change correctly now means our library is:

- **Faster:** fewer intermediate steps when reading or writing data
- **More stable:** better memory management, proper lifecycle cleanup
- **Future-proof:** React Native's new architecture is the industry standard going forward; staying on the old one means accumulating technical debt
- **Production-grade:** proper threading, no known memory leak patterns that exist in the current setup

**Safety guarantee:** We will run the old and new systems side-by-side throughout the migration with a per-feature safety switch. If anything unexpected happens in the new system, we can flip back to the old one in minutes with no code change and no app store submission needed.

---

## 2. What Problem Are We Solving?

### The Current Setup

Today, when our app talks to the Couchbase Lite database, the call travels through a **message queue** (called the Legacy Bridge). Think of it like sending a letter: you write it, put it in an envelope, hand it to a postal worker, the worker delivers it, and then waits for a reply letter to come back.

```
App (JavaScript)
    ↓  write a message
  Message Queue  <── bottleneck lives here
    ↓  deliver
  Native Database (iOS / Android)
    ↓  write a reply
  Message Queue  <── another wait
    ↓  deliver
App gets the result
```

### The Issues With This Approach

| Issue | Business Impact |
|-------|----------------|
| Every single database call goes through the message queue, even tiny ones | Slower perceived performance, especially on high-frequency operations |
| The old system was never designed for graceful shutdown | When users background the app or navigate away, open database listeners can linger and waste memory |
| The Android implementation uses a global background thread pool with no lifecycle | Risk of background crashes and memory growth over time |
| All 60+ database operations are packed into one giant module | A problem in one area (e.g. replication) can affect unrelated areas (e.g. reading documents) |
| React Native's New Architecture has been the standard since 2024 | Staying on the old architecture makes it harder to adopt future React Native improvements |

### The New Setup (Turbo Modules)

The new approach replaces the message queue with a **direct function call** (called JSI - JavaScript Interface). Think of it like picking up the phone instead of sending a letter.

```
App (JavaScript)
    ↓  direct call (no queue)
  Native Database (iOS / Android)
    ↓  direct response
App gets the result
```

We also split the one giant module into **8 smaller, focused modules** - one per domain (Database, Document, Query, Replication, etc.). This means:
- Problems are isolated to one area
- Only the modules actually in use are loaded into memory
- Each module cleans up properly when the app navigates away

---

## 3. What Are We Changing? (High Level)

| What | Old | New |
|------|-----|-----|
| Communication method | Message queue (async) | Direct call (JSI) |
| Module structure | 1 giant module | 8 focused domain modules |
| Thread management | Global thread pool (Android) / single shared queue (iOS) | Dedicated thread per domain, proper cancellation |
| Lifecycle cleanup | Partial (listeners can leak) | Full cleanup on module teardown |
| Architecture compliance | Old Architecture (deprecated path) | New Architecture (current standard) |
| SDK used | Swift SDK (iOS) + Java SDK (Android) | Same, no change here |
| API surface for consumers | No change | No change |
| User-facing behaviour | No change | No change |

**The TypeScript/JavaScript API that our app uses stays exactly the same.** This is an internal infrastructure upgrade only.

---

## 4. Architecture: Before and After

### Before

```
┌─────────────────────────────────────────────┐
│              React Native App               │
│                                             │
│   await collection.save(document)           │
└───────────────────┬─────────────────────────┘
                    │
         ┌──────────▼──────────┐
         │  Legacy Bridge      │  <- message queue, JSON serialization,
         │  (message queue)    │     multiple thread hops per call
         └──────────┬──────────┘
                    │
    ┌───────────────┴───────────────┐
    │                               │
┌───▼────────────────┐  ┌───────────▼────────────┐
│  iOS               │  │  Android               │
│  (1 giant module)  │  │  (1 giant module)      │
└───┬────────────────┘  └───────────┬────────────┘
    │                               │
    └──────────────┬────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Couchbase Lite DB  │
        │  (iOS + Android)    │
        └─────────────────────┘
```

### After

```
┌─────────────────────────────────────────────┐
│              React Native App               │
│                                             │
│   await collection.save(document)           │
└───────────────────┬─────────────────────────┘
                    │
         ┌──────────▼──────────┐
         │   JSI Direct Call   │  <- no message queue, no JSON round-trip,
         │  (New Architecture) │     typed values, proper async
         └──────────┬──────────┘
                    │
    ┌───────────────┴───────────────┐
    │                               │
┌───▼────────────────┐  ┌───────────▼────────────┐
│  iOS               │  │  Android               │
│  8 focused modules │  │  8 focused modules     │
│  (one per domain)  │  │  (one per domain)      │
│                    │  │                        │
│  - Database        │  │  - Database            │
│  - Collection      │  │  - Collection          │
│  - Document        │  │  - Document            │
│  - Query           │  │  - Query               │
│  - Replicator      │  │  - Replicator          │
│  - Scope           │  │  - Scope               │
│  - Logging         │  │  - Logging             │
│  - Listener        │  │  - Listener            │
└───┬────────────────┘  └───────────┬────────────┘
    │                               │
    └──────────────┬────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Couchbase Lite DB  │
        │  (iOS + Android)    │
        └─────────────────────┘
```

---

## 5. Safety Strategy: Coexistence Buffer (Optional)

Rather than doing a single big cutover (all old to all new at once), we will run **both systems simultaneously** throughout the migration. A per-domain switch (called the Coexistence Buffer) controls which path each area of the app uses at runtime.

```
                    App
                     │
            ┌────────▼────────┐
            │  Safety Switch  │  <- per-domain flag, flipped one at a time
            └────────┬────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   ┌────▼─────┐             ┌─────▼────┐
   │  Legacy  │             │  Turbo   │
   │  (old)   │             │  (new)   │
   └──────────┘             └──────────┘
```

- During the migration, both systems are registered and operational
- We flip the switch one domain at a time (Database first, then Document, then Query, etc.)
- If anything is wrong with a new domain, **we flip the switch back in minutes** with no app store submission and no native code deployment needed
- Once all 8 domains are validated on the new system, we remove the old one entirely

---

## 6. Phases and Timelines

> All estimates are for a single developer working across iOS, Android, and TypeScript. Each phase has clear exit criteria before the next phase begins.

---

### Phase 1 - Foundation
**Duration:** 2 weeks

**Goal:** Set up all the scaffolding: clean specs, configure code generation, extract shared utilities, and add the safety switch infrastructure.

**No new feature behaviour is introduced in this phase.** The app behaves identically throughout.

| Task |
|------|
| Clean and restructure TypeScript spec directory |
| Write 8 production TypeScript module specs (async-only) |
| Configure and verify Codegen pipeline (iOS + Android) |
| Update iOS podspec and Android build files for New Architecture |
| Extract shared iOS utilities to a shared directory |
| Extract shared Android utilities to a shared directory |
| Implement Coexistence Buffer (per-domain safety switch) |
| Set up CI dual-build matrix (Old Arch + New Arch) |
| Audit native submodule APIs (iOS Swift + Android Kotlin) |

**Phase 1 Exit Criteria:**
- Code generation runs without errors on both platforms
- CI passes for both Old and New Architecture builds
- Full existing test suite passes (no regression)
- Coexistence Buffer is in place: all domains still on legacy, but infrastructure is ready

---

### Phase 2 - Build New Modules
**Duration:** 4 weeks (Option A) | 6 weeks (Option B)

**Goal:** Build all 8 new Turbo Modules on both iOS and Android. At the end of this phase, legacy code is removed under both options — the difference is whether a coexistence validation window runs first.

This is the heaviest engineering phase. It is internal work only; nothing changes for the app or its users.

| Task |
|------|
| Database Turbo Module (iOS + Android) |
| Scope Turbo Module (iOS + Android) |
| Collection Turbo Module (iOS + Android) |
| Document Turbo Module (iOS + Android) |
| Query Turbo Module (iOS + Android) |
| Replicator Turbo Module (iOS + Android) |
| Logging Turbo Module (iOS + Android) |
| Listener Turbo Module (iOS + Android) - highest complexity |
| Register all 8 modules in iOS + Android package registries |
| Unit test each module in isolation (safety switch ON per domain) |

> Note: The Listener module handles 6 types of real-time events (collection changes, document changes, query changes, replicator status, etc.). It is the most complex module and will take the most time within this phase.

---

**Option A — Remove Legacy Immediately (4 weeks total)**

Once all 8 modules are built and tested, remove legacy code immediately. No coexistence running period.

| Additional Tasks |
|------|
| Full regression sweep: complete test suite on all 8 domains |
| Remove legacy iOS module (CblReactnative.mm + CblReactnative.swift) |
| Remove legacy Android module (CblReactnativeModule.kt) |
| Remove experimental turbo directories (iOS + Android) |
| Remove Coexistence Buffer: simplify engine to single Turbo path |
| Remove all feature flags and conditional routing code |
| Update podspec, package.json, README |
| Version bump to 2.0.0 + CHANGELOG + migration guide for consumers |

**Option A Exit Criteria:**
- All 8 modules build and register without errors on both platforms
- Each module produces identical results to its legacy counterpart
- No memory leaks in listener register/deregister stress test
- Zero references to legacy bridge patterns in the codebase
- Clean build on both platforms, full test suite passes

---

**Option B — With Coexistence Buffer (6 weeks total)**

Once all 8 modules are built (week 4), run both old and new systems side-by-side using the safety switch for 2 additional weeks. Legacy is **not removed** during this window — the purpose is to validate the new system against the old one while the fallback remains fully operational.

| Coexistence Testing Tasks (weeks 5–6) |
|------|
| Enable each domain on the new system one at a time via safety switch |
| Validate each domain output against the legacy counterpart |
| Soak test: continuous replication with both systems running |
| Rollback drill: flip each domain back to legacy, verify recovery |
| Confirm memory is flat with both modules loaded in parallel |
| Document any discrepancies found between old and new behaviour |

Legacy removal, cleanup, and version bump happen in Phase 3 (Testing + Buffer) after this window closes.

**Option B Exit Criteria:**
- All 8 modules build and register without errors on both platforms
- Each module produces identical results to its legacy counterpart
- No memory leaks in listener register/deregister stress test
- Memory flat with both systems running simultaneously
- Rollback drill successful for all domains
- No outstanding discrepancies between old and new behaviour

---

### Phase 3 - Testing + Buffer
**Duration:** 2 weeks

**Goal:** Dedicated testing window across all 8 domains before shipping. Covers end-to-end integration, real-device validation, and a buffer for any issues surfaced during the test run. For Option B, this phase also includes legacy removal after the coexistence window has closed.

| Task |
|------|
| End-to-end regression sweep: all 8 domains on both iOS and Android |
| Real-device testing: physical iOS and Android devices |
| Integration test against Sync Gateway (local) |
| Integration test against Capella Cloud |
| Cross-platform parity check: identical results on iOS and Android |
| Memory profiling: confirm no growth under sustained load |
| Edge case testing: concurrent operations, app backgrounding, network loss |
| Fix any issues surfaced during testing (buffer time) |
| Final sign-off: all tests passing before proceeding to Phase 4 |

**Phase 3 Exit Criteria:**
- Legacy code fully removed (Option A: already done in Phase 2; Option B: done at start of this phase)
- Full test suite passing on both platforms (clean run, no skips)
- Integration tests passing against Sync Gateway and Capella
- No memory growth under sustained load
- All critical issues resolved; no known blockers

---

### Phase 4 - Optimisation and Cleanup
**Duration:** 1-2 weeks

**Goal:** Remove all test artifacts that accumulated during development and validate compatibility with React Native's upcoming renderer improvements.

| Task | Notes |
|------|-------|
| Optimise serialisation for large documents | |
| Add production batch operations (save/get/delete arrays in one call) | |
| Optimise high-frequency event delivery (debounce replication status) | |
| Remove benchmark test screens from expo-example app | |
| Write documentation updates | 3-4 days: API docs, README, CHANGELOG, consumer migration guide, CONTRIBUTING.md |
| Verify compatibility with React Native Fabric renderer | |

**Phase 4 Exit Criteria:**
- No benchmark-only code in the main application
- All documentation updated and reviewed
- CONTRIBUTING.md updated for new architecture patterns
- Fabric compatibility confirmed

---

## 7. Total Timeline Summary

### Option A — Fast Track (4-week Phase 2)

| Phase | Description | Duration |
|-------|-------------|----------|
| Phase 1 | Foundation: scaffolding, code gen, safety switch | 2 weeks |
| Phase 2 | Build all 8 modules + remove legacy immediately | 4 weeks |
| Phase 3 | Testing + buffer | 2 weeks |
| Phase 4 | Optimisation and cleanup | 1-2 weeks |
| **Total** | | **~9-10 weeks** |

### Option B — With Coexistence Buffer (6-week Phase 2)

| Phase | Description | Duration |
|-------|-------------|----------|
| Phase 1 | Foundation: scaffolding, code gen, safety switch | 2 weeks |
| Phase 2 | Build all 8 modules (4w) + coexistence testing, legacy kept (2w) | 6 weeks |
| Phase 3 | Testing + buffer | 2 weeks |
| Phase 4 | Optimisation and cleanup | 1-2 weeks |
| **Total** | | **~11-12 weeks** |

> Estimates are for a single developer. Phase 2 is the longest phase because it involves building 8 modules across 2 platforms. All other phases are primarily validation, removal, and configuration work.

---

## 8. What Does Not Change

**No breaking changes for users.** The TypeScript/JavaScript API stays exactly the same throughout the migration.

---

## 9. Success Metrics

How we know the migration is complete and successful:

| Metric | Target |
|--------|--------|
| Test suite pass rate | 100%: identical to legacy baseline |
| Memory after soak test | Flat (no growth beyond warm-up period) |
| Legacy code remaining | Zero references after Phase 2 |
| Integration tests | Passing against Sync Gateway and Capella after Phase 3 |
| CI build status | Green on both Old Arch and New Arch |
| Consumer breaking changes | Zero during Phase 1; v2.0.0 clearly communicated for Phase 2 |
| Documentation | All API docs, README, and migration guide updated before v2.0.0 ships |

---

## 10. QE Test Environment Setup

**Status: Timeline TBD**

We need to coordinate with the QE team to set up a dedicated test environment for validation of the new architecture. The exact scope of what needs to be prepared for QE is still being defined and will require a separate scoping session before a timeline can be committed.

| Item | Status |
|------|--------|
| Define what QE needs to test (functional scope, platforms, devices) | Not yet scoped |
| Identify test environment requirements (Sync Gateway, Capella, device farm) | Not yet scoped |
| Set up QE test environment and access | Pending scoping |
| Hand off test plan and migration notes to QE | Pending Phase 3 completion |
| QE sign-off before v2.0.0 release | Required before ship |

> A follow-up scoping session will be scheduled with the QE team once Phase 1 is underway and the full list of testable surfaces is clearer. Timeline will be updated at that point.

