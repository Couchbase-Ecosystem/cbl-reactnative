export function useReplicationNavigationSections() {
  const sections = [
    {
      title: 'Replicator API',
      icon: 'database-sync',
      data: [
        {
          id: 1,
          title: 'Create Replicator Config',
          path: '/replication/config',
        },
        {
          id: 2,
          title: 'Replicator Start/Stop',
          path: '/replication/start',
        },
        {
          id: 3,
          title: 'Pending Documents',
          path: '/replication/pendingDocs',
        },
        {
          id: 4,
          title: 'Is Documents Pending',
          path: '/replication/isPending',
        },
        {
          id: 5,
          title: 'Replicator Logs',
          path: '/replication/logs',
        },
        {
          id: 6,
          title: 'Status Changes',
          path: '/replication/status',
        },
        {
          id: 7,
          title: 'Document Changes',
          path: '/replication/documentChange',
        },
      ],
    },
  ];
  return sections;
}
