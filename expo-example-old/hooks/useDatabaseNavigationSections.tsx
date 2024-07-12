export function useDatabaseNavigationSections() {
  const sections = [
    {
      title: 'Database API',
      icon: 'database',
      data: [
        { id: 1, title: 'Open Database', path: '/database/open' },
        { id: 2, title: 'Close Database', path: '/database/close' },
        { id: 3, title: 'Copy Database', path: '/database/copy' },
        { id: 4, title: 'Delete Database', path: '/database/delete' },
        {
          id: 5,
          title: 'Change Encryption Key',
          path: '/database/changeEncryption',
        },
        {
          id: 6,
          title: 'Perform Maintenance',
          path: '/database/maintenance',
        },
      ],
    },
    {
      title: 'Logging API',
      icon: 'cellphone-text',
      data: [
        { id: 7, title: 'Console Logging', path: '/database/logging/console' },
        { id: 8, title: 'File Logging', path: '/database/logging/file' },
        {
          id: 9,
          title: 'Custom Logging',
          path: '/database/logging/custom',
        },
      ],
    },
  ];
  return sections;
}
