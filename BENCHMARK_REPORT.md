# Couchbase Lite SDK Performance Benchmark Report

**Couchbase Lite Swift SDK vs Couchbase Lite C SDK on iOS**

| Field | Value |
|-------|-------|
| Date | February 16, 2026 |
| Device | iPhone 16 (physical device) / Simulator 17 Pro |
| OS | iOS (production build) |
| Framework | React Native with Turbo Modules (New Architecture) |
| Swift SDK | CouchbaseLiteSwift framework 3.3 |
| C SDK | libcblite 4.0.0 (C API via Objective-C++ bridge) |
| Total Test Cases | 158 unique operation comparisons (141 CRUD + 17 query-scaling) |
| Total Permutations | 65 test permutations across 10 suites (5 CRUD + 5 query-scaling) |
| Overall Duration | ~3 hours across all 10 suites |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What Was Tested](#2-what-was-tested)
3. [How The Test Was Designed](#3-how-the-test-was-designed)
4. [Fairness Protocol](#4-fairness-protocol)
5. [What Exactly Was Measured](#5-what-exactly-was-measured)
6. [Complete Results: All 141 CRUD Comparisons](#6-complete-results-all-141-crud-comparisons)
7. [Analysis by Operation Type](#7-analysis-by-operation-type)
8. [Why C Wins Most Cases](#8-why-c-wins-most-cases)
9. [Why Swift Wins in Specific Cases](#9-why-swift-wins-in-specific-cases)
10. [Data Reliability Notes](#10-data-reliability-notes)
11. [Dedicated Query Benchmark: Full-Scan Results](#11-dedicated-query-benchmark-full-scan-results)

---

## 1. Executive Summary

### The Bottom Line

The 🟦 **C SDK is faster in 78.7% of all test cases** (111 out of 141 by average). The 🟩 **Swift SDK wins 17.7%** (25 cases). The remaining 5 cases (3.5%) are ties.

> All results in this report are based on **mean (average)** of timed iterations (warmup excluded). Cases where both values round to the same integer but show a non-zero margin reflect real sub-millisecond differences captured by `performance.now()`. These are marked with **(low)** when the margin is under 3%.

### Key Findings

| Finding | Detail |
|---------|--------|
| 🟦 **C SDK dominates save/update** | 22-29% faster for documents >= 10KB at 1K+ document counts; 7-24% faster even at 100 documents |
| 🟦 **C SDK dominates batch delete** | 21-41% faster for documents <= 10KB; mixed results at 100KB (mostly C, 10-18%) |
| 🟩 **Swift SDK wins batch delete at 1MB** | ~10-13% faster -- the only operation where Swift consistently beats C at scale |
| **CRUD query (`LIMIT 100`) is identical** | Both SDKs use the same underlying SQLite engine; differences are <1ms |
| 🟦 **C SDK wins full-scan query at 100B** | 22-24% faster when returning 10K-100K small documents; per-row bridge overhead accumulates |
| **Full-scan query at >= 10KB is parity** | Both SDKs within 3% when returning all rows of large documents (I/O dominates) |
| **Get operations are near-parity** | Differences are typically <5%, within noise range |

### Scorecard

| Category | 🟦 C Wins | 🟩 Swift Wins | Ties |
|----------|----------|--------------|------|
| 100B suite (32 tests) | 23 (71.9%) | 8 (25.0%) | 1 (3.1%) |
| 1KB suite (32 tests) | 25 (78.1%) | 5 (15.6%) | 2 (6.3%) |
| 10KB suite (32 tests) | 27 (84.4%) | 4 (12.5%) | 1 (3.1%) |
| 100KB suite (27 tests) | 22 (81.5%) | 5 (18.5%) | 0 (0.0%) |
| 1MB suite (18 tests) | 14 (77.8%) | 3 (16.7%) | 1 (5.6%) |
| **CRUD subtotal (141 tests)** | **111 (78.7%)** | **25 (17.7%)** | **5 (3.5%)** |
| Query-scaling benchmark (17 tests) | 8 (47.1%) | 7 (41.2%) | 2 (11.8%) |
| **Grand total (158 tests)** | **119 (75.3%)** | **32 (20.3%)** | **7 (4.4%)** |

---

## 2. What Was Tested

### Document Sizes

Five document sizes representing the full range of enterprise data:

| Size | Target Bytes | Example Use Case |
|------|-------------|------------------|
| 100B | 100 bytes | Minimal metadata records, flags, counters |
| 1KB | 1,000 bytes | User profiles, configuration objects |
| 10KB | 10,000 bytes | Order records with line items, audit trails |
| 100KB | 100,000 bytes | Rich content documents, form submissions with attachments |
| 1MB | 1,000,000 bytes | Large enterprise documents, reports with embedded data |

### Document Structure

All documents use **complex nested JSON** with 3-4 levels of genuine nesting:
- Objects within objects (e.g., `user.profile.address.geo.lat`)
- Arrays of objects (e.g., `content.items[].attributes.dimensions`)
- Mixed types: strings, numbers, booleans, nulls, nested arrays
- For documents >= 10KB: dynamically expanded arrays (content items, audit history entries, user tags) create genuine structural complexity rather than padding

Example 10KB document structure (abbreviated):
```
{
  id, timestamp,
  user: {
    profile: { firstName, lastName, email, address: { street, city, geo: { lat, lng } } },
    preferences: { theme, language, notifications: { email, push, sms, frequency } },
    roles: [...],
    tags: [{ key, value, active }, ...]    // expanded for larger docs
  },
  metadata: {
    source, version, priority,
    audit: { createdBy, createdAt, history: [{ action, actor, timestamp }, ...] },
    flags: { isActive, isVerified, isArchived }
  },
  content: {
    items: [{ sku, name, price, quantity, category, attributes: { color, size, weight, dimensions: { l, w, h } } }, ...],
    summary: { totalItems, totalPrice, currency, discount }
  }
}
```

### Document Counts

| Count | Single Lifecycle | Batch Lifecycle | Query Lifecycle |
|-------|-----------------|----------------|-----------------|
| 100 | Yes | Yes | Yes |
| 1,000 | Yes | Yes | Yes |
| 10,000 | Yes | Yes | Yes |
| 100,000 | No (capped at 10K) | Yes | Yes |

Single-doc operations are capped at 10,000 documents because iterating 100,000 individual API calls would take impractically long and doesn't represent a realistic use case.

### Operations Tested

**9 distinct operations** organized into 3 lifecycle types:

| Lifecycle | Operations | Description |
|-----------|-----------|-------------|
| Single | single_save, single_get, single_update, single_delete | One API call per document in a loop |
| Batch | batch_save, batch_get, batch_update, batch_delete | Multiple documents per API call using transactions |
| Query | query | `SELECT * FROM items LIMIT 100` after pre-populating the database |

### Feasibility Limits

| Rule | Limit | Reason |
|------|-------|--------|
| Total data per test | 1 GB max (size x count) | Device memory safety |
| Single operations | 10,000 docs max | Runtime feasibility |
| Batch chunk size | Dynamically calculated, max 5,000 docs or 100MB per chunk | JSON.stringify memory limit |
| Iterations | 5 if total data <= 100MB, 3 if > 100MB | Statistical confidence vs runtime |

These limits exclude certain combinations:
- 100KB x 100K = 10GB -- **excluded** (exceeds 1GB)
- 1MB x 10K = 10GB -- **excluded** (exceeds 1GB)
- 1MB x 100K = 100GB -- **excluded** (exceeds 1GB)

### Total Test Matrix

| Suite | Permutations | Iteration Plan |
|-------|-------------|---------------|
| 100B | 11 (100: s+b+q, 1K: s+b+q, 10K: s+b+q, 100K: b+q) | All 5 iterations |
| 1KB | 11 (same structure) | All 5 iterations |
| 10KB | 11 (same structure) | 5 iters for <=10K, 3 for 100K |
| 100KB | 9 (100: s+b+q, 1K: s+b+q, 10K: s+b+q) | 5 iters for <=1K, 3 for 10K |
| 1MB | 6 (100: s+b+q, 1K: s+b+q) | 5 iters for 100, 3 for 1K |
| **Total** | **48 permutations** | |

Each permutation tests **both SDKs**, producing **141 individual operation comparisons** (some permutations have 4 operations, some have 1).

---

## 3. How The Test Was Designed

### Lifecycle-Based Testing

Rather than testing each CRUD operation in isolation (separate database for save, separate for get, etc.), the benchmark uses **lifecycle-based testing** that simulates realistic application usage:

**Single/Batch Lifecycle Flow:**
```
Create fresh DB -> Save N docs -> [cooldown] -> Get N docs -> [cooldown] -> Update N docs -> [cooldown] -> Delete N docs -> Close & delete DB
```

**Query Lifecycle Flow:**
```
Create fresh DB -> Pre-populate N docs (untimed) -> Execute query (timed) -> Close & delete DB
```

This means save, get, update, and delete are performed **in the same database instance** on the same documents, mirroring how a real enterprise application would use the SDK.

### Database Isolation

Every unique combination of (SDK, iteration number, lifecycle type, document size, document count) gets its **own fresh, isolated database**. The database name includes a timestamp to guarantee uniqueness:

```
bench-{sdk}-{lifecycle}-{size}-{count}-{timestamp}
```

For example: `bench-swift-batch-10000-1000-1708067234567`

This means:
- Swift's single lifecycle at 10KB x 1K gets its own database
- C's single lifecycle at 10KB x 1K gets a different database
- The next iteration of Swift's single lifecycle gets yet another database

**No data from any previous test can influence the current test.**

After each lifecycle completes, the database is closed and **permanently deleted from disk** in a `finally` block, ensuring cleanup even if errors occur.

### Iteration Protocol

For each permutation (e.g., "10KB x 1K | batch"):

1. **Warmup Round (1 run, untimed for comparison):** Swift runs first, then C. Results are recorded in the raw logs but **excluded from the summary statistics**. Purpose: prime the JIT compiler, fill OS caches, warm the CPU.

2. **Timed Iterations (3-5 runs, used for statistics):**
   - **Odd iterations (1, 3, 5): Swift runs first**, then C
   - **Even iterations (2, 4): C runs first**, then Swift
   - This alternating order eliminates any systematic advantage from running first (e.g., warmer caches, less thermal throttling)

3. **Cooldown:** 1-second pause between every timed operation and between SDK runs. During this pause, all buffered UI updates are flushed.

---

## 4. Fairness Protocol

- Fresh database per run (eliminates data accumulation, index bloat)
- Alternating SDK order (eliminates first-mover advantage from cache warming)
- Warmup round (primes JIT compiler, OS caches, CPU frequency scaling)
- Cooldown between operations (prevents thermal throttling carry-over)
- Zero UI updates during timing (prevents React Native setState/re-render overhead)
- Identical inputs for both SDKs (same JSON documents, IDs, chunk sizes)
- Identical bridge architecture (both use React Native Turbo Modules)

---

## 5. What Exactly Was Measured

### Timing Method

Each operation is timed using `performance.now()` (high-resolution timer, microsecond precision):

```javascript
const start = performance.now();
// ... execute the operation (all documents in the count) ...
const timeMs = performance.now() - start;
```

---

## 6. Complete Results: All 141 CRUD Comparisons

Each table shows the **mean (average)** of timed iterations (warmup excluded). All times in **milliseconds (ms)**.

**Legend:**
- 🟩 **Swift** = Swift SDK wins (green)
- 🟦 **C** = C SDK wins (blue)
- Winner is always **bold** — scan the color to instantly see who won
- Percentage = how much faster the winner is vs the slower SDK
- **(low)** = margin under 3%; difference is within measurement noise

> **Display note:** Values are integers rounded from raw `performance.now()` floats. Percentages use raw floats. You may see identical integers with a non-zero margin — the sub-millisecond difference is real.

### Suite 1: 100B Documents

**Suite runtime:** ~9 minutes | **Permutations:** 11 | **Iterations:** 5 each

#### 100B x 100 Documents

| Operation | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| single_save | 15 | 14 | 🟦 **C** 6.5% |
| single_get | 13 | 15 | 🟩 **Swift** 13.5% |
| single_update | 27 | 23 | 🟦 **C** 16.9% |
| single_delete | 30 | 40 | 🟩 **Swift** 25.5% |
| batch_save | 4 | 4 | 🟦 **C** 5.3% |
| batch_get | 5 | 6 | 🟩 **Swift** 13.8% |
| batch_update | 9 | 6 | 🟦 **C** 29.5% |
| batch_delete | 7 | 4 | 🟦 **C** 39.4% |
| query | 1 | 1 | Tie |

#### 100B x 1,000 Documents

| Operation | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| single_save | 106 | 111 | 🟩 **Swift** 4.5% |
| single_get | 70 | 54 | 🟦 **C** 23.0% |
| single_update | 133 | 141 | 🟩 **Swift** 5.8% |
| single_delete | 140 | 118 | 🟦 **C** 15.3% |
| batch_save | 25 | 18 | 🟦 **C** 27.0% |
| batch_get | 20 | 19 | 🟦 **C** 6.9% |
| batch_update | 46 | 43 | 🟦 **C** 8.2% |
| batch_delete | 22 | 17 | 🟦 **C** 21.3% |
| query | 0 | 0 | 🟦 **C** <1% (low) |

#### 100B x 10,000 Documents

| Operation | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| single_save | 927 | 902 | 🟦 **C** 2.7% (low) |
| single_get | 409 | 410 | 🟩 **Swift** 0.2% (low) |
| single_update | 1,170 | 1,223 | 🟩 **Swift** 4.4% |
| single_delete | 1,193 | 1,108 | 🟦 **C** 7.1% |
| batch_save | 161 | 139 | 🟦 **C** 13.8% |
| batch_get | 103 | 96 | 🟦 **C** 6.8% |
| batch_update | 308 | 238 | 🟦 **C** 22.8% |
| batch_delete | 156 | 121 | 🟦 **C** 22.7% |
| query | 0 | 1 | 🟩 **Swift** 66.7% |

#### 100B x 100,000 Documents (batch + query only)

| Operation | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| batch_save | 1,580 | 1,256 | 🟦 **C** 20.5% |
| batch_get | 905 | 755 | 🟦 **C** 16.6% |
| batch_update | 2,934 | 2,307 | 🟦 **C** 21.4% |
| batch_delete | 1,438 | 846 | 🟦 **C** 41.1% |
| query | 1 | 1 | 🟦 **C** 20.0% |

---

### Suite 2: 1KB Documents

**Suite runtime:** ~12 minutes | **Permutations:** 11 | **Iterations:** 5 each

#### 1KB x 100 Documents

| Operation | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| single_save | 22 | 21 | 🟦 **C** 6.4% |
| single_get | 14 | 15 | 🟩 **Swift** 7.8% |
| single_update | 30 | 26 | 🟦 **C** 15.8% |
| single_delete | 32 | 36 | 🟩 **Swift** 10.6% |
| batch_save | 9 | 9 | 🟦 **C** 4.3% |
| batch_get | 6 | 10 | 🟩 **Swift** 43.1% |
| batch_update | 18 | 15 | 🟦 **C** 15.4% |
| batch_delete | 7 | 5 | 🟦 **C** 26.5% |
| query | 1 | 1 | Tie |

#### 1KB x 1,000 Documents

| Operation | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| single_save | 146 | 131 | 🟦 **C** 10.4% |
| single_get | 59 | 70 | 🟩 **Swift** 15.5% |
| single_update | 198 | 186 | 🟦 **C** 6.0% |
| single_delete | 145 | 137 | 🟦 **C** 5.1% |
| batch_save | 74 | 53 | 🟦 **C** 27.7% |
| batch_get | 30 | 28 | 🟦 **C** 8.6% |
| batch_update | 98 | 83 | 🟦 **C** 15.3% |
| batch_delete | 29 | 18 | 🟦 **C** 39.3% |
| query | 1 | 1 | Tie |

#### 1KB x 10,000 Documents

| Operation | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| single_save | 1,277 | 1,165 | 🟦 **C** 8.8% |
| single_get | 457 | 425 | 🟦 **C** 6.9% |
| single_update | 1,538 | 1,525 | 🟦 **C** 0.8% (low) |
| single_delete | 1,296 | 1,197 | 🟦 **C** 7.6% |
| batch_save | 551 | 431 | 🟦 **C** 21.8% |
| batch_get | 161 | 148 | 🟦 **C** 8.1% |
| batch_update | 763 | 588 | 🟦 **C** 22.9% |
| batch_delete | 169 | 117 | 🟦 **C** 31.0% |
| query | 1 | 1 | 🟦 **C** 28.6% |

#### 1KB x 100,000 Documents (batch + query only)

| Operation | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| batch_save | 5,351 | 4,276 | 🟦 **C** 20.1% |
| batch_get | 1,429 | 1,263 | 🟦 **C** 11.6% |
| batch_update | 7,656 | 5,896 | 🟦 **C** 23.0% |
| batch_delete | 1,571 | 997 | 🟦 **C** 36.5% |
| query | 1 | 1 | 🟩 **Swift** 16.7% |

---

### Suite 3: 10KB Documents

**Suite runtime:** ~35 minutes | **Permutations:** 11 | **Iterations:** 5 (<=10K), 3 (100K)

#### 10KB x 100 Documents

| Operation | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| single_save | 73 | 62 | 🟦 **C** 15.0% |
| single_get | 18 | 17 | 🟦 **C** 7.6% |
| single_update | 98 | 90 | 🟦 **C** 7.6% |
| single_delete | 35 | 35 | 🟦 **C** 2.3% (low) |
| batch_save | 71 | 54 | 🟦 **C** 24.2% |
| batch_get | 15 | 17 | 🟩 **Swift** 9.6% |
| batch_update | 90 | 69 | 🟦 **C** 23.7% |
| batch_delete | 7 | 5 | 🟦 **C** 26.5% |
| query | 5 | 6 | 🟩 **Swift** 16.1% |

#### 10KB x 1,000 Documents

| Operation | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| single_save | 568 | 427 | 🟦 **C** 24.8% |
| single_get | 99 | 80 | 🟦 **C** 19.3% |
| single_update | 683 | 532 | 🟦 **C** 22.1% |
| single_delete | 169 | 174 | 🟩 **Swift** 3.0% |
| batch_save | 546 | 419 | 🟦 **C** 23.3% |
| batch_get | 90 | 83 | 🟦 **C** 7.3% |
| batch_update | 668 | 501 | 🟦 **C** 25.0% |
| batch_delete | 35 | 23 | 🟦 **C** 35.8% |
| query | 5 | 5 | Tie |

#### 10KB x 10,000 Documents

| Operation | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| single_save | 5,422 | 4,183 | 🟦 **C** 22.9% |
| single_get | 706 | 719 | 🟩 **Swift** 1.9% (low) |
| single_update | 6,835 | 5,180 | 🟦 **C** 24.2% |
| single_delete | 1,555 | 1,491 | 🟦 **C** 4.1% |
| batch_save | 5,425 | 4,139 | 🟦 **C** 23.7% |
| batch_get | 726 | 700 | 🟦 **C** 3.6% |
| batch_update | 6,733 | 4,991 | 🟦 **C** 25.9% |
| batch_delete | 202 | 140 | 🟦 **C** 30.8% |
| query | 6 | 5 | 🟦 **C** <1% (low) |

#### 10KB x 100,000 Documents (batch + query only, 3 iterations)

| Operation | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| batch_save | 54,855 | 41,481 | 🟦 **C** 24.4% |
| batch_get | 7,165 | 6,951 | 🟦 **C** 3.0% |
| batch_update | 68,063 | 50,127 | 🟦 **C** 26.3% |
| batch_delete | 1,888 | 1,210 | 🟦 **C** 35.9% |
| query | 6 | 6 | 🟦 **C** <1% (low) |

---

### Suite 4: 100KB Documents

**Suite runtime:** ~45 minutes | **Permutations:** 9 | **Iterations:** 5 (<=1K), 3 (10K)

#### 100KB x 100 Documents

| Operation | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| single_save | 483 | 363 | 🟦 **C** 24.9% |
| single_get | 43 | 47 | 🟩 **Swift** 7.3% |
| single_update | 623 | 449 | 🟦 **C** 27.9% |
| single_delete | 38 | 31 | 🟦 **C** 18.9% |
| batch_save | 545 | 405 | 🟦 **C** 25.6% |
| batch_get | 78 | 82 | 🟩 **Swift** 5.4% |
| batch_update | 660 | 488 | 🟦 **C** 26.1% |
| batch_delete | 12 | 10 | 🟦 **C** 18.3% |
| query | 57 | 56 | 🟦 **C** 1.1% (low) |

#### 100KB x 1,000 Documents

| Operation | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| single_save | 4,740 | 3,464 | 🟦 **C** 26.9% |
| single_get | 309 | 297 | 🟦 **C** 3.7% |
| single_update | 5,965 | 4,245 | 🟦 **C** 28.8% |
| single_delete | 194 | 179 | 🟦 **C** 7.9% |
| batch_save | 5,346 | 3,976 | 🟦 **C** 25.6% |
| batch_get | 627 | 638 | 🟩 **Swift** 1.7% (low) |
| batch_update | 6,522 | 4,727 | 🟦 **C** 27.5% |
| batch_delete | 67 | 67 | 🟩 **Swift** 0.9% (low) |
| query | 57 | 59 | 🟩 **Swift** 3.4% |

#### 100KB x 10,000 Documents (3 iterations)

| Operation | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| single_save | 48,695 | 35,795 | 🟦 **C** 26.5% |
| single_get | 2,961 | 2,950 | 🟦 **C** 0.4% (low) |
| single_update | 61,026 | 43,509 | 🟦 **C** 28.7% |
| single_delete | 1,779 | 1,748 | 🟦 **C** 1.8% (low) |
| batch_save | 53,933 | 39,967 | 🟦 **C** 25.9% |
| batch_get | 6,351 | 6,283 | 🟦 **C** 1.1% (low) |
| batch_update | 66,096 | 47,930 | 🟦 **C** 27.5% |
| batch_delete | 445 | 398 | 🟦 **C** 10.7% |
| query | 61 | 57 | 🟦 **C** 6.5% |

---

### Suite 5: 1MB Documents

**Suite runtime:** ~44 minutes | **Permutations:** 6 | **Iterations:** 5 (100 docs), 3 (1K docs)

#### 1MB x 100 Documents

| Operation | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| single_save | 4,842 | 3,558 | 🟦 **C** 26.5% |
| single_get | 296 | 296 | Tie |
| single_update | 6,019 | 4,292 | 🟦 **C** 28.7% |
| single_delete | 61 | 55 | 🟦 **C** 9.8% |
| batch_save | 5,410 | 4,046 | 🟦 **C** 25.2% |
| batch_get | 646 | 636 | 🟦 **C** 1.5% (low) |
| batch_update | 6,575 | 4,802 | 🟦 **C** 27.0% |
| batch_delete | 42 | 46 | 🟩 **Swift** 9.5% |
| query | 542 | 555 | 🟩 **Swift** 2.3% (low) |

#### 1MB x 1,000 Documents (3 iterations)

| Operation | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| single_save | 50,261 | 37,083 | 🟦 **C** 26.2% |
| single_get | 2,918 | 2,903 | 🟦 **C** 0.5% (low) |
| single_update | 61,886 | 44,476 | 🟦 **C** 28.1% |
| single_delete | 410 | 408 | 🟦 **C** 0.5% (low) |
| batch_save | 55,099 | 41,109 | 🟦 **C** 25.4% |
| batch_get | 6,459 | 6,268 | 🟦 **C** 3.0% |
| batch_update | 66,875 | 48,830 | 🟦 **C** 27.0% |
| batch_delete | 243 | 280 | 🟩 **Swift** 13.2% |
| query | 550 | 547 | 🟦 **C** 0.5% (low) |

---

## 7. Analysis by Operation Type

> All margins in this section are based on **mean (average)** values across all document counts for each size. Ranges show min–max across counts (100, 1K, 10K, 100K where applicable).

### Save Operations (single_save + batch_save)

🟦 **C wins save in virtually every test case.** The C advantage grows with document size and stabilizes:

| Doc Size | Single Save | Batch Save |
|----------|------------|------------|
| 100B | 🟩🟦 Mixed: 🟩 Swift 4.5% to 🟦 C 6.5% | 🟦 **C** 5%–27% |
| 1KB | 🟦 **C** 6%–10% | 🟦 **C** 4%–28% |
| 10KB | 🟦 **C** 15%–25% | 🟦 **C** 23%–24% |
| 100KB | 🟦 **C** 25%–27% | 🟦 **C** 26% |
| 1MB | 🟦 **C** 26%–27% | 🟦 **C** 25% |

**At 100B**, results are noisy — 🟩 Swift wins one single_save case (x1K by 4.5%) while 🟦 C wins the others. At small sizes, overhead variations dominate and the winner fluctuates.

**At >= 10KB**, 🟦 **C is consistently ~25% faster at saving** with tight, stable margins. This is the most important finding for write-heavy enterprise applications.

### Update Operations (single_update + batch_update)

Update follows the same pattern as save (update is implemented as save with modified content), with slightly higher 🟦 C margins at large sizes:

| Doc Size | Single Update | Batch Update |
|----------|--------------|--------------|
| 100B | 🟩🟦 Mixed: 🟩 Swift 4%–6% to 🟦 C 17% | 🟦 **C** 8%–30% |
| 1KB | 🟦 **C** 1%–16% | 🟦 **C** 15%–23% |
| 10KB | 🟦 **C** 8%–24% | 🟦 **C** 24%–26% |
| 100KB | 🟦 **C** 28%–29% | 🟦 **C** 26%–28% |
| 1MB | 🟦 **C** 28%–29% | 🟦 **C** 27% |

**At 100B**, single_update is noisy — 🟩 Swift wins at 1K and 10K documents (by 4–6%), while 🟦 C wins at 100 documents (by 17%). The small absolute values make this unreliable.

🟦 **C is ~28% faster at updating documents >= 100KB**, with batch update margins stabilizing at 26–28%.

### Get Operations (single_get + batch_get)

Get is the **most balanced and noisy operation**. Neither SDK has a consistent advantage — the winner flips between sizes and counts:

| Doc Size | Single Get | Batch Get |
|----------|-----------|-----------|
| 100B | 🟩🟦 Mixed: 🟩 Swift 0.2%–14% / 🟦 C 23% | 🟩🟦 Mixed: 🟩 Swift 14% / 🟦 C 7%–17% |
| 1KB | 🟩🟦 Mixed: 🟩 Swift 8%–16% / 🟦 C 7% | 🟩🟦 Mixed: 🟩 Swift 43% / 🟦 C 8%–12% |
| 10KB | 🟩🟦 Mixed: 🟩 Swift 2% / 🟦 C 8%–19% | 🟩🟦 Mixed: 🟩 Swift 10% / 🟦 C 3%–7% |
| 100KB | 🟩🟦 Mixed: 🟩 Swift 7% / 🟦 C 0.4%–4% | 🟩🟦 Mixed: 🟩 Swift 2%–5% / 🟦 C 1% |
| 1MB | Tie to 🟦 **C** <1% (near-equal) | 🟦 **C** 2%–3% |

**Key observations:**
- 🟩 **Swift tends to win at small counts** (100 docs) across all sizes — likely due to cache effects and system noise
- 🟦 **C tends to win at large counts** (10K+) — the per-document overhead difference accumulates
- At 1MB, both SDKs are within 3% (near-parity) because the SQLite read path dominates
- The 🟩 Swift 43% batch_get win at 1KB x 100 is an outlier driven by a single noisy iteration

**Both SDKs are within 5% for get operations at scale.** The read path is fundamentally similar since both use the same SQLite storage engine underneath.

### Delete Operations (single_delete + batch_delete)

Delete shows the **most interesting pattern** — 🟦 C dominates at small-to-medium sizes, but 🟩 **Swift wins at 1MB**:

| Doc Size | Single Delete | Batch Delete |
|----------|--------------|--------------|
| 100B | 🟩🟦 Mixed: 🟩 Swift 26% / 🟦 C 7%–15% | 🟦 **C** 21%–41% |
| 1KB | 🟩🟦 Mixed: 🟩 Swift 11% / 🟦 C 5%–8% | 🟦 **C** 27%–39% |
| 10KB | 🟩🟦 Mixed: 🟩 Swift 3% / 🟦 C 2%–4% | 🟦 **C** 27%–36% |
| 100KB | 🟦 **C** 2%–19% | 🟩🟦 Mixed: mostly 🟦 C 11%–18% / 🟩 Swift 1% | 
| 1MB | 🟦 **C** 1%–10% | 🟩 **Swift** 10%–13% |

**Key observations:**
- **Single delete is noisy at small sizes**: 🟩 Swift wins at 100 documents for 100B, 1KB, and 10KB, but 🟦 C wins at larger counts. This suggests the winner depends on cache state and count.
- **Batch delete is consistently 🟦 C** from 100B through 10KB (21–41% margin)
- **At 100KB batch delete**, results get mixed — 🟩 Swift wins one case (x1K by 0.9%)
- **At 1MB, 🟩 Swift wins batch delete** (10–13%) — the only operation where Swift consistently beats C at scale. See Section 10 for explanation.

### Query Operations

| Doc Size | 🟩 Avg Swift (ms) | 🟦 Avg C (ms) | Difference |
|----------|------------------|---------------|------------|
| 100B | <1 | <1 | Near-equal |
| 1KB | ~1 | ~1 | Near-equal |
| 10KB | 5–6 | 5–6 | 🟩🟦 Mixed, <1ms difference |
| 100KB | 57–61 | 56–59 | 🟩🟦 Mixed: 🟩 Swift 3% or 🟦 C 1%–7% |
| 1MB | 542–550 | 547–555 | 🟩🟦 Mixed: 🟩 Swift 2% or 🟦 C <1% |

**Query performance is identical for `LIMIT 100`.** Both SDKs use the same N1QL/SQL++ query engine and the same SQLite backend. Query time scales linearly with document size (because `SELECT * LIMIT 100` must deserialize 100 documents), not with document count (the query engine uses indexes to find the first 100 rows quickly regardless of total count). The tiny differences at 100KB+ are pure noise.

> **For full-scan query results** (`SELECT * LIMIT N` returning all N documents), see [Section 11: Dedicated Query Benchmark](#11-dedicated-query-benchmark-full-scan-results). That benchmark reveals that 🟦 C is 22-24% faster for small documents (100B) at high row counts, but both SDKs are within 3% for documents >= 10KB.

---

## 9. Why 🟦 C Wins Most Cases

### Root Cause: Abstraction Layer Overhead

Both SDKs ultimately use the same underlying database engine (SQLite with Fleece encoding). The performance difference comes from what happens **between the JavaScript bridge call and the actual database operation**.

**🟩 Swift SDK overhead per document:**
1. `MutableDocument(id:, json:)` -- allocates a Swift object, parses JSON into Fleece through Swift wrappers, ARC retains the object
2. `collection.save(document:)` -- calls through CouchbaseLiteSwift.framework's Swift API layer, which internally calls the C engine
3. ARC releases the MutableDocument when it goes out of scope

**🟦 C SDK per document:**
1. `CBLDocument_CreateWithID()` -- creates a lightweight C struct (no ARC)
2. `CBLDocument_SetJSON()` -- parses JSON directly into Fleece (no Swift wrapper)
3. `CBLCollection_SaveDocument()` -- calls the C engine directly
4. `CBLDocument_Release()` -- explicit free (no ARC overhead)

**The 🟩 Swift SDK adds an object-oriented abstraction layer on top of the same 🟦 C engine.** This layer includes:
- ARC (Automatic Reference Counting) for every document object -- atomic increment/decrement on every retain/release
- Swift object allocation and deallocation overhead
- Additional indirection through the CouchbaseLiteSwift framework's internal dispatch to the C engine
- Closure-based transaction management (`db.inBatch {}`) vs explicit function calls (`BeginTransaction/EndTransaction`)

For a single document, this overhead is negligible (~microseconds). But across 10,000 or 100,000 documents, it accumulates to a measurable ~25% difference.

### Why the 🟦 C Margin Stabilizes at ~25% for Large Documents

For small documents (100B), the per-document overhead is a larger fraction of the total time, leading to variable margins (2–40%) where 🟩 Swift sometimes wins. For large documents (10KB+), the actual SQLite I/O dominates, and the fixed overhead per document becomes a consistent ~25% fraction. This is why the 🟦 C margins are remarkably stable at 24–28% for all documents >= 10KB.

### Why Batch Delete Has the Highest 🟦 C Margins (21–41%)

The 🟩 Swift SDK's `inBatch` closure for batch delete has additional overhead:
1. Swift reads each document into a full `Document` Swift object (with all Fleece data loaded into memory)
2. Swift calls `col.delete(document:)` which must handle the document's revision tree through Swift abstractions
3. ARC must manage each `Document` object's lifecycle within the batch closure

The 🟦 C SDK's batch delete is leaner:
1. C reads the document as a raw pointer
2. C calls `CBLCollection_DeleteDocument()` directly
3. Manual `CBLDocument_Release()` has no atomic reference counting overhead

Delete is the operation where ARC overhead is most pronounced because each iteration creates a temporary `Document` object that is immediately discarded.

---

## 10. Why 🟩 Swift Wins in Specific Cases

### 🟩 Swift Wins Batch Delete at 1MB (10–13% by average)

This is the most notable anomaly. At 1MB document size, 🟩 Swift wins batch_delete consistently:
- 1MB x 100: 🟩 Swift avg 42ms vs 🟦 C avg 46ms (🟩 Swift wins 9.5%)
- 1MB x 1K: 🟩 Swift avg 243ms vs 🟦 C avg 280ms (🟩 Swift wins 13.2%)

**Possible explanations:**
1. The 🟦 C library's internal document handling for very large Fleece blobs during deletion may have overhead that the 🟩 Swift SDK's higher-level optimized `delete(document:)` method avoids through internal caching or batch-aware optimizations.
2. The 🟦 C SDK's `CBLDocument_Release()` for 1MB documents involves releasing large Fleece memory allocations, which may be costlier through the C malloc/free path than 🟩 Swift's ARC-managed memory pool.
3. The 🟩 Swift SDK's `inBatch` closure may benefit from the Swift runtime's memory management optimizations for batch operations on large objects.

### 🟩 Swift Wins Get at Small Counts (100 docs)

At 100 documents, 🟩 Swift wins batch_get across multiple sizes:
- 10KB x 100: 🟩 Swift avg 15ms vs 🟦 C avg 17ms (🟩 Swift wins 9.6%)
- 100KB x 100: 🟩 Swift avg 78ms vs 🟦 C avg 82ms (🟩 Swift wins 5.4%)
- 1KB x 100: 🟩 Swift avg 6ms vs 🟦 C avg 10ms (🟩 Swift wins 43.1%)

For small counts (100 documents), the absolute times are very small (6–82ms), and the difference is likely dominated by:
1. Cache effects (which SDK's previous operation left the CPU cache in a more favorable state)
2. The 🟦 C SDK's additional Swift-to-ObjC++ bridge hop for get operations
3. System noise at these small absolute values

---

## 10. Data Reliability Notes

> All margins cited here are based on **mean (average)** values.

### High-Confidence Results (reliable, consistent across iterations)

- 🟦 **All save/update operations at >= 10KB documents**: Very consistent margins (22–29% 🟦 C advantage), low variance across iterations. These are the benchmark's strongest findings.
- 🟦 **Batch delete at 100B–10KB**: Consistent 🟦 C advantage (21–41%), low variance.
- **All query results**: Both SDKs perform identically within measurement precision.
- 🟩 **Batch delete at 1MB**: Consistent 🟩 Swift advantage (10–13%), validated across multiple iterations.

### Medium-Confidence Results (reliable trend, some variance)

- 🟦 **Save/update at 1KB**: 🟦 C advantage is real (6–28%) but smaller and more variable than at larger sizes.
- 🟦 **Get operations at >= 10K documents**: 🟦 C is slightly faster (1–7%), consistent but small margins.

### Low-Confidence Results (likely noise, do not draw conclusions)

- 🟩🟦 **Any operation at 100B x 100 documents**: Absolute times are 1–40ms. System noise dominates. The winner flips between 🟩 Swift and 🟦 C depending on the operation, with margins of 6–40% representing 1–10ms absolute differences.
- 🟩🟦 **Get operations at <= 1K documents for any size**: Results flip between 🟩 Swift and 🟦 C across different counts, suggesting the difference is within noise.
- **Any comparison where both values round to the same integer** (e.g., "4ms vs 4ms -> 🟦 C 13.8%"): The actual sub-millisecond difference is real but at the edge of meaningful measurement.

---

## 11. Dedicated Query Benchmark: Full-Scan Results

### Overview

The CRUD benchmark (Section 6) tests query with `SELECT * FROM items LIMIT 100`, which always returns exactly 100 rows regardless of how many documents exist. This dedicated query benchmark tests **full-scan queries** that return **all N documents** from the database, revealing how query performance scales with both document size and document count.

**Query used:** `SELECT * FROM items LIMIT N` where N = total document count. For large result sets that would exceed Hermes' string length limit, the query is automatically paginated using `LIMIT/OFFSET` chunks, with the timer wrapping the entire paginated fetch.

**Pre-population:** Before each timed query, N documents are batch-inserted into a fresh database (untimed). Only the query execution is timed.

### Test Parameters

| Parameter | Value |
|-----------|-------|
| Suites | 5 (100B, 1KB, 10KB, 100KB, 1MB) |
| Total Permutations | 17 |
| Total Comparisons | 17 (one query operation per permutation) |
| Iterations | 5 if total data <= 100MB, 3 if > 100MB |
| Warmup | 1 round (excluded from statistics) |
| Fairness | Same protocol as CRUD: alternating SDK order, fresh DB per run, 1s cooldown |

### Test Matrix

| Suite | Counts Tested | Iterations |
|-------|--------------|------------|
| 100B | 100, 1K, 10K, 100K | All 5 |
| 1KB | 100, 1K, 10K, 100K | All 5 |
| 10KB | 100, 1K, 10K, 100K | 5 for <= 10K, 3 for 100K |
| 100KB | 100, 1K, 10K | 5 for <= 1K, 3 for 10K |
| 1MB | 100, 1K | 5 for 100, 3 for 1K |

> **Note:** The same feasibility limits apply -- combinations exceeding 1GB total data (e.g., 100KB x 100K, 1MB x 10K) are excluded.

### Complete Results: All 17 Query Comparisons

Each table shows the **mean (average)** of timed iterations (warmup excluded). All times in **milliseconds (ms)**. Same legend as Section 6.

#### Query Suite 1: 100B Documents

**Suite runtime:** ~1 minute | **Permutations:** 4 | **Iterations:** 5 each

| Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-------|---------------|------------|--------|
| 100 | 1 | 1 | Tie |
| 1,000 | 2 | 2 | 🟦 **C** 8.3% (low) |
| 10,000 | 16 | 12 | 🟦 **C** 23.5% |
| 100,000 | 164 | 128 | 🟦 **C** 22.0% |

At 100B, C has a clear advantage at scale. With 10K-100K rows of tiny documents, the per-row bridge overhead in Swift accumulates to a consistent ~22-24% deficit. At 100 and 1K rows, absolute times are sub-3ms and differences are noise.

#### Query Suite 2: 1KB Documents

**Suite runtime:** ~2 minutes | **Permutations:** 4 | **Iterations:** 5 each

| Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-------|---------------|------------|--------|
| 100 | 1 | 1 | Tie |
| 1,000 | 5 | 6 | 🟩 **Swift** 6.9% |
| 10,000 | 57 | 54 | 🟦 **C** 5.3% |
| 100,000 | 561 | 541 | 🟦 **C** 3.6% |

At 1KB, results are mixed with small margins. Swift wins at 1K rows (6.9%), while C wins at 10K-100K rows (4-5%). The per-row overhead is less significant because the document content (1KB) now represents a larger share of total processing time.

#### Query Suite 3: 10KB Documents

**Suite runtime:** ~10 minutes | **Permutations:** 4 | **Iterations:** 5 (<=10K), 3 (100K)

| Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-------|---------------|------------|--------|
| 100 | 12 | 13 | 🟩 **Swift** 4.7% |
| 1,000 | 121 | 118 | 🟦 **C** 2.6% (low) |
| 10,000 | 1,145 | 1,146 | 🟩 **Swift** 0.2% (low) |
| 100,000 | 13,871 | 13,911 | 🟩 **Swift** 0.3% (low) |

At 10KB, both SDKs are effectively identical. Three of four comparisons are under 3% margin. The document I/O (reading and deserializing 10KB of nested JSON per row) completely dominates, making the per-row bridge overhead negligible.

#### Query Suite 4: 100KB Documents

**Suite runtime:** ~10 minutes | **Permutations:** 3 | **Iterations:** 5 (<=1K), 3 (10K)

| Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-------|---------------|------------|--------|
| 100 | 119 | 121 | 🟩 **Swift** 1.5% (low) |
| 1,000 | 1,163 | 1,170 | 🟩 **Swift** 0.6% (low) |
| 10,000 | 12,223 | 12,126 | 🟦 **C** 0.8% (low) |

At 100KB, all results are within 2%. The massive document size (100KB of nested JSON per row) means query time is entirely dominated by I/O and deserialization. Bridge overhead is unmeasurable.

#### Query Suite 5: 1MB Documents

**Suite runtime:** ~10 minutes | **Permutations:** 2 | **Iterations:** 5 (100 docs), 3 (1K docs)

| Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-------|---------------|------------|--------|
| 100 | 1,164 | 1,184 | 🟩 **Swift** 1.7% (low) |
| 1,000 | 11,914 | 11,840 | 🟦 **C** 0.6% (low) |

At 1MB, both SDKs are within 2%. Querying 1,000 documents of 1MB each takes ~12 seconds for both SDKs -- the SQLite read path and Fleece deserialization completely dominate.

### Query Scorecard

| Category | 🟦 C Wins | 🟩 Swift Wins | Ties |
|----------|----------|--------------|------|
| 100B (4 tests) | 3 (75.0%) | 0 (0.0%) | 1 (25.0%) |
| 1KB (4 tests) | 2 (50.0%) | 1 (25.0%) | 1 (25.0%) |
| 10KB (4 tests) | 1 (25.0%) | 3 (75.0%) | 0 (0.0%) |
| 100KB (3 tests) | 1 (33.3%) | 2 (66.7%) | 0 (0.0%) |
| 1MB (2 tests) | 1 (50.0%) | 1 (50.0%) | 0 (0.0%) |
| **Overall (17 tests)** | **8 (47.1%)** | **7 (41.2%)** | **2 (11.8%)** |

### Key Findings

**1. C wins only for small documents at high row counts.**

The only test cases where C has a meaningful advantage (> 5%) are 100B x 10K (23.5%) and 100B x 100K (22.0%). At 100B per document, the per-row processing overhead in the Swift bridge is a significant fraction of the total work. The C SDK's leaner per-row path -- no ARC, no Swift object allocation per result row -- accumulates to a ~22% advantage across 10K-100K rows.

**2. At 1KB, the advantage shrinks to single digits and flips.**

At 1KB per document, the winner varies by row count: Swift wins at 1K rows (6.9%), C wins at 10K (5.3%) and 100K (3.6%). The margins are small enough that this is a near-parity result.

**3. At >= 10KB, both SDKs are within 3% -- effectively identical.**

For documents of 10KB and larger, 12 out of 13 comparisons have margins under 3%. The actual SQLite I/O and Fleece deserialization of each document's content completely dominates the total query time. The per-row bridge overhead becomes unmeasurable noise.

**4. Query time scales linearly with total data volume.**

The data shows near-perfect linear scaling with (document size x document count):
- 100B x 100K (10MB total) = ~128-164ms
- 1KB x 10K (10MB total) = ~54-57ms (comparable order of magnitude)
- 10KB x 1K (10MB total) = ~118-121ms (comparable order of magnitude)
- 100KB x 100 (10MB total) = ~119-121ms (comparable order of magnitude)

This confirms that total data volume, not row count or document size alone, determines query time.

### Data Reliability Notes (Query Benchmark)

**High-confidence results:**
- 🟦 **100B x 10K and 100B x 100K**: Consistent 22-24% C advantage across all 5 iterations with low variance. These are the benchmark's strongest query findings.
- **All results at >= 10KB**: Consistently within 3% across iterations. The parity finding is robust.

**Low-confidence results (noise):**
- **100B x 100 and 1KB x 100**: Absolute times are 1ms. Sub-millisecond differences are not meaningful.
- **100B x 1K**: Both display as 2ms. The 8.3% margin represents a 0.2ms absolute difference.
- **Any comparison where the margin is under 3%**: The winner may flip on a re-run. These should be interpreted as "no meaningful difference."

---

## Appendix A: Test Execution Timeline

### CRUD Benchmark

| Suite | Started | Completed | Duration |
|-------|---------|-----------|----------|
| 100B | 2026-02-16 05:20 | 2026-02-16 05:29 | ~9 min |
| 1KB | 2026-02-16 05:29 | 2026-02-16 05:41 | ~12 min |
| 10KB | 2026-02-16 05:41 | 2026-02-16 06:16 | ~35 min |
| 100KB | 2026-02-16 06:16 | 2026-02-16 07:02 | ~46 min |
| 1MB | 2026-02-16 08:02 | 2026-02-16 08:46 | ~44 min |

CRUD wall-clock time: approximately 2.5 hours (plus 1 hour gap before 1MB suite).

### Query-Scaling Benchmark

| Suite | Started | Completed | Duration |
|-------|---------|-----------|----------|
| 100B query | 2026-02-16 19:10 | 2026-02-16 19:12 | ~1 min |
| 1KB query | 2026-02-16 19:12 | 2026-02-16 19:14 | ~2 min |
| 10KB query | 2026-02-17 04:59 | 2026-02-17 05:09 | ~10 min |
| 100KB query | 2026-02-17 05:10 | 2026-02-17 05:19 | ~10 min |
| 1MB query | 2026-02-17 05:23 | 2026-02-17 05:32 | ~10 min |

Query-scaling wall-clock time: approximately 33 minutes (plus overnight gap between 1KB and 10KB suites).

**Combined total: approximately 3 hours across all 10 suites.**

## Appendix B: Raw Data Reference

The complete raw test output with every iteration's timing data is available in the following files alongside this report:

**CRUD benchmark:** `TEST_RESULTS.txt`
- All 48 CRUD permutations with individual iteration timings
- Warmup data for every permutation
- SDK execution order for every iteration
- The complete summary tables

**Query-scaling benchmark:** `test_query_results.txt`
- All 17 query permutations with individual iteration timings
- Warmup data for every permutation
- SDK execution order for every iteration
- Median-based summary comparison at the end
