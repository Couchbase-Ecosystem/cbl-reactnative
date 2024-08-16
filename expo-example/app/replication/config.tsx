import React, { useState } from 'react';
import { Database } from 'cbl-reactnative';
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { useStyleScheme } from '@/components/Themed/Themed';
import ReplicatorConfigGeneralForm from '@/components/ReplicationConfigGeneralForm/ReplicatorConfigGeneralForm';
import ReplicatorAuthenticationForm from '@/components/ReplicatorAuthenticationForm/ReplicatorAuthenticationForm';
import ReplicatorConfigCollectionForm from '@/components/ReplicationConfigCollectionForm/ReplicatorConfigCollectionForm';
import ResultListView from '@/components/ResultsListView/ResultsListView';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import useNavigationBarTitleOption from '@/hooks/useNativgationBarTitle';

export default function ReplicationConfigCreateScreen() {
  const navigation = useNavigation();
  useNavigationBarTitleOption('Add Replicator Config', navigation);
  //general form
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
  //used for authentication type and authentication fields
  const [selectedAuthenticationType, setSelectedAuthenticationType] =
    useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [cookieName, setCookieName] = useState<string>('');
  //used for displaying result messages
  const [resultMessages, setResultMessages] = useState<string[]>([]);

  function reset() {
    setConnectionString('');
    //setHeaders('');
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

  async function update(
    database: Database,
    scopeName: string,
    collections: string[]
  ): Promise<void> {
    try {
      //const collection = await defaultCollection(database);
      //return [
      //  `Found Collection: <${collection.fullName()}> in Database: <${collection.database.getName()}>`,
      //];
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }

  function updateResultMessage(messages: string[]) {}
  const styles = useStyleScheme();

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
