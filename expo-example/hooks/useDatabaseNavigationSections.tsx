export function useDatabaseNavigationSections() {
  return [
    {
      title: 'Turbo V2: Production Codegen (Phase 2)',
      icon: 'rocket-launch',
      data: [
        {
          id: 200,
          title: '🚀 Turbo V2 Benchmark',
          path: '/database/turbo-v2-benchmark'
        },
        {
          id: 201,
          title: '🔄 Replicator Benchmark',
          path: '/database/replicator-benchmark'
        },
        {
          id: 205,
          title: '🎛️ Manual Replicator Benchmark',
          path: '/database/manual-replicator-benchmark'
        },
        {
          id: 206,
          title: '🤖 Semi-Auto Replicator Benchmark',
          path: '/database/semi-auto-replicator-benchmark'
        },
        {
          id: 204,
          title: '🧪 Local Replicator Test',
          path: '/database/local-replicator-test'
        },
        {
          id: 202,
          title: '📊 Comprehensive Benchmark',
          path: '/database/comprehensive-benchmark'
        },
        {
          id: 203,
          title: '🔍 Query Scaling Benchmark',
          path: '/database/query-scaling-benchmark'
        },
      ],
    },
    {
      title: 'Turbo Module Test (Phase 1)',
      icon: 'flask',
      data: [
        {
          id: 200,
          title: '🩺 Crash Diagnostic',
          path: '/database/crash-diagnostic'
        },
        {
          id: 0,
          title: '⚡ Turbo Test', 
          path: '/database/turbo-test' 
        },
        {
          id: 1,
          title: '⚡ Performance: Collection Read/Write',
          path: '/database/performance-test'
        },
        {
          id: 2,
          title: '🔬 Bridge Overhead Test',
          path: '/database/bridge-overhead-test'
        },
        {
          id: 3,
          title: '📊 Metadata Performance Test',
          path: '/database/metadata-performance-test'
        },
        {
          id: 4,
          title: '⚙️  Async Queue Overhead Test',
          path: '/database/async-queue-test'
        },
        {
          id: 5,
          title: '🧪 Memory Performance Test',
          path: '/database/memory-performance-test'
        },
        {
          id: 6,
          title: '🚀 Sync vs Async Test',
          path: '/database/sync-vs-async-test'
        },
      ],
    },
    {
      title: 'C Library Benchmarks (SDK vs libcblite)',
      icon: 'speedometer',
      data: [
        {
          id: 100,
          title: '⚡ C Library Performance Test',
          path: '/database/c-library-performance-test'
        },
        // {
        //   id: 101,
        //   title: '🧪 C Library Memory Test',
        //   path: '/database/c-library-memory-test'
        // },
        {
          id: 102,
          title: '🚀 C Library Sync Test',
          path: '/database/c-library-sync-test'
        },
        {
          id: 103,
          title: '📊 Sync vs Async Comparison',
          path: '/database/sync-async-comparison-test'
        },
        {
          id: 104,
          title: '🎯 Minimal Comparison (C vs Swift)',
          path: '/database/minimal-comparison-test'
        },
      ],
    },
    {
      title: 'Database API',
      icon: 'database',
      data: [
        { id: 1, title: 'Open', path: '/database/open' },
        { id: 2, title: 'Close', path: '/database/close' },
        { id: 3, title: 'Copy', path: '/database/copy' },
        { id: 4, title: 'Delete', path: '/database/delete' },
        {
          id: 5,
          title: 'Delete by Path',
          path: '/database/deletePath',
        },
        { id: 6, title: 'Get Path', path: '/database/path' },
        { id: 7, title: 'Does Exists', path: '/database/exists' },
        {
          id: 8,
          title: 'Change Encryption Key',
          path: '/database/changeEncryption',
        },
        {
          id: 9,
          title: 'Perform Maintenance',
          path: '/database/maintenance',
        },
      ],
    },
    // {
    //   title: 'Logging API',
    //   icon: 'cellphone-text',
    //   data: [
    //     {
    //       id: 10,
    //       title: 'Set Console',
    //       path: '/database/logging/console',
    //     },
    //     { id: 11, title: 'Set File', path: '/database/logging/file' },
    //   ],
    // },
    {
      title: 'LogSinks API',
      icon: 'alpha-l-box',
      data: [
        {
          id: 12,
          title: 'Console LogSink',
          path: '/logsinks/console',
        },
        { 
          id: 13, 
          title: 'File LogSink', 
          path: '/logsinks/file' 
        },
        { 
          id: 14, 
          title: 'Custom LogSink', 
          path: '/logsinks/custom' 
        },
      ],
    },
  ];
}
