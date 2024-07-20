import { MaintenanceType } from 'cbl-reactnative';

export function useMaintenanceTypeAsValues() {
  return Object.entries(MaintenanceType)
    .filter(([key]) => isNaN(Number(key)))
    .map(([key, value]) => {
      return { key: key, value: value.toString() };
    });
}

export function useMaintenanceType() {
  return MaintenanceType;
}
