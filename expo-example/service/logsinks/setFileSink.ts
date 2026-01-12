import { LogSinks, LogLevel } from 'cbl-reactnative';

export default async function setFileSink(
  logLevel: string,
  directory: string,
  maxRotateCount: number,
  maxSize: number,
  usePlaintext: boolean
) {
  try {
    const logLevelValue = getLogLevelFromString(logLevel);

    await LogSinks.setFile({
      level: logLevelValue,
      directory: directory,
      config: {
        maxRotateCount,
        maxSize,
        usePlaintext,
      },
    });

    return `✅ File LogSink enabled: Dir=${directory}, Level=${logLevel}`;
  } catch (error: any) {
    return `❌ Error setting file LogSink: ${error.message}`;
  }
}

function getLogLevelFromString(value: string): LogLevel {
  switch (value) {
    case '0': return LogLevel.DEBUG;
    case '1': return LogLevel.VERBOSE;
    case '2': return LogLevel.INFO;
    case '3': return LogLevel.WARNING;
    case '4': return LogLevel.ERROR;
    case '5': return LogLevel.NONE;
    default:
      throw new Error(`Unknown LogLevel: ${value}`);
  }
}

