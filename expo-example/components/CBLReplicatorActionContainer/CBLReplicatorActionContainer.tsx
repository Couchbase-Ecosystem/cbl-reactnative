import React, { useContext, useState } from 'react';
import { SafeAreaView } from 'react-native';
import ReplicatorContext from '@/providers/ReplicatorContext';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed/Themed';
import ResultListView from '@/components/ResultsListView/ResultsListView';
import SelectKeyValue from '@/components/SelectKeyValue/SelectKeyValue';
import HeaderToolbarView from '@/components/HeaderToolbarView/HeaderToolbarView';
import { CBLReplicatorActionContainerProps } from '@/components/CBLReplicatorActionContainer/CBLReplicatorActionContainerProps.type';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import { Item } from '@/types/item.type';

export default function CBLReplicatorActionContainer({
  screenTitle,
  handleUpdatePressed,
  handleResetPressed,
  children,
}: CBLReplicatorActionContainerProps) {
  const { replicatorIds } = useContext(ReplicatorContext)!;
  const [replicatorId, setReplicatorId] = useState<string>('');
  const [resultMessage, setResultsMessage] = useState<string[]>([]);
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption(screenTitle, navigation, reset);
  const items: Item[] = Object.keys(replicatorIds).map((key) => ({
    key: key,
    value: key,
  }));
  const icons = [
    {
      iconName: 'play',
      onPress: update,
    },
  ];

  async function update() {
    if (replicatorId === '') {
      setResultsMessage((prev) => [...prev, 'Error: replicatorId is required']);
    } else {
      try {
        if (replicatorId in replicatorIds) {
          const replicator = replicatorIds[replicatorId];
          const resultMessages = await handleUpdatePressed(replicator);
          setResultsMessage((prev) => [...prev, ...resultMessages]);
        } else {
          setResultsMessage((prev) => [
            ...prev,
            `Error: Replicator <${replicatorId}> not found in context. Make sure replicator was created first prior to trying to use it.`,
          ]);
        }
      } catch (error) {
        // @ts-ignore
        setResultsMessage((prev) => [...prev, error.message]);
      }
    }
  }

  function reset() {
    setReplicatorId('');
    setResultsMessage([]);
    handleResetPressed();
  }
  return (
    <SafeAreaView style={styles.container}>
      <HeaderToolbarView
        name="Replicator"
        iconName="database-sync"
        icons={icons}
      />
      <SelectKeyValue
        key="replicatorIdSelect"
        placeholder="Replicator ID"
        headerTitle="Select Replicator"
        items={items}
        onSelectChange={setReplicatorId}
      />
      {children && children}
      <ResultListView messages={resultMessage} />
    </SafeAreaView>
  );
}
