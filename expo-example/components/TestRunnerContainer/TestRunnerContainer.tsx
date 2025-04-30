import './TestRunnerContainer.css';
import React, { memo } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useStyleScheme } from '@/components/Themed/Themed';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import { useTestRunner } from '@/hooks/useTestRunner';
import { useNavigation } from '@react-navigation/native';
import TestToolbarHeaderView from '@/components/TestHeaderToolbarView/TestHeaderToolbarView';
import TestSuccessFailedToolbarView from '@/components/TestSuccessFailedToolbarView/TestSuccessFailedToolbarView';
import TestCurrentRunningView from '@/components/TestCurrentRunningView/TestCurrentRunningView';
import TestResultItem from '@/components/TestResultItem/TestResultItem';
import { FlatList } from '@gluestack-ui/themed';
import { ITestResult, TestCase } from '../../cblite-js-tests/cblite-tests/e2e';
import { Text } from 'react-native';

const MemoizedTestToolbarHeaderView = memo(TestToolbarHeaderView);
const MemoizedTestCurrentRunningView = memo(TestCurrentRunningView);
const MemoizedTestSuccessFailedToolbarView = memo(TestSuccessFailedToolbarView);
const MemoizedTestResultItem = memo(TestResultItem);

interface ContainerProps<T extends new () => TestCase> {
  navigationTitle: string;
  subTitle: string;
  testCases: T[];
}

function TestRunnerContainer<T extends new () => TestCase>({
  navigationTitle,
  subTitle,
  testCases,
}: ContainerProps<T>) {
  const styles = useStyleScheme();
  const navigation = useNavigation();
  const {
    showDetails,
    setShowDetails,
    shouldCancel,
    setShouldCancel,
    resultMessages,
    currentMessage,
    successCount,
    failedCount,
    runTests,
    reset,
    isRunning,
  } = useTestRunner(testCases);

  useNavigationBarTitleResetOption(navigationTitle, navigation, reset);

  const icons = React.useMemo(
    () => [
      {
        iconName: 'stop',
        onPress: () => setShouldCancel(true),
        disabled: !isRunning,
      },
      {
        iconName: 'play',
        onPress: runTests,
        disabled: isRunning,
      },
    ],
    [isRunning, setShouldCancel, runTests]
  );

  return (
    <SafeAreaView style={styles.container}>
      <MemoizedTestToolbarHeaderView
        showDetails={showDetails}
        setShowDetails={setShowDetails}
        icons={icons}
        style={localStyles}
      />
      <Text style={{ paddingTop: 10, paddingLeft: 15 }}>{subTitle}</Text>
      {isRunning && (
        <MemoizedTestCurrentRunningView
          currentTestName={currentMessage?.testName || ''}
          style={localStyles}
        />
      )}
      {resultMessages.length > 0 && (
        <FlatList
          data={resultMessages}
          renderItem={({ item }) => (
            <MemoizedTestResultItem
              result={item}
              showDetails={showDetails}
              keyExtractor={(item: ITestResult) => item.testName}
            />
          )}
        />
      )}
      <MemoizedTestSuccessFailedToolbarView
        successCount={successCount.toString()}
        failedCount={failedCount.toString()}
        style={localStyles}
      />
    </SafeAreaView>
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

export default memo(TestRunnerContainer);
