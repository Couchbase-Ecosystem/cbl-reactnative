import { Replicator } from 'cbl-reactnative';
import React from 'react';

export default async function replicationStatusChange(
  replicator: Replicator,
  setStatusChangeMessage: React.Dispatch<
    React.SetStateAction<Record<string, string[]>>
  >
): Promise<void> {
  const token = await replicator.addChangeListener((change) => {
    setStatusChangeMessage((prev) => {
      const date = new Date().toISOString();
      return {
        ...prev,
        [token]: [
          `${date}::Status:: Replicator <${replicator.getId()}> status changed: ${change.status}`,
        ],
      };
    });
  });
}
