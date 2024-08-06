import { Collection, ValueIndexItem, IndexBuilder } from 'cbl-reactnative';

export default async function create(
  collection: Collection,
  indexName: string,
  indexProperties: string
): Promise<void> {
  const rawIndexes = indexProperties
    .split(',')
    .map((property) => property.trim());
  if (rawIndexes.length > 0 && indexName.length > 0) {
    //create value index items to be added to the index using
    //IndexBuilder
    let valueIndexes: ValueIndexItem[] = [];
    for (let i = 0; i < rawIndexes.length; i++) {
      valueIndexes.push(ValueIndexItem.property(rawIndexes[i].trim()));
    }
    const index = IndexBuilder.valueIndex(...valueIndexes);

    await collection.createIndex(indexName, index);
  } else {
    throw new Error('Index name and properties are required');
  }
}
