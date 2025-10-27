export function useTestsNavigationSections() {
  const sections = [
    {
      title: 'Test Runners',
      icon: 'run',
      data: [
        {
          id: 2,
          title: 'Console Logging',
          path: '/tests/console',
        },
        {
          id: 3,
          title: 'Database',
          path: '/tests/database',
        },
        {
          id: 4,
          title: 'Collection',
          path: '/tests/collection',
        },
        {
          id: 5,
          title: 'Documents',
          path: '/tests/documents',
        },
        {
          id: 6,
          title: 'Document Expiration',
          path: '/tests/documentExpiration',
        },
        {
          id: 7,
          title: 'Indexes',
          path: '/tests/indexing',
        },
        {
          id: 8,
          title: 'Query',
          path: '/tests/query',
        },
        {
          id: 9,
          title: 'Replicator',
          path: '/tests/replication',
        },
        {
          id: 10,
          title: 'Testing Tests',
          path: '/tests/testing',
        },
        // {
        //   id: 11,
        //   title: 'Custom Bug Testing',
        //   path: '/tests/custom-bug-fixes',
        // },
        {
          id: 11,
          title: 'Collection Change Listener',
          path: '/tests/collection-change-listener',
        },
        {
          id: 12,
          title: 'Document Change Listener',
          path: '/tests/document-change-listener',
        },
        {
          id: 13,
          title: 'Live Query',
          path: '/tests/live-query-listeners',
        },
        {
          id: 14,
          title: 'Replicator Listeners',
          path: '/tests/replicator-listeners',
        },
      ],
    },
  ];
  return sections;
}
