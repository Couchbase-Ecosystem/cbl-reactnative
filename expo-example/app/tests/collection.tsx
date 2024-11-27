import React from 'react';
import TestRunnerContainer from '@/components/TestRunnerContainer/TestRunnerContainer';

import { CollectionTests } from '../../cblite-js-tests/cblite-tests/e2e/collection-test';

export default function TestsCollectionScreen() {
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
      navigationTitle="Collection Tests"
      collapseTitle="Collection Tests"
      testCases={[CollectionTests]}
    />
  );
}
