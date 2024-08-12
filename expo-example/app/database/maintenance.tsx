import React, { useContext, useState } from 'react';
import { SafeAreaView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import ResultListView from '@/components/ResultsListView';
import DatabaseContext from '@/providers/DatabaseContext';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import HeaderRunActionView from '@/components/HeaderRunActionView';
import SelectKeyValue from '@/components/SelectKeyValue';
import { useMaintenanceTypeAsValues } from '@/hooks/useMaintenanceTypes';
import DatabaseNameForm from '@/components/DatabaseNameForm';
import performMaintenance from '@/service/database/performMaintenance';

export default function PerformMaintenanceScreen() {
  const { databases } = useContext(DatabaseContext)!;
  const [databaseName, setDatabaseName] = useState<string>('');
  const [selectedMaintenanceType, setSelectedMaintenanceType] =
    useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('Perform Maintenance', navigation, reset);

  const maintenanceTypes = useMaintenanceTypeAsValues();

  function reset() {
    setSelectedMaintenanceType('');
    setResultsMessage([]);
  }

  const update = async () => {
    if (!databaseName) {
      setResultsMessage(['Database Name is required']);
      return;
    }

    if (!selectedMaintenanceType) {
      setResultsMessage(['Maintenance Type is required']);
      return;
    }

    if (!databases[databaseName]) {
      setResultsMessage(['Database not found']);
      return;
    }
    try {
      await performMaintenance(
        databases,
        databaseName,
        selectedMaintenanceType
      );
      setResultsMessage([
        `Maintenance performed successfully, but note it might take a while to complete.`,
      ]);
    } catch (error) {
      // @ts-ignore
      setResultsMessage((prev) => [...prev, error.message]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <DatabaseNameForm
        setDatabaseName={setDatabaseName}
        databaseName={databaseName}
      />
      <HeaderRunActionView
        name="Maintenance Types"
        iconName="database-cog"
        handleUpdatePressed={update}
      />
      <View style={styles.component}>
        <SelectKeyValue
          headerTitle="Types of Database Maintenance"
          onSelectChange={setSelectedMaintenanceType}
          placeholder="Select a Maintenance Type"
          items={maintenanceTypes}
        />
      </View>
      <ResultListView messages={resultMessage} />
    </SafeAreaView>
  );
}
