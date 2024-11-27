import React from 'react';
import TestRunnerContainer from '@/components/TestRunnerContainer/TestRunnerContainer';

import { DatabaseTests } from "../../cblite-js-tests/cblite-tests/e2e/database-test";

export default function TestsDatabaseScreen() {
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
      navigationTitle="Database Tests"
      collapseTitle="Database Tests"
      testCases={[DatabaseTests]}
    />
  );
}
