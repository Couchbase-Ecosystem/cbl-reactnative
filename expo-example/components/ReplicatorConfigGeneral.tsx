import HeaderView from '@/components/HeaderView';
import React from 'react';
import { StyledTextInput } from '@/components/StyledTextInput';
import { Text, View, useStyleScheme } from '@/components/Themed';
import { Divider, Switch } from '@gluestack-ui/themed';
import { ReplicatorConfigGeneralProps } from '@/types/ReplicatorConfigGeneralProps.type';
import SelectKeyValue from '@/components/SelectKeyValue';

export default function ReplicatorConfigGeneralForm({
  setConnectionString,
  connectionString,
  setHeartbeat,
  heartbeat,
  setMaxAttempts,
  maxAttempts,
  setMaxWaitTime,
  maxWaitTime,
  setContinuous,
  continuous,
  setAutoPurgeEnabled,
  autoPurgeEnabled,
  setAcceptParentDomainCookies,
  acceptParentDomainCookies,
  setReplicatorType,
}: ReplicatorConfigGeneralProps) {
  const styles = useStyleScheme();
  const replicatorTypes = [
    { key: 'PUSH', value: 'PUSH' },
    { key: 'PULL', value: 'PULL' },
    { key: 'PUSH AND PULL', value: 'PUSH AND PULL' },
  ];
  return (
    <>
      <HeaderView name="General" iconName="cog" />
      <View style={styles.component}>
        <SelectKeyValue
          headerTitle="Select Replicator Type"
          onSelectChange={setReplicatorType}
          placeholder="Replicator Types"
          items={replicatorTypes}
        />
        <Divider style={{ marginTop: 5, marginBottom: 10 }} />
        <StyledTextInput
          autoCapitalize="none"
          style={[
            styles.textInput,
            {
              height: undefined,
              minHeight: 120,
              marginTop: 5,
              marginBottom: 15,
            },
          ]}
          placeholder="Connection String"
          onChangeText={(newText) => setConnectionString(newText)}
          defaultValue={connectionString}
          multiline={true}
        />
        <Divider style={{ marginTop: 5, marginBottom: 10 }} />
        <Text>Heartbeat (in seconds)</Text>
        <StyledTextInput
          autoCapitalize="none"
          keyboardType={'numeric'}
          style={styles.textInput}
          onChangeText={(newText) => setHeartbeat(newText)}
          defaultValue={heartbeat}
          multiline={true}
        />
        <Divider style={{ marginTop: 5, marginBottom: 10 }} />
        <View>
          <Text>Max Attempts (0 restores default behavior)</Text>
          <StyledTextInput
            autoCapitalize="none"
            keyboardType={'numeric'}
            style={styles.textInput}
            onChangeText={(newText) => setMaxAttempts(newText)}
            defaultValue={maxAttempts}
            multiline={true}
          />
        </View>
        <Divider style={{ marginTop: 5, marginBottom: 10 }} />
        <View>
          <Text>Max Attempts Wait Time (in seconds)</Text>
          <StyledTextInput
            autoCapitalize="none"
            keyboardType={'numeric'}
            style={styles.textInput}
            onChangeText={(newText) => setMaxWaitTime(newText)}
            defaultValue={maxWaitTime}
            multiline={true}
          />
        </View>
        <Divider style={{ marginTop: 5, marginBottom: 10 }} />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ paddingLeft: 2, fontSize: 16 }}>Continuous</Text>
          <Switch
            style={{ paddingRight: 16 }}
            value={continuous}
            onValueChange={setContinuous}
          />
        </View>
        <Divider style={{ marginTop: 5, marginBottom: 10 }} />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ paddingLeft: 2, fontSize: 16 }}>
            Auto Purge Enabled
          </Text>
          <Switch
            style={{ paddingRight: 16 }}
            value={autoPurgeEnabled}
            onValueChange={setAutoPurgeEnabled}
          />
        </View>
        <Divider style={{ marginTop: 5, marginBottom: 10 }} />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ paddingLeft: 2, fontSize: 16 }}>
            Accept Parent Domain Cookies
          </Text>
          <Switch
            style={{ paddingRight: 16 }}
            value={acceptParentDomainCookies}
            onValueChange={setAcceptParentDomainCookies}
          />
        </View>
      </View>
    </>
  );
}
