import { Collection } from 'cbl-reactnative';
import { Buffer } from 'buffer';

export default async function getBlob(
  collection: Collection,
  documentId: string,
  key: string
): Promise<string> {
  try {
    const doc = await collection.document(documentId);
    const blobText = await doc.getBlobContent(key, collection);
    if (blobText !== undefined && blobText !== null) {
      const buffer = Buffer.from(blobText);
      const text = buffer.toString('utf-8');
      return text;
    }
  } catch (error) {
    // @ts-ignore
    return error.message;
  }
  return 'Error: Blob Content not found';
}
