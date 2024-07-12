import React from 'react';
import { ReplicatorContextType } from '@/types/replicatorContext.type';

const ReplicatorContext = React.createContext<
  ReplicatorContextType | undefined
>(undefined);
export default ReplicatorContext;
