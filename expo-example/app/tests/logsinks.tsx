import React from 'react';
import TestRunnerContainer from '@/components/TestRunnerContainer/TestRunnerContainer';

import { LogSinksTests } from '../../cblite-js-tests/cblite-tests/e2e/logsinks-test';

export default function TestsLogSinksScreen() {
  function reset() {}

  async function update(): Promise<string[]> {
    try {
      return [''];
    } catch (e) {
      // @ts-ignore
      return [error.message];
    }
  }

  return (
    <TestRunnerContainer
      navigationTitle="LogSinks Tests"
      collapseTitle="LogSinks Tests"
      testCases={[LogSinksTests]}
    />
  );
}

