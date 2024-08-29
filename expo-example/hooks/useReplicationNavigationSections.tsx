export function useReplicationNavigationSections() {
  return [
    {
      title: 'Replicator API',
      icon: 'database-sync',
      data: [
        {
          id: 1,
          title: 'Create Replicator',
          path: '/replication/config',
        },
        {
          id: 2,
          title: 'Replicator Start',
          path: '/replication/start',
        },
        {
          id: 3,
          title: 'Replicator Stop',
          path: '/replication/stop',
        },
        {
          id: 4,
          title: 'Pending Documents',
          path: '/replication/pendingDocs',
        },
        {
          id: 5,
          title: 'Is Documents Pending',
          path: '/replication/isPending',
        },
        {
          id: 6,
          title: 'Replicator Logs',
          path: '/replication/logs',
        },
        {
          id: 7,
          title: 'Status Changes',
          path: '/replication/status',
        },
        {
          id: 8,
          title: 'Document Changes',
          path: '/replication/documentChange',
        },
      ],
    },
  ];
}
