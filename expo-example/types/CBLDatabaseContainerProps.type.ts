import { Database } from 'cbl-reactnative';
import React from 'react';

export type CBLDatabaseContainerProps = {
  screenTitle: string;
  handleUpdatePressed: (database: Database) => Promise<string[]>;
  handleResetPressed: () => void;
  children?: React.ReactNode;
};
