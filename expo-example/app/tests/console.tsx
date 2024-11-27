import React from 'react';
import TestRunnerContainer from '@/components/TestRunnerContainer/TestRunnerContainer';

import { ConsoleLoggingTests } from "../../cblite-js-tests/cblite-tests/e2e/console-logging-test";

export default function TestsConsoleScreen() {
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
      navigationTitle="Console Tests"
      collapseTitle="Console Tests"
      testCases={[ConsoleLoggingTests]}
    />
  );
}
