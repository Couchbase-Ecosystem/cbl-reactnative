export type DatabaseScopeCollectionActionFormProps = {
  databaseName: string;
  setDatabaseName: (arg: string) => void;
  scopeName: string;
  setScopeName: (arg: string) => void;
  collectionName: string;
  setCollectionName: (arg: string) => void;
  handleUpdatePressed: () => void;
  style?: object;
};
