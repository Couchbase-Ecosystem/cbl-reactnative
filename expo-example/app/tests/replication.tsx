import React from 'react';
import TestRunnerContainer from '@/components/TestRunnerContainer/TestRunnerContainer';

import { ReplicatorTests } from "../../cblite-js-tests/cblite-tests/e2e/replicator-test";

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
      collapseTitle="Replicator Tests"
      testCases={[ReplicatorTests]}
    />
  );
}
