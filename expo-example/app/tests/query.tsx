import React from 'react';
import TestRunnerContainer from '@/components/TestRunnerContainer/TestRunnerContainer';

import { QueryTests } from "../../cblite-js-tests/cblite-tests/e2e/query-test";

export default function TestsQueryScreen() {
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
      navigationTitle="Query SQL++ Tests"
      collapseTitle="Query SQL++ Tests"
      testCases={[QueryTests]}
    />
  );
}
