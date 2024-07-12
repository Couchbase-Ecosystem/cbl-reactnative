import React from 'react';
export type ReplicatorContextType = {
  replicatorIds: Record<string, string>;
  setReplicatorIds: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
};
