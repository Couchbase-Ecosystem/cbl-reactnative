import { Database, Parameters } from 'cbl-reactnative';

export default async function explain(
  queryString: string,
  parameters: Parameters | null | undefined,
  database: Database
): Promise<string> {
  const query = database.createQuery(queryString);
  if (parameters instanceof Parameters) {
    query.addParameter(parameters);
  }
  const results = await query.explain();
  return results;
}
