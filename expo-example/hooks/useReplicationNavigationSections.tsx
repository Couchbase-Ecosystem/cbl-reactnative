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
          title: 'Replicator Documents Status',
          path: '/replication/documentStatus',
        },
        {
          id: 7,
          title: 'Status Changes',
          path: '/replication/status',
        },
      ],
    },
  ];
}
