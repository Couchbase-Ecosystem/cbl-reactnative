export function useTestsNavigationSections() {
  const sections = [
    {
      title: 'Test Runners',
      icon: 'run',
      data: [
        { id: 2,  title: 'Console Logging', path: '/tests/console' },
        { id: 3,  title: 'Database', path: '/tests/database' },
        { id: 4,  title: 'Collection', path: '/tests/collection' },
        { id: 5,  title: 'Documents', path: '/tests/documents' },
        { id: 6,  title: 'Document Expiration', path: '/tests/documentExpiration' },
        { id: 7,  title: 'Indexes', path: '/tests/indexing' },
        { id: 8,  title: 'Query', path: '/tests/query' },
        { id: 9,  title: 'Replicator', path: '/tests/replication' },
        { id: 10, title: 'Replicator (NEW)', path: '/tests/replication-new' },
        { id: 11, title: 'Listeners', path: '/tests/listener' },
        { id: 12, title: 'Testing Tests', path: '/tests/testing' },
        { id: 13, title: 'Collection Change Listener', path: '/tests/collection-change-listener' },
        { id: 14, title: 'Document Change Listener', path: '/tests/document-change-listener' },
        { id: 15, title: 'Live Query', path: '/tests/live-query-listeners' },
        { id: 16, title: 'Replicator Listeners (NEW API)', path: '/tests/replicator-listeners-new' },
        { id: 17, title: 'Replicator Listeners (OLD API)', path: '/tests/replicator-listeners-old' },
        { id: 18, title: 'Replicator Listeners', path: '/tests/replicator-listeners' },
        { id: 19, title: 'Custom Bug Testing', path: '/tests/custom-bug-fix' },
        { id: 20, title: 'LogSinks API', path: '/tests/logsinks' },
        { id: 21, title: 'Log Sink Console Logs', path: '/tests/console-logging' },
        { id: 22, title: 'File Logging Test', path: '/tests/file-logging' },
        { id: 23, title: 'Custom Logging Test', path: '/tests/custom-logging' },
      ],
    },
  ];
  return sections;
}
