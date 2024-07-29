import React, { useContext, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import DatabaseNameForm from '@/components/DatabaseNameForm';
import ResultListView from '@/components/ResultsListView';
import DatabaseContext from '@/providers/DatabaseContext';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import HeaderRunActionView from '@/components/HeaderRunActionView';
import { StyledTextInput } from '@/components/StyledTextInput';
import listCollections from '@/service/collection/list';

export default function CollectionListScreen() {
  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [scopeName, setScopeName] = useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('List Collections', navigation, reset);

  function reset() {
    setDatabaseName('');
    setScopeName('');
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
        const collections = await listCollections(
          databases,
          databaseName,
          scopeName
        );
        if (collections.length > 0) {
          collections.forEach((collection) => {
            setResultsMessage((prev) => [
              ...prev,
              `Found Collection: <${collection.fullName()}>`,
            ]);
          });
        } else {
          setResultsMessage((prev) => [
            ...prev,
            'Error: No collections found.  Collections should have at least 1 collection defined in a given scope.',
          ]);
        }
      } catch (error) {
        // @ts-ignore
        setResultsMessage((prev) => [...prev, error.message]);
      }
    }
  };

  return (
    <View style={styles.container}>
      <DatabaseNameForm
        setDatabaseName={setDatabaseName}
        databaseName={databaseName}
      />
      <HeaderRunActionView
        name="Scope"
        iconName="file-cabinet"
        handleUpdatePressed={update}
      />
      <StyledTextInput
        autoCapitalize="none"
        placeholder="Scope Name"
        onChangeText={(scopeText) => setScopeName(scopeText)}
        defaultValue={scopeName}
      />
      <ResultListView messages={resultMessage} />
    </View>
  );
}
