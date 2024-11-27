export function useDocumentNavigationSections() {
  return [
    {
      title: 'Document API',
      icon: 'file-document-multiple-outline',
      data: [
        { id: 1, title: 'Document Editor', path: '/document/edit' },
        { id: 2, title: 'Get Document', path: '/document/get' },
        { id: 3, title: 'Delete Document', path: '/document/delete' },
        {
          id: 4,
          title: 'Get Document Expiration',
          path: '/document/getExpiration',
        },
        {
          id: 5,
          title: 'Set Document Expiration',
          path: '/document/expiration',
        },
        {
          id: 7,
          title: 'Set Blob',
          path: '/document/blob/setBlob',
        },
        {
          id: 8,
          title: 'Get Blob',
          path: '/document/blob/getBlob',
        },
      ],
    },
  ];
}
