import React, { useContext, useState } from 'react';
import { Replicator } from 'cbl-reactnative';
import ReplicatorStatusChangeContext from '@/providers/ReplicatorStatusChangeContext';
import ReplicatorStatusTokenContext from '@/providers/ReplicatorStatusTokenContext';
import replicationStatusChange from '@/service/replicator/replicationStatusChange';
import ReplicatorIdActionForm from '@/components/ReplicatorIdActionForm/ReplicatorIdActionForm';
import { useStyleScheme } from '@/components/Themed/Themed';
import { SafeAreaView } from 'react-native';
import ResultListView from '@/components/ResultsListView/ResultsListView';

export default function ReplicatorStatusScreen() {
  const styles = useStyleScheme();
  const { statusChangeMessages, setStatusChangeMessages } = useContext(
    ReplicatorStatusChangeContext
  )!;
  const { statusToken, setStatusToken } = useContext(
    ReplicatorStatusTokenContext
  )!;
  const [informationMessages, setInformationMessages] = useState<string[]>([]);
  const [selectedReplicatorId, setSelectedReplicatorId] = useState<string>('');

  function reset() {}

  async function update(replicator: Replicator): Promise<void> {
    const replId = replicator.getId();
    if (replId !== undefined) {
      const replicatorId = replId.toString();
      setSelectedReplicatorId(replicatorId);
      try {
        const token = statusToken[replicatorId];
        if (token === undefined) {
          setInformationMessages((prev) => [
            ...prev,
            `::Information: Replicator <${replicatorId}> Starting Status Change listener...`,
          ]);
          await replicationStatusChange(
            replicator,
            setStatusChangeMessages,
            setStatusToken
          );
        } else {
          setInformationMessages((prev) => [
            ...prev,
            `::Information: Replicator <${replicatorId}> Status Change already running with token: <${token}>.`,
          ]);
        }
      } catch (error) {
        setInformationMessages((prev) => [
          ...prev,
          // @ts-ignore
          `::ERROR: ${error.message}`,
        ]);
      }
    } else {
      setInformationMessages((prev) => [
        ...prev,
        `::ERROR: ReplicatorId is undefined`,
      ]);
    }
  }
  const filteredStatusChangeMessages =
    statusChangeMessages[selectedReplicatorId] || [];
  const combinedMessages = [
    ...informationMessages,
    ...filteredStatusChangeMessages,
  ];
  return (
    <SafeAreaView style={styles.container}>
      <ReplicatorIdActionForm
        handleUpdatePressed={update}
        handleResetPressed={reset}
        screenTitle="Replicator Status"
      />
      <ResultListView useScrollView={true} messages={combinedMessages} />
    </SafeAreaView>
  );
}
