import React, { useContext, useState } from 'react';
import { Database } from 'cbl-reactnative';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { useStyleScheme } from '@/components/Themed/Themed';
import ReplicatorConfigGeneralForm from '@/components/ReplicationConfigGeneralForm/ReplicatorConfigGeneralForm';
import ReplicatorAuthenticationForm from '@/components/ReplicatorAuthenticationForm/ReplicatorAuthenticationForm';
import ReplicatorConfigCollectionForm from '@/components/ReplicationConfigCollectionForm/ReplicatorConfigCollectionForm';
import ResultListView from '@/components/ResultsListView/ResultsListView';
import ReplicatorContext from '@/providers/ReplicatorContext';
import { useNavigation } from '@react-navigation/native';
import createReplicatorFromConfig from '@/service/replicator/createReplicatorFromConfig';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';

export default function ReplicationConfigCreateScreen() {
  const { setReplicatorIds } = useContext(ReplicatorContext)!;
  const styles = useStyleScheme();
  const navigation = useNavigation();
  useNavigationBarTitleResetOption('Create Replicator', navigation, reset);

  const [replicatorType, setReplicatorType] = useState<string>('');
  const [connectionString, setConnectionString] = useState<string>('');
  const [heartbeat, setHeartbeat] = useState<string>('300');
  const [maxAttempts, setMaxAttempts] = useState<string>('10');
  const [maxWaitTime, setMaxWaitTime] = useState<string>('300');
  const [continuous, setContinuous] = useState<boolean>(false);
  const [autoPurgeEnabled, setAutoPurgeEnabled] = useState<boolean>(false);
  const [acceptParentDomainCookies, setAcceptParentDomainCookies] =
    useState<boolean>(false);
  const [acceptOnlySelfSignedCerts, setAcceptOnlySelfSignedCerts] =
    useState<boolean>(false);
  const [selectedAuthenticationType, setSelectedAuthenticationType] =
    useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [cookieName, setCookieName] = useState<string>('');
  const [resultMessages, setResultMessages] = useState<string[]>([]);

  function reset() {
    setConnectionString('');
    setHeartbeat('60');
    setMaxAttempts('0');
    setMaxWaitTime('300');
    setReplicatorType('');
    setContinuous(true);
    setAutoPurgeEnabled(true);
    setAcceptParentDomainCookies(false);
    setAcceptOnlySelfSignedCerts(false);

    //authentication section
    setSelectedAuthenticationType('');
    setUsername('');
    setPassword('');
    setSessionId('');
    setCookieName('');
    setResultMessages([]);
  }

  function isConnectionStringValid(connStringLower: string) {
    return (
      connStringLower.startsWith('ws://') ||
      connStringLower.startsWith('wss://')
    );
  }

  async function update(
    database: Database,
    scopeName: string,
    collections: string[]
  ): Promise<void> {
    try {
      if (database === null || database === undefined) {
        setResultMessages(['Database is required, currently not set']);
      }
      const connStringLower = connectionString.toLowerCase();
      if (replicatorType === '') {
        setResultMessages(['Replicator Type is required']);
        return;
      }
      if (selectedAuthenticationType === '') {
        setResultMessages(['Authentication Type is required']);
        return;
      }
      if (scopeName === '') {
        setResultMessages(['Scope Name is required']);
        return;
      }
      if (collections.length === 0) {
        setResultMessages(['At least one collection is required']);
        return;
      }
      if (connStringLower === '' || !isConnectionStringValid(connStringLower)) {
        setResultMessages(['Connection String is required']);
        return;
      }
      const replicatorId = await createReplicatorFromConfig(
        setReplicatorIds,
        database,
        scopeName,
        collections,
        replicatorType,
        connectionString,
        heartbeat,
        maxAttempts,
        maxWaitTime,
        continuous,
        autoPurgeEnabled,
        acceptParentDomainCookies,
        acceptOnlySelfSignedCerts,
        selectedAuthenticationType,
        username,
        password,
        sessionId,
        cookieName
      );
      const date = new Date();
      setResultMessages((prev) => [
        ...prev,
        `${date.toISOString()}:: Replicator created with id: ${replicatorId}`,
      ]);
    } catch (error) {
      // @ts-ignore
      setResultMessages((prev) => [...prev, error.message]);
    }
  }

  function updateResultMessage(messages: string[]) {
    setResultMessages((prev) => [...prev, ...messages]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <ReplicatorConfigCollectionForm
          handleResetPressed={reset}
          handleUpdatePressed={update}
          updateResultMessage={updateResultMessage}
        />
        <ReplicatorAuthenticationForm
          selectedAuthenticationType={selectedAuthenticationType}
          setSelectedAuthenticationType={setSelectedAuthenticationType}
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          sessionId={sessionId}
          setSessionId={setSessionId}
          cookieName={cookieName}
          setCookieName={setCookieName}
        />
        <ReplicatorConfigGeneralForm
          acceptParentDomainCookies={acceptParentDomainCookies}
          autoPurgeEnabled={autoPurgeEnabled}
          connectionString={connectionString}
          continuous={continuous}
          heartbeat={heartbeat}
          maxAttempts={maxAttempts}
          maxWaitTime={maxWaitTime}
          acceptOnlySelfSignedCerts={acceptOnlySelfSignedCerts}
          setAcceptParentDomainCookies={setAcceptParentDomainCookies}
          setAutoPurgeEnabled={setAutoPurgeEnabled}
          setConnectionString={setConnectionString}
          setContinuous={setContinuous}
          setHeartbeat={setHeartbeat}
          setMaxAttempts={setMaxAttempts}
          setMaxWaitTime={setMaxWaitTime}
          setAcceptOnlySelfSignedCerts={setAcceptOnlySelfSignedCerts}
          setReplicatorType={setReplicatorType}
        />
        <ResultListView
          style={localStyles.resultMessages}
          useScrollView={false}
          messages={resultMessages}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  resultMessages: {
    paddingBottom: 40,
  },
});
