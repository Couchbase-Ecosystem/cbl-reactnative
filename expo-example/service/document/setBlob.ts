import { Collection, MutableDocument, Document, Blob } from 'cbl-reactnative';
import { Buffer } from 'buffer';

export default async function setBlob(
  collection: Collection,
  documentId: string,
  key: string,
  blobText: string
): Promise<Document> {
  const bufferText = Buffer.from(blobText, 'base64');
  const blob = new Blob('text/plain', bufferText);
  const doc = await collection.document(documentId);
  const mutableDoc = MutableDocument.fromDocument(doc);
  mutableDoc.setBlob(key, blob);
  await collection.save(mutableDoc);
  return mutableDoc;
}
