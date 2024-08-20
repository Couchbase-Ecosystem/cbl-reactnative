import React, { useState, ReactNode, useMemo } from 'react';
import { Database, CblReactNativeEngine, Replicator } from 'cbl-reactnative';
import DatabaseContext from '@/providers/DatabaseContext';
import ReplicatorContext from '@/providers/ReplicatorContext';

type DatabaseProviderProps = {
  children: ReactNode;
};

const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [databases, setDatabases] = useState<Record<string, Database>>({});
  const [replicatorIds, setReplicatorIds] = useState<
    Record<string, Replicator>
  >({});

  const databasesValue = useMemo(
    () => ({ databases, setDatabases }),
    [databases, setDatabases]
  );
  const replicatorIdsValue = useMemo(
    () => ({ replicatorIds, setReplicatorIds }),
    [replicatorIds, setReplicatorIds]
  );

  const engine = new CblReactNativeEngine();

  return (
    <DatabaseContext.Provider value={databasesValue}>
      <ReplicatorContext.Provider value={replicatorIdsValue}>
        {children}
      </ReplicatorContext.Provider>
    </DatabaseContext.Provider>
  );
};

export default DatabaseProvider;
