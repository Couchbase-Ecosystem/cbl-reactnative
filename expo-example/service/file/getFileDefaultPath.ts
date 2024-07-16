import { FileSystem } from 'cbl-reactnative';

export default async function getFileDefaultPath() {
  const pd = new FileSystem();
  const result = await pd.getDefaultPath();
  return result;
}
