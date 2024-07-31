import React from 'react';

export type CBLDatabaseNamePathContainerProps = {
  screenTitle: string;
  handleUpdatePressed: (
    databaseName: string,
    directory: string
  ) => Promise<string[]>;
  handleResetPressed: () => void;
  children?: React.ReactNode;
};
