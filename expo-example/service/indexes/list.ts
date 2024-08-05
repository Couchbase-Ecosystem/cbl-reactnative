import { Collection } from 'cbl-reactnative';

export default async function listIndexes(
  collection: Collection
): Promise<string[]> {
  return await collection.indexes();
}
