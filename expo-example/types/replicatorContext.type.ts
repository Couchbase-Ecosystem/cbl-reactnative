import React from 'react';
import { Replicator } from 'cbl-reactnative';
export type ReplicatorContextType = {
  replicatorIds: Record<string, Replicator>;
  setReplicatorIds: React.Dispatch<
    React.SetStateAction<Record<string, Replicator>>
  >;
};
