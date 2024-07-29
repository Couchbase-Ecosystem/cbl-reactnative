export function useDatabaseNavigationSections() {
  const sections = [
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
    {
      title: 'Logging API',
      icon: 'cellphone-text',
      data: [
        {
          id: 10,
          title: 'Set Console',
          path: '/database/logging/console',
        },
        { id: 11, title: 'Set File', path: '/database/logging/file' },
      ],
    },
  ];
  return sections;
}
