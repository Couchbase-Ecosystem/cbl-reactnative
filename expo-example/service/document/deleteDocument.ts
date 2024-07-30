import { Database } from 'cbl-reactnative';

export default async function deleteDocument(
  databases: Record<string, Database>,
  databaseName: string,
  scopeName: string,
  collectionName: string,
  documentId: string
) {
  if (databaseName in databases) {
    const database = databases[databaseName];
    const collection = await database.collection(scopeName, collectionName);
    if (database !== null && collection !== null) {
      const doc = await collection.document(documentId);
      await collection.deleteDocument(doc);
      return `Successfully deleted document ${documentId}`;
    } else {
      throw new Error(
        `Error: couldn't find database ${databaseName} or collection ${scopeName}.${collectionName}`
      );
    }
  }
}
