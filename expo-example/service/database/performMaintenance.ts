import { Database, MaintenanceType } from 'cbl-reactnative';

export default async function performMaintenance(
  databases: Record<string, Database>,
  databaseName: string,
  maintenanceType: string
) {
  if (databaseName in databases) {
    const database = databases[databaseName];
    const maintenanceTypeValue = getMaintenanceTypeFromString(maintenanceType);
    await database.performMaintenance(maintenanceTypeValue);
    return 'Performed Maintenance on Database successfully';
  } else {
    throw new Error(
      'Could not find Database in context, open a database first and try again.'
    );
  }
}

function getMaintenanceTypeFromString(value: string): MaintenanceType {
  switch (value) {
    case '0':
      return MaintenanceType.COMPACT;
    case '1':
      return MaintenanceType.REINDEX;
    case '2':
      return MaintenanceType.INTEGRITY_CHECK;
    case '3':
      return MaintenanceType.OPTIMIZE;
    case '4':
      return MaintenanceType.FULL_OPTIMIZE;
  }
  throw new Error("Couldn't find MaintenanceType from string value passed in");
}
