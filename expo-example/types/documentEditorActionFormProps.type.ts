export type DocumentEditorActionFormProps = {
  documentId: string;
  setDocumentId: (arg: string) => void;
  document: string;
  setDocument: (arg: string) => void;
  handleUpdatePressed: () => void;
};
