import HeaderView from '@/components/HeaderView/HeaderView';
import React from 'react';
import { StyledTextInput } from '@/components/StyledTextInput';
import { Text, View, useStyleScheme } from '@/components/Themed';
import { Divider, Switch } from '@gluestack-ui/themed';
import { ReplicatorConfigGeneralProps } from '@/components/ReplicationConfigGeneralForm/ReplicatorConfigGeneralProps.type';
import SelectKeyValue from '@/components/SelectKeyValue';
import { StyleSheet } from 'react-native';

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
  acceptOnlySelfSignedCerts,
  setAcceptOnlySelfSignedCerts,
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
      <View style={[styles.component, localStyles.view]}>
        <SelectKeyValue
          headerTitle="Select Replicator Type"
          onSelectChange={setReplicatorType}
          placeholder="Replicator Types"
          items={replicatorTypes}
        />
        <Divider style={localStyles.divider} />
        <StyledTextInput
          autoCapitalize="none"
          style={[styles.textInput, localStyles.connectionString]}
          placeholder="Connection String"
          onChangeText={(newText) => setConnectionString(newText)}
          defaultValue={connectionString}
          multiline={true}
        />
        <Divider style={localStyles.divider} />
        <Text>Heartbeat (in seconds)</Text>
        <StyledTextInput
          autoCapitalize="none"
          keyboardType={'numeric'}
          style={styles.textInput}
          onChangeText={(newText) => setHeartbeat(newText)}
          defaultValue={heartbeat}
          multiline={true}
        />
        <Divider style={localStyles.divider} />
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
        <Divider style={localStyles.divider} />
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
        <Divider style={localStyles.divider} />
        <View style={styles.viewStackRightComponent}>
          <Text style={{ paddingLeft: 2, fontSize: 16 }}>Continuous</Text>
          <Switch
            style={{ paddingRight: 16 }}
            value={continuous}
            onValueChange={setContinuous}
          />
        </View>
        <Divider style={localStyles.divider} />
        <View style={styles.viewStackRightComponent}>
          <Text style={{ paddingLeft: 2, fontSize: 16 }}>
            Auto Purge Enabled
          </Text>
          <Switch
            style={{ paddingRight: 16 }}
            value={autoPurgeEnabled}
            onValueChange={setAutoPurgeEnabled}
          />
        </View>
        <Divider style={localStyles.divider} />
        <View style={styles.viewStackRightComponent}>
          <Text style={{ paddingLeft: 2, fontSize: 16 }}>
            Accept Parent Domain Cookies
          </Text>
          <Switch
            style={{ paddingRight: 16 }}
            value={acceptParentDomainCookies}
            onValueChange={setAcceptParentDomainCookies}
          />
        </View>
        <Divider style={localStyles.divider} />
        <View style={styles.viewStackRightComponent}>
          <Text style={{ paddingLeft: 2, fontSize: 16 }}>
            Accept Only Self-Signed Certs
          </Text>
          <Switch
            style={{ paddingRight: 16 }}
            value={acceptOnlySelfSignedCerts}
            onValueChange={setAcceptOnlySelfSignedCerts}
          />
        </View>
      </View>
    </>
  );
}
const localStyles = StyleSheet.create({
  divider: {
    marginTop: 5,
    marginBottom: 10,
  },
  connectionString: {
    height: undefined,
    minHeight: 120,
    marginTop: 5,
    marginBottom: 15,
  },
  view: {
    paddingBottom: 20,
  },
});
