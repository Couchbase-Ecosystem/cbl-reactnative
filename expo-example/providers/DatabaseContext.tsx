import React from 'react';
import { DatabaseContextType } from '@/types/databaseContext.type';

const DatabaseContext = React.createContext<DatabaseContextType | undefined>(
  undefined
);

export default DatabaseContext;
