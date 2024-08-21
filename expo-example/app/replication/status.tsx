import React, { useContext } from 'react';
import { Replicator } from 'cbl-reactnative';
import CBLReplicatorActionContainer from '@/components/CBLReplicatorActionContainer/CBLReplicatorActionContainer';
import DatabaseContext from '@/providers/DatabaseContext';
import ReplicatorStatusChangeContext from '@/providers/ReplicatorStatusChangeContext';

export default function ReplicatorStatusScreen() {
  const { statusChangeMessages, setStatusChangeMessages } = useContext(
    ReplicatorStatusChangeContext
  )!;
  function reset() {}

  async function update(replicator: Replicator): Promise<string[]> {
    return [''];
  }

  return (
    <CBLReplicatorActionContainer
      handleUpdatePressed={update}
      handleResetPressed={reset}
      screenTitle="Replicator Status"
    />
  );
}
