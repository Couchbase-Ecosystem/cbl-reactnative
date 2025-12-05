import React from 'react';
import TestRunnerContainer from '@/components/TestRunnerContainer/TestRunnerContainer';

import { ReplicatorNewApiTests } from '../../cblite-js-tests/cblite-tests/e2e/replicator-new-api-test';

export default function TestsReplicatorScreen() {
  function reset() {}

  async function update(): Promise<string[]> {
    try {
      return [''];
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      return [errorMessage];
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
