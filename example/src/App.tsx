import React, { useState } from 'react';
import { StyleSheet, View, Text, Button } from 'react-native';
import UseFileGetDefaultPath from './hooks/UseFileGetDefaultPath';
import NativeDevSettings from 'react-native/Libraries/NativeModules/specs/NativeDevSettings';

export default function App() {
  const [result, setResult] = useState<string | undefined>();

  const connectToRemoteDebugger = () => {
    NativeDevSettings.setIsDebuggingRemotely(true);
  };

  connectToRemoteDebugger();

  // This function is called when the button is pressed
  const handlePress = async () => {
    try {
      const path = await UseFileGetDefaultPath();
      setResult(path);
    } catch (error) {
      setResult(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text>Result: {result}</Text>
      <Button title="Get Default Path" onPress={handlePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
