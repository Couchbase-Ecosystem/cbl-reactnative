import React from 'react';
import TestRunnerContainer from '@/components/TestRunnerContainer/TestRunnerContainer';

import { TestingTests } from "../../cblite-js-tests/cblite-tests/e2e/testing-test";

export default function TestsScreen() {
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
      navigationTitle="Testing Tests"
      collapseTitle="Testing Tests"
      testCases={[TestingTests]}
    />
  );
}
