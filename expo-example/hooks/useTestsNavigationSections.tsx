export function useTestsNavigationSections() {
  const sections = [
    {
      title: 'Test Runners',
      icon: 'run',
      data: [
        {
          id: 1,
          title: 'Console Logging',
          path: '/tests/console',
        },
        {
          id: 2,
          title: 'Database',
          path: '/tests/database',
        },
        {
          id: 3,
          title: 'Collection',
          path: '/tests/collection',
        },
        {
          id: 4,
          title: 'Documents',
          path: '/tests/documents',
        },
        {
          id: 5,
          title: 'Indexes',
          path: '/tests/indexing',
        },
        {
          id: 6,
          title: 'Query',
          path: '/tests/query',
        },
        // {
        //   id: 6,
        //   title: 'Document Expiration',
        //   path: '/tests/documentExpiration',
        // },
        {
          id: 7,
          title: 'Replicator',
          path: '/tests/replication',
        },
        {
          id: 8,
          title: 'Listeners',
          path: '/tests/listener',
        },
        {
          id: 9,
          title: 'Testing Tests',
          path: '/tests/testing',
        },
        {
          id: 10,
          title: 'Collection Change Listener',
          path: '/tests/collection-change-listener',
        },
        {
          id: 11,
          title: 'Document Change Listener',
          path: '/tests/document-change-listener',
        },
        {
          id: 12,
          title: 'Live Query',
          path: '/tests/live-query-listeners',
        },
        {
          id: 13,
          title: 'Replicator Listeners',
          path: '/tests/replicator-listeners',
        },
        {
          id: 14,
          title: 'LogSinks API',
          path: '/tests/logsinks',
        },
        {
          id: 15,
          title: 'Log Sink Console Logs',
          path: '/tests/console-logging',
        },
        {
          id: 16,
          title: 'File Logging Test',
          path: '/tests/file-logging',
        },
        {
          id: 17,
          title: 'Custom Logging Test',
          path: '/tests/custom-logging',
        },
      ],
    },
  ];
  return sections;
}
