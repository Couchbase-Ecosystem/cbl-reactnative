import { Collection } from 'cbl-reactnative';

export default async function setExpirationDate(
  collection: Collection,
  documentId: string
): Promise<Date | null> {
  const date = await collection.getDocumentExpiration(documentId);
  return date;
}
