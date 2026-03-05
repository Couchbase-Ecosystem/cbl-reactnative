# Couchbase Lite SDK Replicator Benchmark Report - Capella Cloud

**Couchbase Lite Swift SDK vs Couchbase Lite C SDK -- Replication on iOS (Capella Cloud Backend)**

| Field | Value |
|-------|-------|
| Date | March 2026 |
| Device / OS | iOS Simulator |
| Framework | React Native with Turbo Modules (New Architecture) |
| Swift SDK | CouchbaseLiteSwift framework 3.3 |
| C SDK | libcblite 4.0.0 (C API via Objective-C++ bridge) |
| Backend | **Capella Cloud** -- 3 nodes, 16 GB RAM per node |
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
8. [Comparison with Local Sync Gateway Benchmark](#8-comparison-with-local-sync-gateway-benchmark)
9. [Why Capella Cloud Results Differ from Local](#9-why-capella-cloud-results-differ-from-local)

---

## 1. Executive Summary

### The Bottom Line

**The 🟩 Swift SDK wins 77.1% (37 out of 48) of all test cases by average**, a dramatic shift from the local Sync Gateway benchmark where the result was a perfect 24-24 split.

When comparing only the **best (lowest) run from each SDK's two iterations** (which filters out outlier iterations caused by network variance), **🟩 Swift wins 83.3% (40 out of 48)**.

> All "Avg" results are the **mean (average)** of 2 timed iterations per SDK (alternating execution order). "Best" results use the **minimum (lowest)** time from the 2 iterations per SDK, filtering out variance from network jitter and cloud server load spikes.

### Key Findings

| Finding | Detail |
|---------|--------|
| **🟩 Swift dominates push** | 15 of 17 tests by average. Margins range from 0.7% to 15.4%, stable across all doc sizes and counts |
| **🟩 Swift dominates pull** | 11 of 14 tests by average. Particularly strong at 1K docs (up to 36% advantage at 100KB) |
| **Bidirectional is the most variable** | 🟩 Swift 11 wins, 🟦 C 6 wins by average. Large swings at 100K docs (59-86% margins) due to home WiFi variance |
| **Best-run comparison strengthens Swift's lead** | Several tests where 🟦 C wins by average flip to 🟩 Swift when comparing best runs (e.g., BI 100B x 100K: C +59.4% avg vs Swift +23.5% best) |
| **100K-doc bidirectional results have high variance** | Each 100K BI test takes 10-15+ minutes per iteration, making runs susceptible to network and server load changes |
| **Push is the most consistent operation** | Run-to-run variance is low; averages and best values tell the same story |

### Scorecard

| Category | 🟩 Swift Wins (Avg) | 🟦 C Wins (Avg) | 🟩 Swift Wins (Best) | 🟦 C Wins (Best) |
|----------|---------------------|-----------------|----------------------|------------------|
| Push (17 tests) | 15 (88.2%) | 2 (11.8%) | 16 (94.1%) | 1 (5.9%) |
| Pull (14 tests) | 11 (78.6%) | 3 (21.4%) | 12 (85.7%) | 2 (14.3%) |
| Bidirectional (17 tests) | 11 (64.7%) | 6 (35.3%) | 12 (70.6%) | 5 (29.4%) |
| **Grand Total (48 tests)** | **37 (77.1%)** | **11 (22.9%)** | **40 (83.3%)** | **8 (16.7%)** |

### Comparison with Local Sync Gateway Benchmark

| Metric | Local SG (Docker, 3 GB, localhost) | Capella Cloud (3 nodes, 16 GB, home WiFi) |
|--------|-----------------------------------|-------------------------------------------|
| 🟩 Swift win rate (Avg) | 50.00% (24/48) | **77.1%** (37/48) |
| 🟦 C win rate (Avg) | 50.00% (24/48) | 22.9% (11/48) |
| 🟩 Swift win rate (Best) | -- | **83.3%** (40/48) |
| Dominant factor | Sync Gateway processing (3 GB limit) | Network latency + home WiFi variance |
| Typical variance | Low (localhost, zero network jitter) | High (home WiFi round-trips, cloud load) |

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
| **Push** | Time to push N documents from Simulator to Capella Cloud | Simulator -> Capella |
| **Pull** | Time to pull N documents from Capella Cloud to Simulator | Capella -> Simulator |
| **Bidirectional** | Time to simultaneously push N/2 local docs AND pull N/2 server docs | Simulator <-> Capella |

### Test Matrix

| Size | Doc Counts Tested | Push Tests | Pull Tests | BI Tests | Total |
|------|------------------|------------|------------|----------|-------|
| 100B | 100, 1K, 10K, 100K | 4 | 4 | 4 | 12 |
| 1KB | 100, 1K, 10K, 100K | 4 | 4 | 4 | 12 |
| 10KB | 100, 1K, 10K, 100K | 4 | 3 | 4 | 11 |
| 100KB | 100, 1K, 10K | 3 | 2 | 3 | 8 |
| 1MB | 100, 1K | 2 | 1 | 2 | 5 |
| **Total** | | **17** | **14** | **17** | **48** |

---

## 3. Test Design & Fairness

The benchmark measures **end-to-end replication performance** between an iOS Simulator and Capella Cloud (3-node cluster, 16 GB RAM per node) over home WiFi. Unlike the local benchmark (localhost, zero latency), **network round-trip latency is the dominant variable**.

**Flows (only the replicator wait is timed; document prep and DB open/close are untimed):**

- **Push:** Create fresh DB -> Batch save N docs locally -> `[TIMED]` push replicator -> IDLE -> Close & delete DB
- **Pull:** Pre-populate N docs on server -> Create fresh DB -> `[TIMED]` pull replicator -> IDLE -> Close & delete DB
- **Bidirectional:** Stage N/2 on server -> Save N/2 locally -> `[TIMED]` pushAndPull replicator -> IDLE -> Close & delete DB

**Iteration Protocol:** For each test, Iteration 1 has 🟩 Swift first then 🟦 C; Iteration 2 has 🟦 C first then 🟩 Swift. This alternating order distributes any first-mover advantages from server cache warming.

### Fairness Protocol

| Measure | Implementation |
|---------|---------------|
| Fresh database per run | Eliminates data accumulation and checkpoint history |
| Alternating SDK order | Eliminates first-mover advantage from server cache warming |
| Server cleanup between sizes | Automated purge of documents and collections between suites |
| Identical inputs | Same JSON documents, IDs, collection, and replicator config for both SDKs |

---

## 4. Complete Results: Push Replicator

Each table shows **Avg** (mean of 2 iterations) and **Best** (minimum of 2 iterations) per SDK. All times in **milliseconds (ms)**.

**Legend:**
- 🟩 **Swift** = Swift SDK wins (green) · 🟦 **C** = C SDK wins (blue)
- Winner is always **bold** · Percentage = how much faster the winner is vs the slower SDK
- **(low)** = margin under 3%; difference is within measurement noise
- **Avg Delta** = (Avg Swift - Avg C) / Avg C · **Best Delta** = (Best Swift - Best C) / Best C

### Push: 100 Documents

| Size | Avg Swift (ms) | Avg C (ms) | Avg Delta | Best Swift (ms) | Best C (ms) | Best Delta |
|------|---------------|------------|-----------|----------------|------------|------------|
| 100B | 2,567 | 2,686 | 🟩 **Swift** 4.4% | 2,449 | 2,685 | 🟩 **Swift** 8.8% |
| 1KB | 2,467 | 2,817 | 🟩 **Swift** 12.4% | 2,367 | 2,800 | 🟩 **Swift** 15.5% |
| 10KB | 2,792 | 3,301 | 🟩 **Swift** 15.4% | 2,699 | 3,135 | 🟩 **Swift** 13.9% |
| 100KB | 4,166 | 4,342 | 🟩 **Swift** 4.1% | 3,966 | 4,300 | 🟩 **Swift** 7.8% |
| 1MB | 7,168 | 7,251 | 🟩 **Swift** 1.1% (low) | 7,036 | 7,203 | 🟩 **Swift** 2.3% (low) |

🟩 Swift sweeps all 5 sizes. Margins are moderate (1-15%) and consistent between Avg and Best.

### Push: 1,000 Documents

| Size | Avg Swift (ms) | Avg C (ms) | Avg Delta | Best Swift (ms) | Best C (ms) | Best Delta |
|------|---------------|------------|-----------|----------------|------------|------------|
| 100B | 3,100 | 2,934 | 🟦 **C** 5.7% | 2,783 | 2,919 | 🟩 **Swift** 4.7% |
| 1KB | 2,826 | 3,169 | 🟩 **Swift** 10.8% | 2,818 | 3,019 | 🟩 **Swift** 6.7% |
| 10KB | 3,786 | 4,202 | 🟩 **Swift** 9.9% | 3,719 | 4,086 | 🟩 **Swift** 9.0% |
| 100KB | 12,660 | 12,934 | 🟩 **Swift** 2.1% (low) | 12,402 | 12,767 | 🟩 **Swift** 2.9% (low) |
| 1MB | 34,017 | 37,534 | 🟩 **Swift** 9.4% | 33,917 | 37,435 | 🟩 **Swift** 9.4% |

The only 🟦 C win (100B by avg) flips to 🟩 Swift when comparing best runs. Swift's best iteration (2,783ms) beats C's best (2,919ms) by 4.7%.

### Push: 10,000 Documents

| Size | Avg Swift (ms) | Avg C (ms) | Avg Delta | Best Swift (ms) | Best C (ms) | Best Delta |
|------|---------------|------------|-----------|----------------|------------|------------|
| 100B | 6,442 | 6,585 | 🟩 **Swift** 2.2% (low) | 6,417 | 6,484 | 🟩 **Swift** 1.0% (low) |
| 1KB | 6,501 | 7,110 | 🟩 **Swift** 8.6% | 6,451 | 7,035 | 🟩 **Swift** 8.3% |
| 10KB | 14,143 | 14,400 | 🟩 **Swift** 1.8% (low) | 13,718 | 14,117 | 🟩 **Swift** 2.8% (low) |
| 100KB | 103,717 | 104,476 | 🟩 **Swift** 0.7% (low) | 101,468 | 103,635 | 🟩 **Swift** 2.1% (low) |

🟩 Swift wins all 4 tests. At 100KB x 10K (1 GB total push), both SDKs are within 1%, indicating that raw data transfer dominates.

### Push: 100,000 Documents

| Size | Avg Swift (ms) | Avg C (ms) | Avg Delta | Best Swift (ms) | Best C (ms) | Best Delta |
|------|---------------|------------|-----------|----------------|------------|------------|
| 100B | 42,442 | 42,735 | 🟩 **Swift** 0.7% (low) | 41,383 | 42,652 | 🟩 **Swift** 3.0% |
| 1KB | 41,684 | 43,692 | 🟩 **Swift** 4.6% | 40,600 | 43,135 | 🟩 **Swift** 5.9% |
| 10KB | 118,793 | 116,109 | 🟦 **C** 2.3% (low) | 117,686 | 115,117 | 🟦 **C** 2.2% (low) |

At 100K docs, results tighten. The single 🟦 C win (10KB) is within noise at 2.3%.

### Push Summary

| Metric | 🟩 Swift Wins | 🟦 C Wins |
|--------|--------------|----------|
| By Average | 15 (88.2%) | 2 (11.8%) |
| By Best Run | 16 (94.1%) | 1 (5.9%) |

**Push verdict:** 🟩 Swift is clearly and consistently faster for push replication to Capella Cloud. Most margins are 2-15%, with high consistency between Avg and Best, indicating low variance and a genuine SDK advantage.

---

## 5. Complete Results: Pull Replicator

### Pull: 100 Documents

| Size | Avg Swift (ms) | Avg C (ms) | Avg Delta | Best Swift (ms) | Best C (ms) | Best Delta |
|------|---------------|------------|-----------|----------------|------------|------------|
| 100B | 3,163 | 3,746 | 🟩 **Swift** 15.6% | 3,038 | 3,321 | 🟩 **Swift** 8.5% |
| 1KB | 3,362 | 3,145 | 🟦 **C** 6.9% | 3,336 | 3,004 | 🟦 **C** 11.1% |
| 10KB | 3,527 | 3,850 | 🟩 **Swift** 8.4% | 3,336 | 3,713 | 🟩 **Swift** 10.2% |
| 100KB | 5,223 | 6,750 | 🟩 **Swift** 22.6% | 3,945 | 5,833 | 🟩 **Swift** 32.3% |
| 1MB | 14,676 | 9,225 | 🟦 **C** 59.1% | 10,664 | 8,773 | 🟦 **C** 21.5% |

At 1MB, 🟦 C wins, but the margin drops from 59.1% (avg) to 21.5% (best), indicating Swift's Iter 1 (18,688ms) was an outlier while Iter 2 (10,664ms) was much closer to C's performance.

### Pull: 1,000 Documents

| Size | Avg Swift (ms) | Avg C (ms) | Avg Delta | Best Swift (ms) | Best C (ms) | Best Delta |
|------|---------------|------------|-----------|----------------|------------|------------|
| 100B | 6,498 | 7,082 | 🟩 **Swift** 8.2% | 6,119 | 6,637 | 🟩 **Swift** 7.8% |
| 1KB | 5,544 | 6,681 | 🟩 **Swift** 17.0% | 4,901 | 6,377 | 🟩 **Swift** 23.1% |
| 10KB | 5,214 | 7,069 | 🟩 **Swift** 26.2% | 4,776 | 6,853 | 🟩 **Swift** 30.3% |
| 100KB | 8,244 | 12,884 | 🟩 **Swift** 36.0% | 7,104 | 12,450 | 🟩 **Swift** 42.9% |

🟩 Swift sweeps 1K pull with strong margins (8-36% avg, 8-43% best). The 🟩 Swift advantage grows with document size, from 8% at 100B to 36% at 100KB, suggesting 🟦 C's pull protocol has higher per-round-trip overhead for larger payloads over home WiFi.

### Pull: 10,000 Documents

| Size | Avg Swift (ms) | Avg C (ms) | Avg Delta | Best Swift (ms) | Best C (ms) | Best Delta |
|------|---------------|------------|-----------|----------------|------------|------------|
| 100B | 16,311 | 18,211 | 🟩 **Swift** 10.4% | 16,302 | 17,069 | 🟩 **Swift** 4.5% |
| 1KB | 17,805 | 18,318 | 🟩 **Swift** 2.8% (low) | 17,105 | 17,568 | 🟩 **Swift** 2.6% (low) |
| 10KB | 17,635 | 19,858 | 🟩 **Swift** 11.2% | 17,551 | 19,349 | 🟩 **Swift** 9.3% |

🟩 Swift wins all 3 tests. At 10K documents, the data transfer volume levels the playing field and margins are smaller than at 1K docs.

### Pull: 100,000 Documents

| Size | Avg Swift (ms) | Avg C (ms) | Avg Delta | Best Swift (ms) | Best C (ms) | Best Delta |
|------|---------------|------------|-----------|----------------|------------|------------|
| 100B | 133,010 | 129,074 | 🟦 **C** 3.0% | 128,055 | 128,746 | 🟩 **Swift** 0.5% (low) |
| 1KB | 143,319 | 155,064 | 🟩 **Swift** 7.6% | 127,351 | 150,054 | 🟩 **Swift** 15.1% |

At 100K x 100B, the average shows 🟦 C winning by 3%, but the best-run comparison flips to 🟩 Swift (128,055ms vs 128,746ms), essentially a tie. For 1KB, 🟩 Swift's best-run advantage is stronger (15.1%) than the average (7.6%).

### Pull Summary

| Metric | 🟩 Swift Wins | 🟦 C Wins |
|--------|--------------|----------|
| By Average | 11 (78.6%) | 3 (21.4%) |
| By Best Run | 12 (85.7%) | 2 (14.3%) |

**Pull verdict:** 🟩 Swift is consistently faster. The 🟦 C wins are limited to 1KB x 100 docs (moderate margin) and 1MB x 100 docs (high variance; the 59% avg margin drops to 21% by best). The 1K-doc pull suite is the strongest showing for Swift (8-43% margins).

---

## 6. Complete Results: Bidirectional Replicator

> Bidirectional tests push N/2 local documents to the server while simultaneously pulling N/2 server documents to the Simulator. This is the most complex replication operation, involving protocol negotiation for both directions over the same home WiFi connection.

### Bidirectional: 100 Documents

| Size | Avg Swift (ms) | Avg C (ms) | Avg Delta | Best Swift (ms) | Best C (ms) | Best Delta |
|------|---------------|------------|-----------|----------------|------------|------------|
| 100B | 4,082 | 4,546 | 🟩 **Swift** 10.2% | 3,700 | 4,145 | 🟩 **Swift** 10.7% |
| 1KB | 4,002 | 5,313 | 🟩 **Swift** 24.7% | 3,647 | 5,238 | 🟩 **Swift** 30.4% |
| 10KB | 4,188 | 4,973 | 🟩 **Swift** 15.8% | 4,053 | 4,603 | 🟩 **Swift** 11.9% |
| 100KB | 7,490 | 6,730 | 🟦 **C** 11.3% | 7,416 | 6,482 | 🟦 **C** 14.4% |
| 1MB | 10,416 | 15,527 | 🟩 **Swift** 32.9% | 10,345 | 12,386 | 🟩 **Swift** 16.5% |

🟩 Swift wins 4 of 5. At 1MB, the avg margin (32.9%) is much larger than the best margin (16.5%) because 🟦 C's Iter 2 had a spike (18,669ms vs Iter 1's 12,386ms).

### Bidirectional: 1,000 Documents

| Size | Avg Swift (ms) | Avg C (ms) | Avg Delta | Best Swift (ms) | Best C (ms) | Best Delta |
|------|---------------|------------|-----------|----------------|------------|------------|
| 100B | 18,046 | 11,156 | 🟦 **C** 61.8% | 16,614 | 10,382 | 🟦 **C** 60.0% |
| 1KB | 11,351 | 13,429 | 🟩 **Swift** 15.5% | 7,658 | 10,322 | 🟩 **Swift** 25.8% |
| 10KB | 5,057 | 11,874 | 🟩 **Swift** 57.4% | 3,439 | 5,074 | 🟩 **Swift** 32.2% |
| 100KB | 14,703 | 14,740 | 🟩 **Swift** 0.3% (low) | 14,601 | 14,300 | 🟦 **C** 2.1% (low) |
| 1MB | 272,388 | 228,035 | 🟦 **C** 19.5% | 268,886 | 202,103 | 🟦 **C** 33.0% |

This suite shows the highest variance in the entire benchmark. At 100B, Swift's two iterations (19,478ms and 16,614ms) are both much slower than C's (11,929ms and 10,382ms), a genuine gap. At 10KB, the opposite is true: 🟩 Swift is dramatically faster. At 100KB, it is a dead heat by both metrics.

### Bidirectional: 10,000 Documents

| Size | Avg Swift (ms) | Avg C (ms) | Avg Delta | Best Swift (ms) | Best C (ms) | Best Delta |
|------|---------------|------------|-----------|----------------|------------|------------|
| 100B | 129,921 | 132,309 | 🟩 **Swift** 1.8% (low) | 128,792 | 130,784 | 🟩 **Swift** 1.5% (low) |
| 1KB | 78,461 | 94,134 | 🟩 **Swift** 16.6% | 26,426 | 56,288 | 🟩 **Swift** 53.1% |
| 10KB | 31,453 | 119,495 | 🟩 **Swift** 73.7% | 28,794 | 118,746 | 🟩 **Swift** 75.7% |
| 100KB | 123,575 | 99,486 | 🟦 **C** 24.2% | 95,404 | 96,969 | 🟩 **Swift** 1.6% (low) |

At 10KB x 10K, 🟩 Swift is 3-4x faster than 🟦 C consistently across both iterations. This is the largest sustained margin in the entire benchmark.

At 100KB, the avg shows 🟦 C winning by 24.2%, but the best-run comparison flips to 🟩 Swift (95,404ms vs 96,969ms), a near-tie. Swift's Iter 1 (151,746ms) was an outlier that inflated the average.

### Bidirectional: 100,000 Documents

| Size | Avg Swift (ms) | Avg C (ms) | Avg Delta | Best Swift (ms) | Best C (ms) | Best Delta |
|------|---------------|------------|-----------|----------------|------------|------------|
| 100B | 599,152 | 375,822 | 🟦 **C** 59.4% | 257,073 | 336,038 | 🟩 **Swift** 23.5% |
| 1KB | 241,591 | 129,708 | 🟦 **C** 86.3% | 166,636 | 118,866 | 🟦 **C** 40.2% |
| 10KB | 123,023 | 482,588 | 🟩 **Swift** 74.5% | 110,082 | 314,979 | 🟩 **Swift** 65.1% |

> **Note on 100K-doc bidirectional results:** There is a lot of variance at this scale. Each individual iteration takes between 2 and 16 minutes (100B Swift Iter 1 alone took ~15.7 minutes, while Iter 2 took ~4.3 minutes for the same test). The variance could be due to server-side load balancing across the 3 Capella nodes or due to network conditions changing over home WiFi during the extended test duration. Because each full 100K bidirectional suite takes over an hour to complete, the chances of hitting different network or server conditions across iterations are high. The best-run comparison is a more reliable indicator for this count. At 100B, the average shows 🟦 C winning by 59.4%, but the best-run comparison completely flips: 🟩 Swift wins by 23.5%, with Swift's best (257s) being faster than C's best (336s).

### Bidirectional Summary

| Metric | 🟩 Swift Wins | 🟦 C Wins |
|--------|--------------|----------|
| By Average | 11 (64.7%) | 6 (35.3%) |
| By Best Run | 12 (70.6%) | 5 (29.4%) |

**Bidirectional verdict:** 🟩 Swift leads, but this is the most variable operation. At small-to-medium doc counts (100-10K), Swift is consistently ahead. At 100K docs, the extended test duration over home WiFi introduces substantial variance, making the best-run comparison more informative than averages.

---

## 7. Overall Scorecard

### By Operation Type

| Operation | 🟩 Swift (Avg) | 🟦 C (Avg) | 🟩 Swift (Best) | 🟦 C (Best) |
|-----------|----------------|------------|-----------------|-------------|
| Push (17 tests) | 15 (88.2%) | 2 (11.8%) | 16 (94.1%) | 1 (5.9%) |
| Pull (14 tests) | 11 (78.6%) | 3 (21.4%) | 12 (85.7%) | 2 (14.3%) |
| Bidirectional (17 tests) | 11 (64.7%) | 6 (35.3%) | 12 (70.6%) | 5 (29.4%) |
| **Total (48 tests)** | **37 (77.1%)** | **11 (22.9%)** | **40 (83.3%)** | **8 (16.7%)** |

### By Document Size

| Size | Tests | 🟩 Swift (Avg) | 🟦 C (Avg) | 🟩 Swift (Best) | 🟦 C (Best) |
|------|-------|----------------|------------|-----------------|-------------|
| 100B | 12 | 8 (66.7%) | 4 (33.3%) | 10 (83.3%) | 2 (16.7%) |
| 1KB | 12 | 10 (83.3%) | 2 (16.7%) | 10 (83.3%) | 2 (16.7%) |
| 10KB | 11 | 10 (90.9%) | 1 (9.1%) | 10 (90.9%) | 1 (9.1%) |
| 100KB | 8 | 6 (75.0%) | 2 (25.0%) | 6 (75.0%) | 2 (25.0%) |
| 1MB | 5 | 3 (60.0%) | 2 (40.0%) | 4 (80.0%) | 1 (20.0%) |
| **Total** | **48** | **37 (77.1%)** | **11 (22.9%)** | **40 (83.3%)** | **8 (16.7%)** |

### By Document Count

| Count | Tests | 🟩 Swift (Avg) | 🟦 C (Avg) | 🟩 Swift (Best) | 🟦 C (Best) |
|-------|-------|----------------|------------|-----------------|-------------|
| 100 | 15 | 12 (80.0%) | 3 (20.0%) | 12 (80.0%) | 3 (20.0%) |
| 1,000 | 14 | 11 (78.6%) | 3 (21.4%) | 11 (78.6%) | 3 (21.4%) |
| 10,000 | 11 | 10 (90.9%) | 1 (9.1%) | 11 (100.0%) | 0 (0.0%) |
| 100,000 | 8 | 4 (50.0%) | 4 (50.0%) | 6 (75.0%) | 2 (25.0%) |
| **Total** | **48** | **37 (77.1%)** | **11 (22.9%)** | **40 (83.3%)** | **8 (16.7%)** |

**Key patterns:**
- **10KB is Swift's strongest size**: 90.9% win rate by both Avg and Best.
- **10K docs is Swift's strongest count**: 90.9% by Avg, 100% by Best. Every single test at 10K docs has Swift's best run outperforming C's best.
- **100K docs is the most even**: 50-50 by average, 75-25 by best. Home WiFi variance at high doc counts introduces randomness that masks the underlying SDK difference.

---

## 8. Comparison with Local Sync Gateway Benchmark

### Side-by-Side: Push (Selected Tests)

| Test | Local Swift (ms) | Local C (ms) | Local Winner | Capella Swift (ms) | Capella C (ms) | Capella Winner | Slowdown Factor |
|------|-----------------|-------------|-------------|-------------------|---------------|---------------|----------------|
| Push 100B x 100 | 536 | 541 | 🟩 Swift 0.8% | 2,567 | 2,686 | 🟩 Swift 4.4% | ~4.8x |
| Push 100B x 10K | 2,589 | 2,584 | 🟦 C 0.2% | 6,442 | 6,585 | 🟩 Swift 2.2% | ~2.5x |
| Push 100B x 100K | 22,062 | 20,810 | 🟦 C 5.7% | 42,442 | 42,735 | 🟩 Swift 0.7% | ~1.9x |
| Push 10KB x 100 | 535 | 545 | 🟩 Swift 1.9% | 2,792 | 3,301 | 🟩 Swift 15.4% | ~5.2x |
| Push 10KB x 10K | 4,633 | 4,635 | 🟩 Swift 0.05% | 14,143 | 14,400 | 🟩 Swift 1.8% | ~3.1x |
| Push 1MB x 100 | 1,570 | 1,575 | 🟩 Swift 0.3% | 7,168 | 7,251 | 🟩 Swift 1.1% | ~4.6x |

### Side-by-Side: Pull (Selected Tests)

| Test | Local Swift (ms) | Local C (ms) | Local Winner | Capella Swift (ms) | Capella C (ms) | Capella Winner | Slowdown Factor |
|------|-----------------|-------------|-------------|-------------------|---------------|---------------|----------------|
| Pull 100B x 100 | 2,093 | 1,833 | 🟦 C 12.4% | 3,163 | 3,746 | 🟩 Swift 15.6% | ~1.5x |
| Pull 100B x 10K | 2,599 | 2,590 | 🟦 C 0.4% | 16,311 | 18,211 | 🟩 Swift 10.4% | ~6.3x |
| Pull 10KB x 100 | 1,038 | 1,051 | 🟩 Swift 1.2% | 3,527 | 3,850 | 🟩 Swift 8.4% | ~3.4x |
| Pull 100KB x 1K | 1,317 | 1,575 | 🟩 Swift 16.4% | 8,244 | 12,884 | 🟩 Swift 36.0% | ~6.3x |

### Side-by-Side: Bidirectional (Selected Tests)

| Test | Local Swift (ms) | Local C (ms) | Local Winner | Capella Swift (ms) | Capella C (ms) | Capella Winner | Slowdown Factor |
|------|-----------------|-------------|-------------|-------------------|---------------|---------------|----------------|
| BI 100B x 100 | 305 | 306 | 🟩 Swift 0.3% | 4,082 | 4,546 | 🟩 Swift 10.2% | ~13x |
| BI 100B x 10K | 1,606 | 1,613 | 🟩 Swift 0.4% | 129,921 | 132,309 | 🟩 Swift 1.8% | ~81x |
| BI 10KB x 100 | 309 | 312 | 🟩 Swift 1.0% | 4,188 | 4,973 | 🟩 Swift 15.8% | ~14x |
| BI 10KB x 1K | 541 | 552 | 🟩 Swift 2.1% | 5,057 | 11,874 | 🟩 Swift 57.4% | ~9x |

**Key observation:** The "Slowdown Factor" (Capella time / Local time) ranges from **1.5x to 81x**, with bidirectional at high doc counts showing the largest slowdowns. This is not a linear overhead; it reflects the compounding effect of home WiFi latency across thousands of protocol round-trips.

---

## 9. Why Capella Cloud Results Differ from Local

The local Sync Gateway benchmark (Docker, 3 GB RAM, localhost) produced a perfect 24-24 tie. The Capella Cloud benchmark (3 nodes, 16 GB RAM/node, home WiFi) shows 🟩 Swift winning 77% by average and 83% by best. Three factors explain this.

**1. Home WiFi latency amplifies protocol differences.** On localhost, every round-trip costs effectively 0ms. Over home WiFi, each round-trip adds real latency. The replication protocol involves multiple round-trips per batch (connection setup, authentication, checkpoint negotiation, document transfer, finalization). If the Swift SDK makes even slightly fewer round-trips or pipelines more efficiently, that advantage compounds across thousands of documents. On localhost saving one round-trip saves 0ms; over home WiFi it saves measurable milliseconds, which multiplies into seconds at 10K-100K documents.

**2. Home WiFi variance inflates some averages.** On localhost, both iterations produce nearly identical results. Over home WiFi, a single iteration can differ by 2-4x from the other for the same SDK (e.g., BI 100B x 100K Swift: Iter 1 = 941s, Iter 2 = 257s). This comes from routing fluctuations, cloud-side load balancing across 3 nodes, TLS session state, and server-side compaction cycles. When an outlier iteration inflates the average, it can make one SDK look much worse than it actually is. The best-run comparison filters this out, which is why it shows a cleaner and more consistent picture of the true difference.

**3. Server capacity removes the bottleneck that produced the local tie.** With only 3 GB RAM in Docker, Sync Gateway was the bottleneck and constrained both SDKs equally, producing the 24-24 tie. Capella Cloud with 16 GB x 3 nodes has far more headroom, so the server is no longer the ceiling. This allows SDK-level and protocol-level differences to surface that were previously masked. In short: on localhost both SDKs were limited by the same server; on Capella they are not, so real differences appear.

**Why the best runs are closer together.** When both SDKs hit a clean network window with low latency and no server-side load spikes, their times converge. The underlying replicator engines are fundamentally the same (both use the Couchbase replication protocol). The best-run values show each SDK near its theoretical optimum, while averages include unlucky iterations that distort the comparison.

---

## Appendix: Raw Iteration Data

The complete raw test data with individual iteration timings is available in `capella-test.txt`. The CSV format for each test is:

```
Size, Iter1-Swift(ms), Iter1-C(ms), Iter2-Swift(ms), Iter2-C(ms), Avg-Swift(ms), Avg-C(ms), Delta%
```

Where Delta% = (Avg Swift - Avg C) / Avg C x 100. Negative values indicate Swift is faster.
