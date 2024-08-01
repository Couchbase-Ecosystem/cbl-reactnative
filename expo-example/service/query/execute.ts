import { Database, Parameters, ResultSet } from 'cbl-reactnative';

export default async function execute(
  queryString: string,
  parameters: Parameters | null | undefined,
  database: Database
): Promise<ResultSet> {
  const query = database.createQuery(queryString);
  if (parameters instanceof Parameters) {
    query.addParameter(parameters);
  }
  const resultSet = await query.execute();
  return resultSet;
}
