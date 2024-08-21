import React, { useState, ReactNode, useMemo } from 'react';
import { Database, CblReactNativeEngine, Replicator } from 'cbl-reactnative';
import DatabaseContext from '@/providers/DatabaseContext';
import ReplicatorContext from '@/providers/ReplicatorContext';
import ReplicatorStatusChangeContext from '@/providers/ReplicatorStatusChangeContext';
import ReplicatorDocumentChangeContext from '@/providers/ReplicationDocumentChangeContext';

type DatabaseProviderProps = {
  children: ReactNode;
};

const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [databases, setDatabases] = useState<Record<string, Database>>({});
  const [replicatorIds, setReplicatorIds] = useState<
    Record<string, Replicator>
  >({});
  const [statusChangeMessages, setStatusChangeMessages] = useState<
    Record<string, string[]>
  >({});
  const [documentChangeMessages, setDocumentChangeMessages] = useState<
    Record<string, string[]>
  >({});

  const databasesValue = useMemo(
    () => ({ databases, setDatabases }),
    [databases, setDatabases]
  );
  const replicatorIdsValue = useMemo(
    () => ({ replicatorIds, setReplicatorIds }),
    [replicatorIds, setReplicatorIds]
  );
  const replicatorStatusChangeValue = useMemo(
    () => ({ statusChangeMessages, setStatusChangeMessages }),
    [statusChangeMessages, setStatusChangeMessages]
  );
  const replicatorDocumentChangeValue = useMemo(
    () => ({ documentChangeMessages, setDocumentChangeMessages }),
    [documentChangeMessages, setDocumentChangeMessages]
  );

  const engine = new CblReactNativeEngine();

  return (
    <DatabaseContext.Provider value={databasesValue}>
      <ReplicatorContext.Provider value={replicatorIdsValue}>
        <ReplicatorStatusChangeContext.Provider
          value={replicatorStatusChangeValue}
        >
          <ReplicatorDocumentChangeContext.Provider
            value={replicatorDocumentChangeValue}
          >
            {children}
          </ReplicatorDocumentChangeContext.Provider>
        </ReplicatorStatusChangeContext.Provider>
      </ReplicatorContext.Provider>
    </DatabaseContext.Provider>
  );
};

export default DatabaseProvider;
