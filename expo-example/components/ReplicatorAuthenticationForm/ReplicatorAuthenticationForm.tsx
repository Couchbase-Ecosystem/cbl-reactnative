import React from 'react';
import SelectKeyValue from '@/components/SelectKeyValue/SelectKeyValue';
import { StyledTextInput } from '@/components/StyledTextInput/StyledTextInput';
import { View, StyleSheet } from 'react-native';
import { ReplicatorAuthenticationFormProps } from '@/components/ReplicatorAuthenticationForm/ReplicatorAuthenticationFormProps.type';
import { useStyleScheme } from '@/components/Themed/Themed';
import HeaderView from '@/components/HeaderView/HeaderView';
import { Divider } from '@gluestack-ui/themed';
type Item = { key: string; value: string };

export default function ReplicatorAuthenticationForm({
  selectedAuthenticationType,
  setSelectedAuthenticationType,
  username,
  setUsername,
  password,
  setPassword,
  sessionId,
  setSessionId,
  cookieName,
  setCookieName,
}: ReplicatorAuthenticationFormProps) {
  const styles = useStyleScheme();
  const items: Item[] = [
    { key: 'basic', value: 'Basic' },
    { key: 'session', value: 'Session' },
  ];

  function selectChanged(e: string) {
    setSelectedAuthenticationType(e);
  }

  return (
    <>
      <HeaderView
        key="authenticationHeader"
        name="Authentication"
        iconName="account-cog"
      />
      <View
        key="authenticationForm"
        style={[styles.component, localStyles.view]}
      >
        <SelectKeyValue
          key="authenticationTypeSelect"
          placeholder="Authentication Type"
          headerTitle="Authentication Type"
          items={items}
          onSelectChange={selectChanged}
        />
        <Divider style={localStyles.divider} />
        {selectedAuthenticationType.toLowerCase() === 'basic' ? (
          <>
            <StyledTextInput
              key="username"
              style={styles.textInput}
              autoCapitalize="none"
              placeholder="Username"
              onChangeText={(newText) => setUsername(newText)}
              defaultValue={username}
            />
            <Divider style={localStyles.divider} />
            <StyledTextInput
              key="password"
              style={styles.textInput}
              autoCapitalize="none"
              placeholder="Password"
              onChangeText={(newText) => setPassword(newText)}
              defaultValue={password}
            />
            <Divider style={localStyles.divider} />
          </>
        ) : null}
        {selectedAuthenticationType.toLowerCase() === 'session' ? (
          <>
            <StyledTextInput
              key="sessionId"
              style={styles.textInput}
              autoCapitalize="none"
              placeholder="Session ID"
              onChangeText={(newText) => setSessionId(newText)}
              defaultValue={sessionId}
            />
            <Divider style={localStyles.divider} />
            <StyledTextInput
              key="cookieName"
              style={styles.textInput}
              autoCapitalize="none"
              placeholder="Cookie Name"
              onChangeText={(newText) => setCookieName(newText)}
              defaultValue={cookieName}
            />
            <Divider style={localStyles.divider} />
          </>
        ) : null}
      </View>
    </>
  );
}
const localStyles = StyleSheet.create({
  divider: {
    marginTop: 5,
    marginBottom: 10,
  },
  view: {
    paddingBottom: 20,
  },
});
