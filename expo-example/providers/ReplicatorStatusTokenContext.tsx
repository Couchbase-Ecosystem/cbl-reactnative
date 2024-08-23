import React from 'react';
import { ReplicatorStatusTokenContextType } from '@/types/replicatorStatusTokenContext.type';

const ReplicatorStatusTokenContext = React.createContext<
  ReplicatorStatusTokenContextType | undefined
>(undefined);
export default ReplicatorStatusTokenContext;
