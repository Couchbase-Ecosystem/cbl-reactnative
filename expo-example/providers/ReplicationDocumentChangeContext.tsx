import React from 'react';
import { ReplicatorDocumentChangeContextType } from '@/types/replicatorDocumentChangeContextType.type';

const ReplicatorDocumentChangeContext = React.createContext<
  ReplicatorDocumentChangeContextType | undefined
>(undefined);
export default ReplicatorDocumentChangeContext;
