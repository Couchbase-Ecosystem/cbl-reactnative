import { FileSystem } from 'cbl-reactnative';

export default async function getFileDefaultPath() {
  const pd = new FileSystem();
  return await pd.getDefaultPath();
}
