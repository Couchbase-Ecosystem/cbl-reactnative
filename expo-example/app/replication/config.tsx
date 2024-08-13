import React, { useState } from 'react';
import defaultCollection from '@/service/collection/default';
import { Database } from 'cbl-reactnative';
import { SafeAreaView, ScrollView, Text } from 'react-native';
import { useStyleScheme } from '@/components/Themed';
import ReplicatorConfigGeneralForm from '@/components/ReplicationConfigGeneralForm/ReplicatorConfigGeneralForm';
import ReplicatorAuthenticationForm from '@/components/ReplicatorAuthenticationForm/ReplicatorAuthenticationForm';

export default function ReplicationConfigCreateScreen() {
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
  }

  async function update(database: Database) {
    try {
      const collection = await defaultCollection(database);
      return [
        `Found Collection: <${collection.fullName()}> in Database: <${collection.database.getName()}>`,
      ];
    } catch (error) {
      // @ts-ignore
      return [error.message];
    }
  }
  const styles = useStyleScheme();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <ReplicatorConfigGeneralForm
          acceptParentDomainCookies={acceptParentDomainCookies}
          autoPurgeEnabled={autoPurgeEnabled}
          connectionString={connectionString}
          continuous={continuous}
          heartbeat={heartbeat}
          maxAttempts={maxAttempts}
          maxWaitTime={maxWaitTime}
          setAcceptParentDomainCookies={setAcceptParentDomainCookies}
          setAutoPurgeEnabled={setAutoPurgeEnabled}
          setConnectionString={setConnectionString}
          setContinuous={setContinuous}
          setHeartbeat={setHeartbeat}
          setMaxAttempts={setMaxAttempts}
          setMaxWaitTime={setMaxWaitTime}
          setReplicatorType={setReplicatorType}
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
      </ScrollView>
    </SafeAreaView>
  );
}
