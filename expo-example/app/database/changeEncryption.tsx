import React, { useContext, useState } from 'react';
import { SafeAreaView, TextInput, useColorScheme, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme, useThemeColor } from '@/components/Themed/Themed';
import DatabaseNameForm from '@/components/DatabaseNameForm/DatabaseNameForm';
import HeaderRunActionView from '@/components/HeaderRunActionView/HeaderRunActionView';
import ResultListView from '@/components/ResultsListView/ResultsListView';
import changeEncryptionKey from '@/service/database/changeEncryptionKey';
import DatabaseContext from '@/providers/DatabaseContext';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import { usePlaceholderTextColor } from '@/hooks/usePlaceholderTextColor';

export default function ChangeEncryptionScreen() {
  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [encryptionKey, setEncryptionKey] = useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  const scheme = useColorScheme();
  const textColor = useThemeColor({ light: 'black', dark: 'white' }, 'text');
  const placeholderTextColor = usePlaceholderTextColor(scheme);

  useNavigationBarTitleResetOption('Change Encryption Key', navigation, reset);

  function reset() {
    setDatabaseName('');
    setEncryptionKey('');
    setResultsMessage([]);
  }

  const update = async () => {
    if (databaseName === '') {
      setResultsMessage((prev) => [
        ...prev,
        'Error: Database name is required',
      ]);
    } else {
      try {
        const results = await changeEncryptionKey(
          databases,
          databaseName,
          encryptionKey
        );
        setResultsMessage((prev) => [...prev, results]);
      } catch (error) {
        setResultsMessage((prev) => [...prev, '' + error]);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <DatabaseNameForm
        setDatabaseName={setDatabaseName}
        databaseName={databaseName}
      />
      <HeaderRunActionView
        name="Encryption Key"
        iconName="security"
        handleUpdatePressed={update}
      />
      <View style={styles.component}>
        <TextInput
          autoCapitalize="none"
          style={[styles.textInput, { color: textColor }]}
          placeholder="Encryption Key"
          placeholderTextColor={placeholderTextColor}
          onChangeText={(newText) => setEncryptionKey(newText)}
          defaultValue={encryptionKey}
        />
      </View>
      <ResultListView messages={resultMessage} />
    </SafeAreaView>
  );
}
