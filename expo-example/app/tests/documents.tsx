import React from 'react';
import TestRunnerContainer from '@/components/TestRunnerContainer/TestRunnerContainer';

import { DocumentTests } from "../../cblite-js-tests/cblite-tests/e2e/document-test";

export default function TestsDocumentScreen() {
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
      navigationTitle="Document Tests"
      collapseTitle="Document Tests"
      testCases={[DocumentTests]}
    />
  );
}
