import { LogDomain } from 'cbl-reactnative';

export function useLogDomainAsValues() {
  return Object.entries(LogDomain).map(([key, value]) => {
    return { key, value: value.toString() };
  });
}

export function useLogDomain() {
  return LogDomain;
}
