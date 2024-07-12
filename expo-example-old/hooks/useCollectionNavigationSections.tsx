export function useCollectionNavigationSections() {
  const sections = [
    {
      title: 'Collection API',
      icon: 'bookshelf',
      data: [
        {
          id: 1,
          title: 'Get Default Scope',
          path: '/collection/scope/default',
        },
        { id: 2, title: 'List Scopes', path: '/collection/scope/list' },
        {
          id: 3,
          title: 'Get Default Collection',
          path: '/collection/default',
        },
        {
          id: 4,
          title: 'Create Collection',
          path: '/collection/create',
        },
        {
          id: 5,
          title: 'Delete Collection',
          path: '/collection/delete',
        },
        {
          id: 6,
          title: 'List Collection',
          path: '/collection/list',
        },
        {
          id: 7,
          title: 'Listen to Changes in Collection',
          path: '/collection/change',
        },
      ],
    },
    {
      title: 'Index API',
      icon: 'magnify',
      data: [
        { id: 9, title: 'Create Index', path: '/collection/indexing/create' },
        {
          id: 10,
          title: 'Create Full-Text Search Index',
          path: '/collection/indexing/createFts',
        },
        {
          id: 11,
          title: 'Delete Index',
          path: '/collection/indexing/delete',
        },
        {
          id: 12,
          title: 'List Indexes',
          path: '/collection/indexing/list',
        },
      ],
    },
  ];
  return sections;
}
