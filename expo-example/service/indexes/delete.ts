import { Collection } from 'cbl-reactnative';

export default async function deleteIndex(
  collection: Collection,
  indexName: string
): Promise<void> {
  await collection.deleteIndex(indexName);
}
