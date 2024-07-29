import { LogLevel } from 'cbl-reactnative';

export function useLogLevelAsValues() {
  return Object.entries(LogLevel)
    .filter(([key]) => isNaN(Number(key)))
    .map(([key, value]) => {
      return { key: key, value: value.toString() };
    });
}

export function useLogLevel() {
  return LogLevel;
}
