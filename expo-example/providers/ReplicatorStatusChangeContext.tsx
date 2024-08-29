import React from 'react';
import { ReplicatorStatusChangeContextType } from '@/types/replicatorStatusChangeContextType.type';

const ReplicatorStatusChangeContext = React.createContext<
  ReplicatorStatusChangeContextType | undefined
>(undefined);
export default ReplicatorStatusChangeContext;
