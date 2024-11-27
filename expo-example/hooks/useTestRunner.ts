import { useRef, useState, useCallback } from 'react';
import { TestRunner, ITestResult, TestCase } from '../cblite-js-tests/cblite-tests/e2e';

export function useTestRunner<T extends new () => TestCase>(testCases: T[]) {
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [shouldCancel, setShouldCancel] = useState<boolean>(false);
  const [resultMessages, setResultMessages] = useState<ITestResult[]>([]);
  const [currentMessage, setCurrentMessage] = useState<ITestResult | null>(null);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);

  const reset = useCallback(() => {
    setSuccessCount(0);
    setFailedCount(0);
    setShowDetails(false);
    setShouldCancel(false);
    setResultMessages([]);
    setCurrentMessage(null);
  }, []);

  const shouldTestCaseCancel = useCallback(() => {
    return shouldCancel;
  }, [shouldCancel]);

  const runTests = useCallback(async () => {
    if (isRunning) {
      console.log('Tests already running, skipping...');
      return;
    }

    try {
      console.log('Starting test run...');
      setIsRunning(true);
      setCurrentMessage(null);
      setResultMessages([]);
      setSuccessCount(0);
      setFailedCount(0);

      for (const element of testCases) {
        setCurrentMessage(null);
        const testRunner = new TestRunner();
        const testGenerator = testRunner.runTests(
          element,
          shouldTestCaseCancel
        );

        for await (const result of testGenerator) {
          if (result.message === 'running') {
            setCurrentMessage(result);
          } else {
            if (result.success) {
              setSuccessCount(prev => prev + 1);
            } else {
              setFailedCount(prev => prev + 1);
            }
            setResultMessages(prev => [...prev, result]);
          }
        }
      }
    } finally {
      console.log('Finishing test run...');
      setIsRunning(false);
    }
  }, [isRunning]);

  return {
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
  };
}