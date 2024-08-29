import React from 'react';
export type ReplicatorStatusChangeContextType = {
  statusChangeMessages: Record<string, string[]>;
  setStatusChangeMessages: React.Dispatch<
    React.SetStateAction<Record<string, string[]>>
  >;
};
