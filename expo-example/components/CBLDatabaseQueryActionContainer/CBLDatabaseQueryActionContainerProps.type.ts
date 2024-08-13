import { Database } from 'cbl-reactnative';
import React from 'react';

export type CBLDatabaseQueryActionContainerProps = {
  screenTitle: string;
  handleUpdatePressed: (database: Database, query: string) => Promise<string[]>;
  handleExplainedPressed: (
    database: Database,
    query: string
  ) => Promise<string[]>;
  handleResetPressed: () => void;
  children?: React.ReactNode;
};
