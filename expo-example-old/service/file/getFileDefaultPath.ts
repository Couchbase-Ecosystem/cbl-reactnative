import { CblReactNativeEngine } from 'cbl-reactnative';

export default async function getFileDefaultPath() {
  const engine = new CblReactNativeEngine();
  const result = await engine.file_GetDefaultPath();
  return result.path;
}
