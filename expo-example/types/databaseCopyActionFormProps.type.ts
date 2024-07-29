export type DatabaseCopyActionFormProps = {
  newDatabaseName: string;
  setNewDatabaseName: (arg: string) => void;
  setFileLocation: (arg: string) => void;
  fileLocation: string;
  setEncryptionKey: (arg: string) => void;
  encryptionKey: string;
  handleLocationPress: () => void;
  handleUpdatePressed: () => void;
};
