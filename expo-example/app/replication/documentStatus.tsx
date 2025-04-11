import React, { useContext, useState } from 'react';
import { Replicator } from 'cbl-reactnative';
import ReplicatorDocumentChangeContext from '@/providers/ReplicationDocumentChangeContext';
import ReplicatorStatusTokenContext from '@/providers/ReplicatorStatusTokenContext';
import start from '@/service/replicator/start';
import stop from '@/service/replicator/stop';
import ReplicatorIdActionForm from '@/components/ReplicatorIdActionForm/ReplicatorIdActionForm';
import { useStyleScheme } from '@/components/Themed/Themed';
import { SafeAreaView } from 'react-native';
import ResultListView from '@/components/ResultsListView/ResultsListView';

export default function DocumentReplicationScreen() {
  const styles = useStyleScheme();
  const { documentChangeMessages, setDocumentChangeMessages } = useContext(
    ReplicatorDocumentChangeContext
  )!;
  const { statusToken, setStatusToken } = useContext(
    ReplicatorStatusTokenContext
  )!;
  const [informationMessages, setInformationMessages] = useState<string[]>([]);
  const [selectedReplicatorId, setSelectedReplicatorId] = useState<string>('');
  const [documentTokens, setDocumentTokens] = useState<Record<string, string>>({});

  function reset() {}

  async function update(replicator: Replicator): Promise<void> {
    const replId = replicator.getId();
    if (replId !== undefined) {
      const replicatorId = replId.toString();
      setSelectedReplicatorId(replicatorId);
      try {
        const token = documentTokens[replicatorId];
        if (token === undefined) {
          setInformationMessages((prev) => [
            ...prev,
            `::Information: Replicator <${replicatorId}> Starting Document Change listener...`,
          ]);
          const date = new Date().toISOString();
          const changeToken = await replicator.addDocumentChangeListener((documentReplication) => {
            const docs = documentReplication.documents;
            const direction = documentReplication.isPush ? 'PUSH' : 'PULL';
            
            const newMessages = docs.map(doc => {
              const flags = doc.flags ? doc.flags.join(', ') : 'none';
              const error = doc.error ? `, Error: ${doc.error}` : '';
              return `${date}::Doc:: ${direction} - Scope: ${doc.scopeName}, Collection: ${doc.collectionName}, ID: ${doc.id}, Flags: ${flags}${error}`;
            });
            
            setInformationMessages((prev) => [...prev, ...newMessages]);
          });
          
          setDocumentTokens((prev) => {
            return {
              ...prev,
              [replicatorId]: changeToken,
            };
          });
          
          setInformationMessages((prev) => [
            ...prev,
            `::Information: Replicator <${replicatorId}> Document listener registered, starting replicator...`,
          ]);
          
          await start(replicator, false);
        } else {
          setInformationMessages((prev) => [
            ...prev,
            `::Information: Replicator <${replicatorId}> Document Change already running with token: <${token}>.`,
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
        
        const token = documentTokens[replicatorId];
        if (token) {
          setInformationMessages((prev) => [
            ...prev,
            `::Information: Removing document change listener with token <${token}> from Replicator with replicatorId: <${replicatorId}>.`,
          ]);
        //   await replicator.removeDocumentChangeListener(token);
          
          setDocumentTokens((prev) => {
            const newTokens = { ...prev };
            delete newTokens[replicatorId];
            return newTokens;
          });
          
          setInformationMessages((prev) => [
            ...prev,
            `::Information: Removed document change listener with token <${token}> from Replicator with replicatorId: <${replicatorId}>.`,
          ]);
        }
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

  const filteredDocumentChangeMessages =
    documentChangeMessages[selectedReplicatorId] || [];
  const combinedMessages = [
    ...informationMessages,
    ...filteredDocumentChangeMessages,
  ];
  
  return (
    <SafeAreaView style={styles.container}>
      <ReplicatorIdActionForm
        handleUpdatePressed={update}
        handleResetPressed={reset}
        handleStopPressed={stopReplicator}
        screenTitle="Document Replication"
      />
      <ResultListView useScrollView={true} messages={combinedMessages} />
    </SafeAreaView>
  );
}
