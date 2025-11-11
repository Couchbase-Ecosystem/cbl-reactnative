import React from 'react';
import TestRunnerContainer from '@/components/TestRunnerContainer/TestRunnerContainer';

import { ReplicatorNewApiTests } from '../../cblite-js-tests/cblite-tests/e2e/replicator-new-api-test';

export default function TestsReplicatorScreen() {
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
      navigationTitle="Replicator Tests"
      subTitle="Run Sync Gate before tests - visit tests README.md"
      testCases={[ReplicatorNewApiTests]}
    />
  );
}
