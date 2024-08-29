import React from 'react';
import { Replicator } from 'cbl-reactnative';
import CBLReplicatorActionContainer from '@/components/CBLReplicatorActionContainer/CBLReplicatorActionContainer';
import stop from '@/service/replicator/stop';

export default function ReplicatorStopScreen() {
  function reset() {}

  async function update(replicator: Replicator): Promise<string[]> {
    try {
      await stop(replicator);
      return ['Replicator stopped.'];
    } catch (e) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <CBLReplicatorActionContainer
      handleUpdatePressed={update}
      handleResetPressed={reset}
      screenTitle="Stop Replicator"
    />
  );
}
