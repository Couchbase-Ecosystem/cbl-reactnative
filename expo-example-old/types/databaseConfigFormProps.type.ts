export type DatabaseConfigFormProps = {
  setFileLocation: (arg: string) => void;
  fileLocation: string;
  setEncryptionKey: (arg: string) => void;
  encryptionKey: string;
  handleLocationPress: () => void;
  handleUpdatePressed: () => void;
};
