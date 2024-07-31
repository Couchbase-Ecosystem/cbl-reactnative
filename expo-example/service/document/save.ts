import { Collection, MutableDocument, Document } from 'cbl-reactnative';

export default async function save(
  collection: Collection,
  documentId: string,
  document: string
): Promise<Document> {
  const doc = new MutableDocument(documentId);
  doc.setData(JSON.parse(document));
  await collection.save(doc);
  return doc;
}
