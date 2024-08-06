import { Collection, FullTextIndexItem, IndexBuilder } from 'cbl-reactnative';

export default async function createFts(
  collection: Collection,
  indexName: string,
  indexProperties: string,
  ignoreAccents: boolean
): Promise<void> {
  const rawIndexes = indexProperties
    .split(',')
    .map((property) => property.trim());
  if (rawIndexes.length > 0 && indexName.length > 0) {
    //create value index items to be added to the index using
    //IndexBuilder
    let valueIndexes: FullTextIndexItem[] = [];
    for (let i = 0; i < rawIndexes.length; i++) {
      const item = FullTextIndexItem.property(rawIndexes[i].trim());
      valueIndexes.push(item);
    }
    const index = IndexBuilder.fullTextIndex(...valueIndexes);
    index.setIgnoreAccents(ignoreAccents);
    await collection.createIndex(indexName, index);
  } else {
    throw new Error('Index name and properties are required');
  }
}
