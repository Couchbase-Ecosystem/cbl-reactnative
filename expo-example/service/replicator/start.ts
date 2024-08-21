import { Replicator } from 'cbl-reactnative';

export default async function start(
  replicator: Replicator,
  reset: boolean
): Promise<void> {
  await replicator.start(reset);
}
