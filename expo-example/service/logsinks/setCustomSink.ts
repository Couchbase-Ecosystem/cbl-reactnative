import { LogSinks, LogLevel, LogDomain } from 'cbl-reactnative';

export default async function setCustomSink(
  logLevel: string,
  domains: string[],
  callback: (level: number, domain: string, message: string) => void
) {
  try {
    const logLevelValue = getLogLevelFromString(logLevel);
    const domainsArray = domains.length > 0 
      ? domains.map(d => getLogDomainFromString(d))
      : undefined;

    await LogSinks.setCustom({
      level: logLevelValue,
      domains: domainsArray,
      callback,
    });

    return `✅ Custom LogSink enabled: Level=${logLevel}, Domains=${domains.join(', ') || 'ALL'}`;
  } catch (error: any) {
    return `❌ Error setting custom LogSink: ${error.message}`;
  }
}

function getLogDomainFromString(value: string): LogDomain {
  switch (value) {
    case 'DATABASE': return LogDomain.DATABASE;
    case 'QUERY': return LogDomain.QUERY;
    case 'REPLICATOR': return LogDomain.REPLICATOR;
    case 'NETWORK': return LogDomain.NETWORK;
    case 'LISTENER': return LogDomain.LISTENER;
    case 'ALL': return LogDomain.ALL;
    default:
      throw new Error(`Unknown LogDomain: ${value}`);
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

