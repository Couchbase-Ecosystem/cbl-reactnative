import React from 'react';
import { Database } from 'cbl-reactnative';

export type CBLDatabaseActionContainerProps = {
  screenTitle: string;
  handleUpdatePressed: (database: Database) => Promise<string[]>;
  handleResetPressed: () => void;
  children?: React.ReactNode;
};
