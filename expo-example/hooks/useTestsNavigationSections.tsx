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
      ],
    },
  ];
  return sections;
}
