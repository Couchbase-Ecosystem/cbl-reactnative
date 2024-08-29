import React from 'react';
import { Replicator } from 'cbl-reactnative';

export default async function replicationStatusChange(
  replicator: Replicator,
  setStatusChangeMessage: React.Dispatch<
    React.SetStateAction<Record<string, string[]>>
  >,
  setStatusToken: React.Dispatch<React.SetStateAction<Record<string, string>>>
): Promise<void> {
  const replicatorIdUuid = replicator.getId();
  if (replicatorIdUuid !== undefined) {
    const replicatorId = replicatorIdUuid.toString();
    const token = await replicator.addChangeListener((change) => {
      const date = new Date().toISOString();
      const newMessages = [
        `${date}::Status:: Replicator <${replicator.getId()}> status changed: ${change.status}`,
      ];
      setStatusChangeMessage((prev) => {
        return {
          ...prev,
          [replicatorId]: [...(prev[replicatorId] || []), ...newMessages],
        };
      });
    });
    setStatusToken((prev) => {
      return {
        ...prev,
        [replicatorId]: token,
      };
    });
  } else {
    throw new Error("REPLICATOR:: Replicator doesn't have an id");
  }
}
