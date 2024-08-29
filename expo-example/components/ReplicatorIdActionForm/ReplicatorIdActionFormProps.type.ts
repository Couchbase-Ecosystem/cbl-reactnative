import { Replicator } from 'cbl-reactnative';

export type ReplicatorIdActionFormProps = {
  screenTitle: string;
  handleUpdatePressed: (replicator: Replicator) => Promise<void>;
  handleResetPressed: () => void;
  handleStopPressed?: (replicator: Replicator) => Promise<void>;
};
