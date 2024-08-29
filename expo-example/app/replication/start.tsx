import React from 'react';
import { Replicator } from 'cbl-reactnative';
import CBLReplicatorActionContainer from '@/components/CBLReplicatorActionContainer/CBLReplicatorActionContainer';
import start from '@/service/replicator/start';

export default function ReplicatorStartScreen() {
  function reset() {}

  async function update(replicator: Replicator): Promise<string[]> {
    try {
      await start(replicator, false);
      return ['Replicator started.'];
    } catch (e) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLReplicatorActionContainer
      handleUpdatePressed={update}
      handleResetPressed={reset}
      screenTitle="Start Replicator"
    />
  );
}
