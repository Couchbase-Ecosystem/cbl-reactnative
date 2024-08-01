export function useQueryNavigationSections() {
  const sections = [
    {
      title: 'Query API',
      icon: 'magnify',
      data: [
        {
          id: 1,
          title: 'SQL++ Query Editor',
          path: '/query/sqlPlusPlus',
        },
        { id: 2, title: 'Query Parameters', path: '/query/parameters' },
        { id: 3, title: 'Live Query', path: '/query/live' },
      ],
    },
  ];
  return sections;
}
