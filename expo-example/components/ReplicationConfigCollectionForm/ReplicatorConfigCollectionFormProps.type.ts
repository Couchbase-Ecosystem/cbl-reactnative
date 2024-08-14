import React from 'react';
import { Database } from 'cbl-reactnative';

export type ReplicatorConfigCollectionFormProps = {
  handleUpdatePressed: (
    database: Database,
    scopeName: string,
    collections: string[]
  ) => Promise<void>;
  handleResetPressed: () => void;
  updateResultMessage: (message: string[]) => void;
};
