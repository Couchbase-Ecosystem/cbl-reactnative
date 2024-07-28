import { Database, LogLevel, LogDomain } from 'cbl-reactnative';

export default async function setConsoleLog(
  logLevel: string,
  logDomain: string
) {
  try {
    const logLevelValue = getLogLevelFromString(logLevel);
    const logDomainValue = getLogDomainFromString(logDomain);
    await Database.setLogLevel(logDomainValue, logLevelValue);
    return 'Database logging successfully changed';
  } catch (error: any) {
    return `Error changing database logging: ${error.message}`;
  }
}

function getLogDomainFromString(value: string): LogDomain {
  switch (value) {
    case 'ALL':
      return LogDomain.ALL;
    case 'DATABASE':
      return LogDomain.DATABASE;
    case 'NETWORK':
      return LogDomain.NETWORK;
    case 'QUERY':
      return LogDomain.QUERY;
    case 'REPLICATOR':
      return LogDomain.REPLICATOR;
  }
  throw new Error("Couldn't find LogDomain from string value passed in");
}

function getLogLevelFromString(value: string): LogLevel {
  switch (value) {
    case '0':
      return LogLevel.DEBUG;
    case '1':
      return LogLevel.VERBOSE;
    case '2':
      return LogLevel.INFO;
    case '3':
      return LogLevel.WARNING;
    case '4':
      return LogLevel.ERROR;
    case '5':
      return LogLevel.NONE;
  }
  throw new Error("Couldn't find LogLevel from string value passed in");
}
