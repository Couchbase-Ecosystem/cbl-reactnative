import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme, Text } from '@/components/Themed/Themed';
import ResultListView from '@/components/ResultsListView/ResultsListView';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import { useLogDomainAsValues } from '@/hooks/useLogDomain';
import HeaderRunActionView from '@/components/HeaderRunActionView/HeaderRunActionView';
import SelectKeyValue from '@/components/SelectKeyValue/SelectKeyValue';
import { useLogLevelAsValues } from '@/hooks/useLogLevel';
import { Divider, Button, ButtonText } from '@gluestack-ui/themed';
import setCustomSink from '@/service/logsinks/setCustomSink';
import disableCustomSink from '@/service/logsinks/disableCustomSink';

export default function LogSinksCustomScreen() {
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('LogSinks Custom', navigation, reset);

  const logDomains = useLogDomainAsValues();
  const logLevels = useLogLevelAsValues();

  function reset() {
    setSelectedLogLevel('');
    setSelectedDomains([]);
    setResultsMessage([]);
    setLogMessages([]);
    setIsListening(false);
  }

  const enable = async () => {
    if (selectedLogLevel === '') {
      setResultsMessage((prev) => [...prev, '❌ Please select a log level']);
      return;
    }

    // Callback that receives logs from native
    const callback = (level: number, domain: string, message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = `[${timestamp}] [${domain}] ${message}`;
      setLogMessages((prev) => [...prev, logEntry]);
    };

    const result = await setCustomSink(selectedLogLevel, selectedDomains, callback);
    setResultsMessage((prev) => [...prev, result]);
    setIsListening(true);
  };

  const disable = async () => {
    const result = await disableCustomSink();
    setResultsMessage((prev) => [...prev, result]);
    setIsListening(false);
    setLogMessages([]);
  };

  const clearLogs = () => {
    setLogMessages([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <HeaderRunActionView
          name="Custom LogSink"
          iconName="webhook"
          handleUpdatePressed={enable}
        />
        <View style={styles.component}>
          <SelectKeyValue
            headerTitle="Select Log Level"
            onSelectChange={setSelectedLogLevel}
            placeholder="Log Level (Required)"
            items={logLevels}
          />
          <Divider style={{ marginTop: 10 }} />
          <SelectKeyValue
            headerTitle="Select Log Domains (Optional)"
            onSelectChange={(value) => {
              if (value && !selectedDomains.includes(value)) {
                setSelectedDomains([...selectedDomains, value]);
              }
            }}
            placeholder="Add Domain"
            items={logDomains}
          />
          {selectedDomains.length > 0 && (
            <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' }}>
              {selectedDomains.map((domain, index) => (
                <Button 
                  key={index}
                  size="xs"
                  variant="outline"
                  onPress={() => setSelectedDomains(selectedDomains.filter((_, i) => i !== index))}
                  style={{ margin: 2 }}
                >
                  <ButtonText>{domain} ✕</ButtonText>
                </Button>
              ))}
            </View>
          )}
          <Divider style={{ marginTop: 10, marginBottom: 10 }} />
          
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button onPress={disable} action="negative" style={{ flex: 1 }}>
              <ButtonText>Disable</ButtonText>
            </Button>
            <Button onPress={clearLogs} action="secondary" style={{ flex: 1 }}>
              <ButtonText>Clear Logs</ButtonText>
            </Button>
          </View>

          <Divider style={{ marginTop: 10, marginBottom: 10 }} />

          {isListening && (
            <View style={{ padding: 10, backgroundColor: '#e8f5e9', borderRadius: 5 }}>
              <Text style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                ✅ Listening for logs... ({logMessages.length} received)
              </Text>
            </View>
          )}
        </View>

        <View style={{ padding: 10 }}>
          <Text style={styles.text}>Status Messages:</Text>
          <ResultListView messages={resultMessage} />
        </View>

        {logMessages.length > 0 && (
          <View style={{ padding: 10 }}>
            <Text style={styles.text}>Received Logs:</Text>
            <ResultListView messages={logMessages} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

