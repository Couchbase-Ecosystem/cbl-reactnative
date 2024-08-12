import React, { useContext, useState } from 'react';
import DatabaseContext from '@/providers/DatabaseContext';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import ResultListView from '@/components/ResultsListView';
import DatabaseNameForm from '@/components/DatabaseNameForm';
import { CBLDatabaseQueryActionContainerProps } from '@/types/CBLDatabaseQueryActionContainerProps.type';
import { Database } from 'cbl-reactnative';
import HeaderToolbarView from '@/components/HeaderToolbarView';
import { StyledTextInput } from '@/components/StyledTextInput';

export default function CBLDatabaseQueryActionContainer({
  screenTitle,
  handleUpdatePressed,
  handleExplainedPressed,
  handleResetPressed,
  children,
}: CBLDatabaseQueryActionContainerProps) {
  const navigation = useNavigation();
  const styles = useStyleScheme();

  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);

  useNavigationBarTitleResetOption(screenTitle, navigation, reset);

  function isFormValidate(): boolean {
    let isValid = true;
    if (databaseName === '') {
      setResultsMessage((prev) => [
        ...prev,
        'Error: Database name is required',
      ]);
      isValid = false;
    } else if (sqlQuery === '') {
      setResultsMessage((prev) => [...prev, 'Error: SQL Query is required']);
      isValid = false;
    }
    return isValid;
  }

  async function update(isExplain: boolean) {
    if (isFormValidate()) {
      try {
        if (
          databaseName in databases &&
          databases[databaseName] instanceof Database
        ) {
          const database = databases[databaseName];
          let resultMessages: string[] = [];
          if (isExplain) {
            resultMessages = await handleExplainedPressed(database, sqlQuery);
          } else {
            resultMessages = await handleUpdatePressed(database, sqlQuery);
          }
          setResultsMessage((prev) => [...prev, ...resultMessages]);
        } else {
          setResultsMessage((prev) => [
            ...prev,
            `Error: Database <${databaseName}> not found in context. Make sure database was opened first prior to trying to use it.`,
          ]);
        }
      } catch (error) {
        // @ts-ignore
        setResultsMessage((prev) => [...prev, error.message]);
      }
    }
  }

  function reset() {
    setDatabaseName('');
    setSqlQuery('');
    setResultsMessage([]);
    handleResetPressed();
  }

  function updatePressed() {
    return update(false);
  }

  function explainPressed() {
    return update(true);
  }

  const icons = [
    {
      iconName: 'text-box-search',
      onPress: explainPressed,
    },
    {
      iconName: 'play',
      onPress: updatePressed,
    },
  ];
  return (
    <SafeAreaView style={styles.container}>
      <DatabaseNameForm
        setDatabaseName={setDatabaseName}
        databaseName={databaseName}
      />
      <HeaderToolbarView
        name="Query Editor"
        iconName="database-search"
        icons={icons}
      />
      <View style={styles.component}>
        <StyledTextInput
          autoCapitalize="none"
          style={[styles.textInput, localStyles.query]}
          placeholder="SQL++ Query"
          onChangeText={(newText) => setSqlQuery(newText)}
          defaultValue={sqlQuery}
          multiline={true}
        />
        {children && children}
      </View>
      <ResultListView messages={resultMessage} />
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  query: {
    height: undefined,
    minHeight: 120,
    marginTop: 5,
    marginBottom: 15,
  },
});
