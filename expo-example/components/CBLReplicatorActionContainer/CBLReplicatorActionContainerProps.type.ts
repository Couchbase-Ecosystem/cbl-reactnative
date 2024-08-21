import React from 'react';
import { Replicator } from 'cbl-reactnative';

export type CBLReplicatorActionContainerProps = {
  screenTitle: string;
  handleUpdatePressed: (replicator: Replicator) => Promise<string[]>;
  handleResetPressed: () => void;
  children?: React.ReactNode;
};
