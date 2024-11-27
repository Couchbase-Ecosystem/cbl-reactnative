import React from 'react';
import TestRunnerContainer from '@/components/TestRunnerContainer/TestRunnerContainer';

import { IndexingTests } from "../../cblite-js-tests/cblite-tests/e2e/indexing-test";

export default function TestsIndexingScreen() {
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
      navigationTitle="Indexing Tests"
      collapseTitle="Indexing Tests"
      testCases={[IndexingTests]}
    />
  );
}
