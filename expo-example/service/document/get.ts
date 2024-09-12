import { Collection, Document } from 'cbl-reactnative';

export default async function get(
  collection: Collection,
  documentId: string
): Promise<Document> {
  return await collection.document(documentId);
}
