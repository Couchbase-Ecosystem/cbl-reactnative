/**
 * Memory Tracking Utilities
 * 
 * Provides cross-platform memory measurement for performance testing
 */

export interface MemorySnapshot {
  timestamp: number;
  jsHeap?: {
    used: number;
    total: number;
    limit: number;
  };
  native?: {
    used: number;
    total: number;
    max: number;
  };
}

/**
 * Get current JavaScript heap memory usage (if available)
 * Only available in Chrome-based debuggers
 */
export function getJSMemory(): MemorySnapshot['jsHeap'] | null {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const mem = (performance as any).memory;
    return {
      used: mem.usedJSHeapSize,
      total: mem.totalJSHeapSize,
      limit: mem.jsHeapSizeLimit,
    };
  }
  return null;
}

/**
 * Get native memory usage via native module
 */
export async function getNativeMemory(nativeModule: any): Promise<MemorySnapshot['native'] | null> {
  try {
    if (nativeModule && typeof nativeModule.debug_GetMemoryUsage === 'function') {
      const mem = await nativeModule.debug_GetMemoryUsage();
      return {
        used: mem.usedMemory || 0,
        total: mem.totalMemory || 0,
        max: mem.maxMemory || 0,
      };
    }
  } catch (e) {
    console.log('Native memory tracking error:', e);
  }
  return null;
}

/**
 * Create a complete memory snapshot
 */
export async function captureMemorySnapshot(nativeModule?: any): Promise<MemorySnapshot> {
  const snapshot: MemorySnapshot = {
    timestamp: Date.now(),
  };

  snapshot.jsHeap = getJSMemory() || undefined;
  
  if (nativeModule) {
    snapshot.native = (await getNativeMemory(nativeModule)) || undefined;
  }

  return snapshot;
}

/**
 * Get the best available memory value from a snapshot
 * Prefers JS heap, falls back to native
 */
export function getBestMemoryValue(snapshot: MemorySnapshot): number | null {
  if (snapshot.jsHeap?.used) {
    return snapshot.jsHeap.used;
  }
  if (snapshot.native?.used) {
    return snapshot.native.used;
  }
  return null;
}

/**
 * Format a memory snapshot for display
 */
export function formatMemorySnapshot(snapshot: MemorySnapshot): string {
  const parts: string[] = [];
  
  if (snapshot.jsHeap?.used) {
    parts.push(`JS: ${formatBytes(snapshot.jsHeap.used)}`);
  }
  if (snapshot.native?.used) {
    parts.push(`Native: ${formatBytes(snapshot.native.used)}`);
  }
  
  return parts.length > 0 ? parts.join(' | ') : 'N/A';
}

/**
 * Format memory size in human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Calculate memory difference between two snapshots
 */
export function calculateMemoryDelta(
  before: MemorySnapshot,
  after: MemorySnapshot
): {
  jsHeapDelta?: number;
  nativeDelta?: number;
  totalDelta?: number;
} {
  const delta: {
    jsHeapDelta?: number;
    nativeDelta?: number;
    totalDelta?: number;
  } = {};

  if (before.jsHeap && after.jsHeap) {
    delta.jsHeapDelta = after.jsHeap.used - before.jsHeap.used;
  }

  if (before.native && after.native) {
    delta.nativeDelta = after.native.used - before.native.used;
  }

  if (delta.jsHeapDelta !== undefined && delta.nativeDelta !== undefined) {
    delta.totalDelta = delta.jsHeapDelta + delta.nativeDelta;
  } else if (delta.jsHeapDelta !== undefined) {
    delta.totalDelta = delta.jsHeapDelta;
  } else if (delta.nativeDelta !== undefined) {
    delta.totalDelta = delta.nativeDelta;
  }

  return delta;
}

/**
 * Force garbage collection if available (dev mode only)
 */
export function forceGarbageCollection(): boolean {
  if (typeof global !== 'undefined' && typeof (global as any).gc === 'function') {
    try {
      (global as any).gc();
      return true;
    } catch (e) {
      // GC not available
    }
  }
  return false;
}

/**
 * Wait for a specified duration (for memory stabilization)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
