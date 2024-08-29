import React from 'react';
import { Replicator } from 'cbl-reactnative';
import CBLReplicatorActionContainer from '@/components/CBLReplicatorActionContainer/CBLReplicatorActionContainer';

export default function ReplicatorPendingDocsScreen() {
  function reset() {}

  async function update(replicator: Replicator): Promise<string[]> {
    return [''];
  }

  return (
    <CBLReplicatorActionContainer
      handleUpdatePressed={update}
      handleResetPressed={reset}
      screenTitle="Pending Documents"
    />
  );
}
