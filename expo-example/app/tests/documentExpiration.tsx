import React from 'react';
import TestRunnerContainer from '@/components/TestRunnerContainer/TestRunnerContainer';

import { DocumentExpirationTests } from "../../cblite-js-tests/cblite-tests/e2e/document-expiration-test";

export default function TestsDocumentExpirationScreen() {
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
      navigationTitle="Doc Expiration Tests"
      collapseTitle="Doc Expiration Tests"
      testCases={[DocumentExpirationTests]}
    />
  );
}
