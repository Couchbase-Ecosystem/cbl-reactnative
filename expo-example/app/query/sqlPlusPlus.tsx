import React from 'react';
import { Database } from 'cbl-reactnative';
import execute from '@/service/query/execute';
import explain from '@/service/query/explain';
import CBLDatabaseQueryActionContainer from '@/components/CBLDatabaseQueryActionContainer';

export default function QuerySqlPlusPlusScreen() {
  function reset() {}

  async function runQuery(
    database: Database,
    sqlQuery: string,
    isExplain: boolean
  ): Promise<string[]> {
    try {
      const date = new Date().toISOString();
      const dict: string[] = [];
      if (isExplain) {
        const result = await explain(sqlQuery, null, database);
        dict.push(`${date}::Explain: <<${result}>>`);
        return dict;
      } else {
        const results = await execute(sqlQuery, null, database);
        if (results.length === 0) {
          dict.push(`${date}::INFO: No results`);
        } else {
          for (const result of results) {
            dict.push(`${date}::Data: <<${JSON.stringify(result)}>>`);
          }
        }
        return dict;
      }
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  function updatePressed(
    database: Database,
    sqlQuery: string
  ): Promise<string[]> {
    return runQuery(database, sqlQuery, false);
  }

  function explainPressed(
    database: Database,
    sqlQuery: string
  ): Promise<string[]> {
    return runQuery(database, sqlQuery, true);
  }

  return (
    <CBLDatabaseQueryActionContainer
      screenTitle={'Query Workbench'}
      handleUpdatePressed={updatePressed}
      handleExplainedPressed={explainPressed}
      handleResetPressed={reset}
    />
  );
}
