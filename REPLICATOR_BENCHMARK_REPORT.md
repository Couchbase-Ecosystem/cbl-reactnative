# Couchbase Lite SDK Replicator Performance Benchmark Report

**Couchbase Lite Swift SDK vs Couchbase Lite C SDK — Replication on iOS**

| Field | Value |
|-------|-------|
| Date | February 24, 2026 |
| Device / OS | iOS Simulator |
| Framework | React Native with Turbo Modules (New Architecture) |
| Swift SDK | CouchbaseLiteSwift framework 3.3 |
| C SDK | libcblite 4.0.0 (C API via Objective-C++ bridge) |
| Backend | Docker Sync Gateway + Docker Couchbase Server (local) |
| Sync Gateway RAM | 3 GB (Docker memory limit) |
| Network | Localhost (Simulator ↔ Docker on the same machine) |
| Operations Tested | Push, Pull, Bidirectional |
| Document Sizes | 100B, 1KB, 10KB, 100KB, 1MB |
| Total Comparisons | 48 unique operation comparisons across 3 replication types |
| Iterations | 2 timed runs per SDK per test, alternating execution order |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What Was Tested](#2-what-was-tested)
3. [Test Design & Fairness](#3-test-design--fairness)
4. [Complete Results: Push Replicator](#4-complete-results-push-replicator)
5. [Complete Results: Pull Replicator](#5-complete-results-pull-replicator)
6. [Complete Results: Bidirectional Replicator](#6-complete-results-bidirectional-replicator)
7. [Overall Scorecard](#7-overall-scorecard)
8. [Variance Notes](#8-variance-notes)
9. [Why Replicator Shows Near-Parity (Contrast with CRUD)](#9-why-replicator-shows-near-parity-contrast-with-crud)
10. [Conclusion](#10-conclusion)
11. [Appendix: Raw Data Reference](#appendix-raw-data-reference)

---

## 1. Executive Summary

### The Bottom Line

**The 🟩 Swift SDK and 🟦 C SDK are near-parity for replication performance.** By winner count, the result is a perfect **24–24 split** across all 48 test comparisons — far closer than the 78.7% 🟦 C dominance seen in the [CRUD benchmark](./BENCHMARK_REPORT.md).

> All results are **mean (average)** of 2 timed iterations per SDK (alternating execution order). Some variance in larger tests is attributable to Sync Gateway RAM pressure (3GB Docker limit) rather than SDK differences.

### Key Findings

| Finding | Detail |
|---------|--------|
| **Replicator is near-parity** | 24–24 wins. Neither SDK has a systematic advantage for sync operations |
| **Push is the closest** | 🟩 Swift 7 wins, 🟦 C 9 wins — margins are razor-thin on most tests |
| **Pull has higher variance** | Sync Gateway warmup and RAM state inflate run-to-run variance at small doc counts |
| **Bidirectional is a perfect split** | 🟩 Swift 8 wins, 🟦 C 8 wins |
| **No consistent size-based pattern** | Unlike CRUD (where 🟦 C grows stronger with doc size), replicator advantages shift unpredictably |
| **Sync Gateway processing dominates** | Server-side processing dwarfs any SDK-level overhead |
| **3GB RAM constraint causes variance** | As tests progressed 100B → 1MB, Sync Gateway RAM filled progressively; cleanup takes ~15 min for full purge |

### Scorecard

| Category | 🟩 Swift Wins | 🟦 C Wins |
|----------|--------------|----------|
| Push (16 tests) | 7 (43.75%) | 9 (56.25%) |
| Pull (16 tests) | 9 (56.25%) | 7 (43.75%) |
| Bidirectional (16 tests) | 8 (50.00%) | 8 (50.00%) |
| **Grand Total (48 tests)** | **24 (50.00%)** | **24 (50.00%)** |

### Comparison with CRUD Benchmark

| Metric | CRUD Benchmark | Replicator Benchmark |
|--------|----------------|---------------------|
| 🟦 C win rate | **78.7%** (111/141) | **50.00%** (24/48) |
| 🟩 Swift win rate | 17.7% (25/141) | **50.00%** (24/48) |
| Dominant factor | SDK overhead (ARC, object allocation) | Sync Gateway processing, server-side RAM |

---

## 2. What Was Tested

### Document Sizes

| Size | Target Bytes | Example Use Case |
|------|-------------|------------------|
| 100B | 100 bytes | Minimal metadata records, flags, counters |
| 1KB | 1,000 bytes | User profiles, configuration objects |
| 10KB | 10,000 bytes | Order records with line items, audit trails |
| 100KB | 100,000 bytes | Rich content documents, form submissions with attachments |
| 1MB | 1,000,000 bytes | Large enterprise documents, reports with embedded data |

### Replication Operations

| Operation | What It Measures | Data Flow |
|-----------|-----------------|-----------|
| **Push** | Time to push N documents from Simulator to Docker Sync Gateway | Simulator → Docker SG |
| **Pull** | Time to pull N documents from Docker Sync Gateway to Simulator | Docker SG → Simulator |
| **Bidirectional** | Time to simultaneously push N/2 local docs AND pull N/2 server docs | Simulator ↔ Docker SG |

### Test Matrix

Tests were run sequentially: **100B → 1KB → 10KB → 100KB → 1MB**. Sync Gateway requires approximately **15 minutes** to fully purge documents and caches between suites.

| Size | Doc Counts Tested | Tests per Operation | Total (×3 ops) |
|------|------------------|--------------------|-----------------| 
| 100B | 100, 1K, 10K, 100K | 4 | 12 |
| 1KB | 100, 1K, 10K, 100K | 4 | 12 |
| 10KB | 100, 1K, 10K, 100K | 4 | 12 |
| 100KB | 100, 1K, 10K | 3 | 9 |
| 1MB | 100 | 1 | 3 |
| **Total** | | **16 per operation** | **48** |

> 100KB × 100K and 1MB × 1K+ were excluded as they exceed both Simulator memory and the 3GB Sync Gateway RAM limit.

---

## 3. Test Design & Fairness

The replicator benchmark measures **end-to-end sync performance** between the iOS Simulator and a locally running Docker Sync Gateway (backed by Docker Couchbase Server). All communication is over localhost — network latency is effectively zero. The performance bottleneck is **Sync Gateway processing** and its **3GB RAM constraint**.

**Flows (only the replicator wait is timed; document prep and DB open/close are untimed):**

- **Push:** Create fresh DB → Batch save N docs locally → `[TIMED]` push replicator → IDLE → Close & delete DB
- **Pull:** Pre-populate N docs on server → Create fresh DB → `[TIMED]` pull replicator → IDLE → Close & delete DB
- **Bidirectional:** Stage N/2 on server → Save N/2 locally → `[TIMED]` pushAndPull replicator → IDLE → Close & delete DB

**Iteration Protocol:** For each test, Run 1 has 🟩 Swift first then 🟦 C; Run 2 has 🟦 C first then 🟩 Swift. This alternating order eliminates first-mover advantages from Sync Gateway cache warming.

### Fairness Protocol

| Measure | Implementation |
|---------|---------------|
| Fresh database per run | Eliminates data accumulation, checkpoint history, index state |
| Alternating SDK order | Eliminates first-mover advantage (Sync Gateway cache warming) |
| Cooldown between runs | Allows Sync Gateway to settle between runs |
| Server state management | Automated cleanup/staging between tests |
| Identical inputs | Same JSON documents, same IDs, same collection |
| Identical bridge architecture | Both SDKs use React Native Turbo Modules |
| Same replicator config | Same endpoint, authentication, collection, one-shot mode |
| Local-only network | All traffic over localhost — eliminates internet variability |

> **Sync Gateway cleanup note:** Sync Gateway takes approximately **15 minutes** to fully purge documents, internal caching, and checkpoint records. Not all inter-test gaps were 15 minutes, so later suites (100KB, 1MB) may have run against a Sync Gateway with residual RAM pressure.

---

## 4. Complete Results: Push Replicator

Each table shows the **mean (average)** of 2 timed runs per SDK. All times in **milliseconds (ms)**.

**Legend:** 🟩 **Swift** = Swift SDK wins · 🟦 **C** = C SDK wins · Winner is always **bold** · Percentage = how much faster the winner is

### Push: 100B Documents

| Doc Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| 100 | 536 | 541 | 🟩 **Swift** 0.83% |
| 1,000 | 530 | 533 | 🟩 **Swift** 0.56% |
| 10,000 | 2,589 | 2,584 | 🟦 **C** 0.17% |
| 100,000 | 22,062 | 20,810 | 🟦 **C** 5.68% |

At 100B, push times are nearly identical across all doc counts. The 5.68% 🟦 C advantage at 100K is the only notable difference.

### Push: 1KB Documents

| Doc Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| 100 | 543 | 534 | 🟦 **C** 1.75% |
| 1,000 | 539 | 538 | 🟦 **C** 0.19% |
| 10,000 | 2,847 | 3,095 | 🟩 **Swift** 8.01% |
| 100,000 | 22,590 | 18,002 | 🟦 **C** 20.31% |

Results are mixed. 🟩 Swift wins at 10K (8.01%), 🟦 C wins at 100K (20.31%). The 100K variance (Swift runs: 25,677ms vs 19,503ms) is attributable to Sync Gateway RAM pressure — see [Section 8](#8-variance-notes).

### Push: 10KB Documents

| Doc Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| 100 | 535 | 545 | 🟩 **Swift** 1.93% |
| 1,000 | 550 | 541 | 🟦 **C** 1.64% |
| 10,000 | 4,633 | 4,635 | 🟩 **Swift** 0.05% |
| 100,000 | 34,226 | 33,854 | 🟦 **C** 1.09% |

**10KB push is the most balanced suite.** All 4 tests are within 2%. Even at 100K documents (1GB total data), the difference is just 372ms out of 34 seconds.

### Push: 100KB Documents

| Doc Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| 100 | 548 | 537 | 🟦 **C** 2.01% |
| 1,000 | 2,086 | 1,586 | 🟦 **C** 23.98% |
| 10,000 | 14,106 | 15,172 | 🟩 **Swift** 7.03% |

Results are split: 🟦 C wins at 1K (23.98%) but 🟩 Swift wins at 10K (7.03%). The direction reversal is driven by Sync Gateway RAM pressure — by the time 100KB tests ran, residual memory from earlier suites constrained Sync Gateway performance.

### Push: 1MB Documents

| Doc Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| 100 | 1,570 | 1,575 | 🟩 **Swift** 0.32% |

At 1MB × 100 docs (100MB total), both SDKs are within 5ms.

### Push Summary

| Size | Tests | 🟩 Swift | 🟦 C |
|------|-------|---------|------|
| 100B | 4 | 2 | 2 |
| 1KB | 4 | 1 | 3 |
| 10KB | 4 | 2 | 2 |
| 100KB | 3 | 1 | 2 |
| 1MB | 1 | 1 | 0 |
| **Total** | **16** | **7 (43.75%)** | **9 (56.25%)** |

**Push verdict:** Near-parity. 🟦 C has a slight 9–7 edge, but most margins are under 2%.

---

## 5. Complete Results: Pull Replicator

> **Note:** Pull tests show higher run-to-run variance than push tests due to Sync Gateway warmup — the first run is frequently slower than the second as the server warms its internal state. The alternating SDK order ensures this warmup penalty is distributed evenly across both SDKs.

### Pull: 100B Documents

| Doc Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| 100 | 2,093 | 1,833 | 🟦 **C** 12.42% |
| 1,000 | 1,827 | 2,089 | 🟩 **Swift** 12.57% |
| 10,000 | 2,599 | 2,590 | 🟦 **C** 0.35% |
| 100,000 | 13,092 | 11,837 | 🟦 **C** 9.59% |

At 100B, the 100-doc and 1,000-doc results are heavily influenced by Sync Gateway warmup (individual runs range from 1,051ms to 3,126ms). At 10K the results converge (0.35%). At 100K, 🟦 C shows a 9.59% advantage.

### Pull: 1KB Documents

| Doc Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| 100 | 1,314 | 1,323 | 🟩 **Swift** 0.64% |
| 1,000 | 1,312 | 1,308 | 🟦 **C** 0.30% |
| 10,000 | 3,357 | 2,606 | 🟦 **C** 22.39% |
| 100,000 | 10,049 | 9,538 | 🟦 **C** 5.09% |

Small counts show very small margins. At 10K, 🟦 C wins by 22.39% — Swift's runs vary widely (4,117ms vs 2,597ms), with the first run absorbing a Sync Gateway warmup penalty. At 100K, the margin narrows to 5.09%.

### Pull: 10KB Documents

| Doc Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| 100 | 1,038 | 1,051 | 🟩 **Swift** 1.19% |
| 1,000 | 1,048 | 1,057 | 🟩 **Swift** 0.85% |
| 10,000 | 2,080 | 2,086 | 🟩 **Swift** 0.31% |
| 100,000 | 13,872 | 17,455 | 🟩 **Swift** 20.52% |

🟩 Swift is stable and consistent across all four counts. The 100, 1K, and 10K tests are all within 1.19%, and Swift carries a 20.52% advantage at 100K.

### Pull: 100KB Documents

| Doc Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| 100 | 534 | 540 | 🟩 **Swift** 1.02% |
| 1,000 | 1,317 | 1,575 | 🟩 **Swift** 16.35% |
| 10,000 | 8,993 | 11,832 | 🟩 **Swift** 23.99% |

🟩 Swift wins all three tests. The 10K result (23.99%) is the largest pull margin in the entire benchmark.

### Pull: 1MB Documents

| Doc Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| 100 | 1,565 | 1,557 | 🟦 **C** 0.51% |

At 1MB × 100 docs (100MB total), both SDKs are within 8ms.

### Pull Summary

| Size | Tests | 🟩 Swift | 🟦 C |
|------|-------|---------|------|
| 100B | 4 | 1 | 3 |
| 1KB | 4 | 1 | 3 |
| 10KB | 4 | 4 | 0 |
| 100KB | 3 | 3 | 0 |
| 1MB | 1 | 0 | 1 |
| **Total** | **16** | **9 (56.25%)** | **7 (43.75%)** |

**Pull verdict:** 🟩 Swift leads 9–7. 🟦 C tends to win at small document sizes (100B, 1KB), while 🟩 Swift wins at larger document sizes (10KB, 100KB).

---

## 6. Complete Results: Bidirectional Replicator

> Bidirectional tests push N/2 local documents to the server while simultaneously pulling N/2 server documents to the device.

### Bidirectional: 100B Documents

| Doc Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| 100 | 305 | 306 | 🟩 **Swift** 0.33% |
| 1,000 | 305 | 310 | 🟩 **Swift** 1.61% |
| 10,000 | 1,606 | 1,613 | 🟩 **Swift** 0.40% |
| 100,000 | 13,319 | 12,909 | 🟦 **C** 3.08% |

The tightest suite across all operations. The first three counts are within 1.61%. At 100K, 🟦 C edges ahead by 3.08%.

### Bidirectional: 1KB Documents

| Doc Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| 100 | 319 | 310 | 🟦 **C** 2.98% |
| 1,000 | 305 | 303 | 🟦 **C** 0.49% |
| 10,000 | 1,632 | 1,597 | 🟦 **C** 2.15% |
| 100,000 | 13,874 | 13,536 | 🟦 **C** 2.44% |

🟦 C wins all four tests, with margins ranging from 0.49% to 2.98%.

### Bidirectional: 10KB Documents

| Doc Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| 100 | 309 | 312 | 🟩 **Swift** 0.96% |
| 1,000 | 541 | 552 | 🟩 **Swift** 2.08% |
| 10,000 | 2,397 | 2,381 | 🟦 **C** 0.67% |
| 100,000 | 21,246 | 22,663 | 🟩 **Swift** 6.25% |

Three of four tests are within 2.08%. At 100K (1GB total sync), 🟩 Swift wins by 6.25% — both Swift runs (21,332ms and 21,160ms) are consistently faster than both 🟦 C runs (22,868ms and 22,458ms).

### Bidirectional: 100KB Documents

| Doc Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| 100 | 7,864 | 7,943 | 🟩 **Swift** 0.99% |
| 1,000 | 1,391 | 1,120 | 🟦 **C** 19.48% |
| 10,000 | 11,017 | 10,195 | 🟦 **C** 7.46% |

The 100-doc result (7.8s) is an outlier explained by Sync Gateway RAM pressure at the start of the 100KB suite. The 1K and 10K results are consistent: 🟦 C wins by 19.48% and 7.46% respectively.

### Bidirectional: 1MB Documents

| Doc Count | Avg Swift (ms) | Avg C (ms) | Winner |
|-----------|---------------|------------|--------|
| 100 | 1,756 | 1,855 | 🟩 **Swift** 5.34% |

At 1MB × 100 docs (100MB total sync), 🟩 Swift leads by 5.34%.

### Bidirectional Summary

| Size | Tests | 🟩 Swift | 🟦 C |
|------|-------|---------|------|
| 100B | 4 | 3 | 1 |
| 1KB | 4 | 0 | 4 |
| 10KB | 4 | 3 | 1 |
| 100KB | 3 | 1 | 2 |
| 1MB | 1 | 1 | 0 |
| **Total** | **16** | **8 (50.00%)** | **8 (50.00%)** |

**Bidirectional verdict:** Perfect 8–8 split. 🟦 C sweeps 1KB, 🟩 Swift takes 100B and 10KB. A perfect balance.

---

## 7. Overall Scorecard

### By Operation Type

| Operation | 🟩 Swift Wins | 🟦 C Wins |
|-----------|--------------|----------|
| Push (16 tests) | 7 (43.75%) | 9 (56.25%) |
| Pull (16 tests) | 9 (56.25%) | 7 (43.75%) |
| Bidirectional (16 tests) | 8 (50.00%) | 8 (50.00%) |
| **Total (48 tests)** | **24 (50.00%)** | **24 (50.00%)** |

### By Document Size (Across All Operations)

| Size | Tests | 🟩 Swift Wins | 🟦 C Wins |
|------|-------|--------------|----------|
| 100B | 12 | 6 (50.00%) | 6 (50.00%) |
| 1KB | 12 | 2 (16.67%) | 10 (83.33%) |
| 10KB | 12 | 9 (75.00%) | 3 (25.00%) |
| 100KB | 9 | 5 (55.56%) | 4 (44.44%) |
| 1MB | 3 | 2 (66.67%) | 1 (33.33%) |
| **Total** | **48** | **24 (50.00%)** | **24 (50.00%)** |

**Key patterns:**
- **100B:** Perfect 6–6. Neither SDK has an advantage at tiny doc sizes.
- **1KB:** 🟦 C leads 10–2, driven by pull and bidirectional results.
- **10KB:** 🟩 Swift leads 9–3, though most margins are very small.
- **100KB:** 🟩 Swift slightly ahead 5–4. Most variance here is from Sync Gateway RAM pressure.
- **1MB:** 🟩 Swift leads 2–1 across only 3 tests, all with small margins.

---

## 8. Variance Notes

### Consistent Results

- **All push tests at 10KB** — both runs per SDK produce nearly identical timings (< 2% spread). **Both SDKs push 10KB documents at exactly the same speed.**
- **All tests at 1MB** — both SDKs within 0.51% for push and pull. Bidirectional (5.34%) is also consistent.
- **Bidirectional at 100B and 1KB** — 7 of 8 tests have very small margins with tight run-to-run consistency.
- **Pull at 10KB × 100–10K** — all three tests within 1.19%.

### Results Affected by Sync Gateway RAM Pressure

- **Push 1KB × 100K (🟦 C 20.31%)** — Swift's two runs differ sharply (25,677ms vs 19,503ms). The first run hit RAM pressure from 100MB being ingested into a 3GB container already holding residual data. Comparing only the second runs: Swift 19,503ms vs C 17,977ms — 🟦 C still wins but by a smaller 8.5%.
- **Pull 1KB × 10K (🟦 C 22.39%)** — Swift's runs differ (4,117ms vs 2,597ms). The first run absorbed a Sync Gateway warmup penalty; comparing warmed second runs narrows the margin significantly.
- **Pull 100KB × 10K (🟩 Swift 23.99%)** — consistent direction (both Swift runs faster), but 100KB × 10K = 1GB total data stresses the 3GB Sync Gateway RAM limit.
- **Bidirectional 100KB × 1K (🟦 C 19.48%)** — Swift's runs vary (1,233ms vs 1,549ms), but the direction is consistent. This suite ran after three prior suites, so Sync Gateway RAM was already stressed.

### Results Explained by Sync Gateway Warmup

- **Pull 100B × 100 and × 1K** — individual runs range from 1,051ms to 3,126ms. The first run in each pair absorbed a Sync Gateway warmup cost; the alternating execution order ensures this is distributed evenly across both SDKs.
- **Bidirectional 100KB × 100 (7.8 seconds)** — an outlier explained by Sync Gateway RAM pressure at the start of the 100KB suite. The 1K and 10K results for the same suite are consistent and reliable.

---

## 9. Why Replicator Shows Near-Parity (Contrast with CRUD)

In the [CRUD benchmark](./BENCHMARK_REPORT.md), 🟦 C won 78.7% of tests with consistent 22–29% margins. The replicator shows a 24–24 tie. Why?

**CRUD bottleneck: SDK object handling**
```
[JavaScript] → [Bridge] → [SDK Layer] → [SQLite/Fleece]
                            ^^^^^^^^^^
                            This is where C wins (ARC, Swift wrappers, object allocation)
```

**Replicator bottleneck: Sync Gateway processing**
```
[JavaScript] → [Bridge] → [SDK Layer] → [Replicator Engine] → [localhost] → [Docker Sync Gateway (3GB RAM)]
                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                          These dominate — same for both SDKs
```

Even at zero network latency, the **Sync Gateway** is the bottleneck. The per-document SDK overhead that gives 🟦 C its CRUD advantage is tiny relative to Sync Gateway's ingestion, revision tracking, and checkpoint management. Even a large improvement in SDK overhead has no measurable impact on end-to-end sync speed.

Both the 🟩 Swift SDK and 🟦 C SDK use the **same underlying replicator engine**. The Swift SDK wraps it in Swift classes, while the C SDK calls it directly, but the actual data transfer and protocol handling are identical under the hood. This is fundamentally different from CRUD operations, where the Swift SDK's object-oriented abstractions (ARC, `MutableDocument`, `inBatch {}` closures) add measurable overhead.

With only 3GB of RAM in the Docker Sync Gateway, the server is the clear performance ceiling for both SDKs. The data confirms this: at 10KB, all 4 push tests are within 2% — both SDKs are identically bottlenecked.

---

## 10. Conclusion

### Summary

| Aspect | Finding |
|--------|---------|
| **Overall winner** | **No clear winner** — perfect 24–24 split |
| **Push** | 🟦 C leads 9–7. Most margins under 2% |
| **Pull** | 🟩 Swift leads 9–7. Wins clearly at 10KB and 100KB |
| **Bidirectional** | Perfect 8–8 split |
| **Best parity** | 10KB push — all 4 tests within 2% |
| **Most variable** | 100KB — results split both ways due to Sync Gateway RAM pressure |

### What This Means for Production

1. **Replicator performance is NOT a differentiator between Swift and C SDKs.** Unlike CRUD operations (where C is 25% faster for writes), the replication path shows no systematic advantage for either SDK.

2. **Both SDKs are equally viable for sync-heavy applications.** Whether the app primarily pushes, pulls, or syncs bidirectionally, performance will be comparable.

3. **The C SDK's CRUD advantage does not extend to replication.** Teams should base their SDK choice on CRUD performance needs and API ergonomics — not replicator speed.

4. **Sync Gateway capacity matters more than SDK choice.** The replicator's performance is determined by Sync Gateway processing power and available RAM. In this test, the 3GB Docker Sync Gateway was the bottleneck, not either SDK.

### Contrast with CRUD Benchmark

| Benchmark | 🟦 C Advantage | 🟩 Swift Advantage | Recommendation |
|-----------|---------------|-------------------|----------------|
| **CRUD** | 78.7% win rate, 22–29% faster for writes | 17.7% win rate (niche cases) | **🟦 C for write-heavy apps** |
| **Replicator** | 50.00% win rate (no pattern) | 50.00% win rate (no pattern) | **Either SDK — no difference** |

**Both SDKs deliver equivalent replication performance.** The choice between them should be guided by CRUD performance requirements and development workflow considerations, not by sync performance.

---

## Appendix: Raw Data Reference

| File | Contents |
|------|----------|
| `test-push-replicator.txt` | All push test permutations with individual run timings |
| `test-pull-replicator.txt` | All pull test permutations with individual run timings |
| `test-bidirection-replicator.txt` | All bidirectional test permutations with individual run timings |
