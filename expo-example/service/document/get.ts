import { Database } from 'cbl-reactnative';

export default async function get(
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
      return doc;
    } else {
      throw new Error(
        `Error: couldn't find database ${databaseName} or collection ${scopeName}.${collectionName}`
      );
    }
  }
}
