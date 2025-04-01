import React, { useContext, useState } from 'react';
import { Replicator } from 'cbl-reactnative';
import ReplicatorStatusChangeContext from '@/providers/ReplicatorStatusChangeContext';
import ReplicatorStatusTokenContext from '@/providers/ReplicatorStatusTokenContext';
import start from '@/service/replicator/start';
import stop from '@/service/replicator/stop';
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
          const date = new Date().toISOString();
          const changeToken = await replicator.addChangeListener((change) => {
            const newMessage = [
              `${date}::Status:: Replicator <${replicator.getId()}> status changed: ${change.status}`,
            ];
            setInformationMessages((prev) => [...prev, ...newMessage]);
          });
          setStatusToken((prev) => {
            return {
              ...prev,
              [replicatorId]: changeToken,
            };
          });
          setInformationMessages((prev) => [
            ...prev,
            `::Information: Replicator <${replicatorId}> Starting Replicator...`,
          ]);
          await start(replicator, false);
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

  async function stopReplicator(replicator: Replicator): Promise<void> {
    try {
      const replId = replicator.getId();
      if (replId !== undefined) {
        const replicatorId = replId.toString();
        setInformationMessages((prev) => [
          ...prev,
          `::Information: Stopping Replicator with replicatorId: <${replicatorId}>.`,
        ]);
        await stop(replicator);
        setStatusToken((prev) => {
          const newStatusToken = { ...prev };
          delete newStatusToken[replicatorId];
          return newStatusToken;
        });
        setInformationMessages((prev) => [
          ...prev,
          `::Information: Stopped Replicator with replicatorId: <${replicatorId}>.`,
        ]);

        const token = statusToken[replicatorId];
        setInformationMessages((prev) => [
          ...prev,
          `::Information: Removing change listener with token <${token}> from Replicator with replicatorId: <${replicatorId}>.`,
        ]);
        await replicator.removeChangeListener(token);
        setInformationMessages((prev) => [
          ...prev,
          `::Information: Removed change listener with token <${token}> from Replicator with replicatorId: <${replicatorId}>.`,
        ]);
      } else {
        setInformationMessages((prev) => [
          ...prev,
          `::Error: Couldn't get replicatorId from replicator.`,
        ]);
      }
    } catch (error) {
      setInformationMessages((prev) => [
        ...prev,
        // @ts-ignore
        `::ERROR: ${error.message}`,
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
        handleStopPressed={stopReplicator}
        screenTitle="Replicator Status"
      />
      <ResultListView useScrollView={true} messages={combinedMessages} />
    </SafeAreaView>
  );
}
