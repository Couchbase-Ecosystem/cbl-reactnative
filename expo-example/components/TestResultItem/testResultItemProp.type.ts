import {
	ITestResult,
  } from '../../cblite-js-tests/cblite-tests/e2e/';

export type TestResultItemProps = {
	result: ITestResult;
	showDetails: boolean;
	style?: object;
  };
  