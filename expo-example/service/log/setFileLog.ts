import {
  Database,
  DatabaseFileLoggingConfiguration,
  LogLevel,
  LogDomain,
  DatabaseLogging,
} from 'cbl-reactnative';

export default async function setFileLog(
  databaseName: string,
  databases: Record<string, Database>,
  logLevel: string,
  path: string,
  maxRotateCount: number,
  maxSize: number,
  usePlainText: boolean
) {
  try {
    if (
      databases[databaseName] !== undefined &&
      databases[databaseName] !== null
    ) {
      const database = databases[databaseName];
      const logLevelValue = getLogLevelFromString(logLevel);
      const config: DatabaseFileLoggingConfiguration = {
        directory: path,
        level: logLevelValue,
        maxRotateCount: maxRotateCount,
        maxSize: maxSize,
        usePlaintext: usePlainText,
      };
      const dbLogging = new DatabaseLogging(database);
      await dbLogging.setFileConfig(config);
      return 'File logging successfully changed';
    } else {
      return 'Error: Database not found';
    }
  } catch (error: any) {
    return `Error changing database logging: ${error.message}`;
  }
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
