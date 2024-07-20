import React, { useContext, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import ResultListView from '@/components/ResultsListView';
import DatabaseContext from '@/providers/DatabaseContext';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import { useLogDomainAsValues } from '@/hooks/useLogDomain';
import HeaderRunActionView from '@/components/HeaderRunActionView';
import SelectKeyValue from '@/components/SelectKeyValue';
import { useLogLevelAsValues } from '@/hooks/useLogLevel';
import setConsoleLog from '@/service/database/setConsoleLog';

export default function LoggingConsoleScreen() {
  const { databases } = useContext(DatabaseContext)!;
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('');
  const [selectedLogDomain, setSelectedLogDomain] = useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('Console Logging', navigation, reset);

  const logDomains = useLogDomainAsValues();

  const logLevels = useLogLevelAsValues();

  function reset() {
    setSelectedLogLevel('');
    setSelectedLogDomain('');
    setResultsMessage([]);
  }

  const update = async () => {
    if (selectedLogLevel && selectedLogDomain) {
      const result = await setConsoleLog(selectedLogLevel, selectedLogDomain);
      setResultsMessage((prev) => [...prev, result]);
    }
  };

  return (
    <View style={styles.container}>
      <HeaderRunActionView
        name="Console Log"
        iconName="file-compare"
        handleUpdatePressed={update}
      />
      <SelectKeyValue
        headerTitle="Select a Log Domain"
        onSelectChange={setSelectedLogDomain}
        placeholder="Log Domain"
        items={logDomains}
      />

      <SelectKeyValue
        headerTitle="Select a Log Level"
        onSelectChange={setSelectedLogLevel}
        placeholder="Log Level"
        items={logLevels}
      />
      <ResultListView messages={resultMessage} />
    </View>
  );
}
