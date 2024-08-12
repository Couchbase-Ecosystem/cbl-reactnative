import React, { useState } from 'react';
import defaultCollection from '@/service/collection/default';
import { Database } from 'cbl-reactnative';
import { SafeAreaView, ScrollView, Text } from 'react-native';
import { useStyleScheme } from '@/components/Themed';
import ReplicatorConfigGeneralForm from '@/components/ReplicatorConfigGeneral';

export default function ReplicationConfigCreateScreen() {
  const [replicatorType, setReplicatorType] = useState<string>('');
  const [connectionString, setConnectionString] = useState<string>('');
  const [heartbeat, setHeartbeat] = useState<string>('300');
  const [maxAttempts, setMaxAttempts] = useState<string>('10');
  const [maxWaitTime, setMaxWaitTime] = useState<string>('300');
  const [continuous, setContinuous] = useState<boolean>(false);
  const [autoPurgeEnabled, setAutoPurgeEnabled] = useState<boolean>(false);
  const [acceptParentDomainCookies, setAcceptParentDomainCookies] =
    useState<boolean>(false);

  function reset() {}

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
      </ScrollView>
    </SafeAreaView>
  );
}
