import React, { useState } from 'react';
import { SafeAreaView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed/Themed';
import ResultListView from '@/components/ResultsListView/ResultsListView';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import { useLogDomainAsValues } from '@/hooks/useLogDomain';
import HeaderRunActionView from '@/components/HeaderRunActionView/HeaderRunActionView';
import SelectKeyValue from '@/components/SelectKeyValue/SelectKeyValue';
import { useLogLevelAsValues } from '@/hooks/useLogLevel';
import { Divider, Button, ButtonText } from '@gluestack-ui/themed';
import setConsoleSink from '@/service/logsinks/setConsoleSink';
import disableConsoleSink from '@/service/logsinks/disableConsoleSink';

export default function LogSinksConsoleScreen() {
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('LogSinks Console', navigation, reset);

  const logDomains = useLogDomainAsValues();
  const logLevels = useLogLevelAsValues();

  function reset() {
    setSelectedLogLevel('');
    setSelectedDomains([]);
    setResultsMessage([]);
  }

  const enable = async () => {
    if (selectedLogLevel === '') {
      setResultsMessage((prev) => [...prev, '❌ Please select a log level']);
      return;
    }
    const result = await setConsoleSink(selectedLogLevel, selectedDomains);
    setResultsMessage((prev) => [...prev, result]);
  };

  const disable = async () => {
    const result = await disableConsoleSink();
    setResultsMessage((prev) => [...prev, result]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderRunActionView
        name="Console LogSink"
        iconName="console"
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
          <View style={{ marginTop: 10 }}>
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
        <Button onPress={disable} action="negative">
          <ButtonText>Disable Console LogSink</ButtonText>
        </Button>
      </View>
      <ResultListView messages={resultMessage} />
    </SafeAreaView>
  );
}

