import { Collection } from 'cbl-reactnative';

export default async function deleteCollection(
  collection: Collection
): Promise<void> {
  const database = collection.database;
  const collectionName = collection.name;
  const scopeName = collection.scope?.name;
  if (
    database !== null &&
    collectionName.length > 0 &&
    scopeName !== null &&
    scopeName.length > 0
  ) {
    await database.deleteCollection(collectionName, scopeName);
  } else {
    throw new Error(
      `Error: couldn't retrieve database, collection name or scope name from provided collection`
    );
  }
}
