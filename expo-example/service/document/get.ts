import { Collection, Document } from 'cbl-reactnative';

export default async function get(
  collection: Collection,
  documentId: string
): Promise<Document> {
  const doc = await collection.document(documentId);
  return doc;
}
