import React from 'react';
export type ReplicatorStatusTokenContextType = {
  statusToken: Record<string, string>;
  setStatusToken: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};
