import { Collection } from 'cbl-reactnative';

export default async function deleteDocument(
  collection: Collection,
  documentId: string
) {
  const doc = await collection.document(documentId);
  await collection.deleteDocument(doc);
  return;
}
