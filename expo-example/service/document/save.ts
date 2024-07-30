import { Database, MutableDocument } from 'cbl-reactnative';

export default async function save(
  databases: Record<string, Database>,
  databaseName: string,
  scopeName: string,
  collectionName: string,
  documentId: string,
  document: string
) {
  if (databaseName in databases) {
    const database = databases[databaseName];
    const collection = await database.collection(scopeName, collectionName);
    if (database !== null && collection !== null) {
      const doc = new MutableDocument(documentId);
      doc.setData(JSON.parse(document));
      await collection.save(doc);
      return `Document <${documentId}> saved successfully`;
    } else {
      throw new Error(
        `Error: couldn't find database ${databaseName} or collection ${scopeName}.${collectionName}`
      );
    }
  }
}
