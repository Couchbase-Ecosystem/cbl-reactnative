import React from 'react';
import TestRunnerContainer from '@/components/TestRunnerContainer/TestRunnerContainer';

import { ListenerTests } from "../../cblite-js-tests/cblite-tests/e2e/listener-test";

export default function TestsListenerScreen() {
  function reset() {}

  async function update(): Promise<string[]> {
    try {
      return [''];
    } catch (e) {
      // @ts-ignore
      return [e.message];
    }
  }

  return (
    <TestRunnerContainer
      navigationTitle="Listener Token Tests"
      collapseTitle="Listener Token Tests"
      testCases={[ListenerTests]}
    />
  );
}