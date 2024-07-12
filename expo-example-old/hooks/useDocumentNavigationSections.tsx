export function useDocumentNavigationSections() {
  const sections = [
    {
      title: 'Document API',
      icon: 'file-document-multiple-outline',
      data: [
        { id: 1, title: 'Document Editor', path: '/document/edit' },
        { id: 2, title: 'Get Document', path: '/document/get' },
        { id: 3, title: 'Delete Document', path: '/document/delete' },
        {
          id: 4,
          title: 'Set Document Expiration',
          path: '/document/expiration',
        },
        {
          id: 5,
          title: 'Load Sample Documents',
          path: '/document/batch',
        },
        {
          id: 6,
          title: 'Listen to Document Changes',
          path: '/document/change',
        },
      ],
    },
  ];
  return sections;
}
