import { Collection } from 'cbl-reactnative';

export default async function setExpirationDate(
  collection: Collection,
  documentId: string,
  expirationDate: string
) {
  await collection.setDocumentExpiration(documentId, new Date(expirationDate));
  return;
}
