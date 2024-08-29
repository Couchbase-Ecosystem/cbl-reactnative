import React, { useContext, useState } from 'react';
import ReplicatorContext from '@/providers/ReplicatorContext';
import { useNavigation } from '@react-navigation/native';
import SelectKeyValue from '@/components/SelectKeyValue/SelectKeyValue';
import HeaderToolbarView from '@/components/HeaderToolbarView/HeaderToolbarView';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import { Item } from '@/types/item.type';
import { ReplicatorIdActionFormProps } from '@/components/ReplicatorIdActionForm/ReplicatorIdActionFormProps.type';

export default function ReplicatorIdActionForm({
  screenTitle,
  handleUpdatePressed,
  handleResetPressed,
  handleStopPressed,
}: ReplicatorIdActionFormProps) {
  const { replicatorIds } = useContext(ReplicatorContext)!;
  const [replicatorId, setReplicatorId] = useState<string>('');
  const navigation = useNavigation();

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
  if (handleStopPressed !== undefined) {
    icons.push({
      iconName: 'stop',
      onPress: stop,
    });
  }

  async function update() {
    if (replicatorId in replicatorIds) {
      const replicator = replicatorIds[replicatorId];
      await handleUpdatePressed(replicator);
    } else {
      throw new Error(
        `Error: Replicator <${replicatorId}> not found in context. Make sure replicator was created first prior to trying to use it.`
      );
    }
  }

  async function stop() {
    if (replicatorId in replicatorIds && handleStopPressed !== undefined) {
      const replicator = replicatorIds[replicatorId];
      await handleStopPressed(replicator);
    } else {
      throw new Error(
        `Error: Replicator <${replicatorId}> not found in context or no handle to stop the replicator. Make sure replicator was created first prior to trying to stop it.`
      );
    }
  }

  function reset() {
    setReplicatorId('');
    handleResetPressed();
  }
  return (
    <>
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
    </>
  );
}
