export function useCollectionNavigationSections() {
  return [
    {
      title: 'Scopes API',
      icon: 'file-cabinet',
      data: [
        {
          id: 1,
          title: 'Get Default Scope',
          path: '/collection/scope/default',
        },
        {
          id: 2,
          title: 'Get Scope',
          path: '/collection/scope/get',
        },
        { id: 3, title: 'List Scopes', path: '/collection/scope/list' },
      ],
    },
    {
      title: 'Collections API',
      icon: 'bookshelf',
      data: [
        {
          id: 4,
          title: 'Get Default Collection',
          path: '/collection/default',
        },
        {
          id: 5,
          title: 'Create Collection',
          path: '/collection/create',
        },
        {
          id: 6,
          title: 'Get Collection',
          path: '/collection/get',
        },
        {
          id: 7,
          title: 'Delete Collection',
          path: '/collection/deleteCollection',
        },
        {
          id: 8,
          title: 'List Collections',
          path: '/collection/list',
        },
        {
          id: 9,
          title: 'Listen to Changes in Collection',
          path: '/collection/change',
        },
      ],
    },
    {
      title: 'Index API',
      icon: 'magnify',
      data: [
        { id: 10, title: 'Create Index', path: '/collection/indexing/create' },
        {
          id: 11,
          title: 'Create Full-Text Search Index',
          path: '/collection/indexing/createFts',
        },
        {
          id: 12,
          title: 'Delete Index',
          path: '/collection/indexing/delete',
        },
        {
          id: 13,
          title: 'List Indexes',
          path: '/collection/indexing/list',
        },
      ],
    },
  ];
}
