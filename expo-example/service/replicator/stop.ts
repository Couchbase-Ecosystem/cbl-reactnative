import { Replicator } from 'cbl-reactnative';

export default async function stop(replicator: Replicator): Promise<void> {
  await replicator.stop();
}
