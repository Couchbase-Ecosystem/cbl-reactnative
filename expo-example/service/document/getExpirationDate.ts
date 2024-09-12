import { Collection } from 'cbl-reactnative';

export default async function setExpirationDate(
  collection: Collection,
  documentId: string
): Promise<Date | null> {
  return await collection.getDocumentExpiration(documentId);
}
