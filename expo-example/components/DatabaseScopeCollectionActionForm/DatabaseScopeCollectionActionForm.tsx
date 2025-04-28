import React from 'react';
import { DatabaseScopeCollectionActionFormProps } from '@/components/DatabaseScopeCollectionActionForm/databaseScopeCollectionActionFormProps.type';
import DatabaseScopeCollectionForm from '@/components/DatabaseScopeCollectionForm/DatabaseScopeCollectionForm';
import DatabaseToolbarHeaderView from '@/components/DatabaseToolbarHeaderView/DatabaseToolbarHeaderView';

export default function DatabaseScopeCollectionActionForm({
  databaseName,
  setDatabaseName,
  scopeName,
  setScopeName,
  collectionName,
  setCollectionName,
  handleUpdatePressed,
  handleStopPressed,
  style,
}: DatabaseScopeCollectionActionFormProps) {
  const icons = [
    {
      iconName: 'play',
      onPress: handleUpdatePressed,
    },
    ...(handleStopPressed
      ? [
          {
            iconName: 'stop',
            onPress: handleStopPressed,
          },
        ]
      : []),
  ];
  return (
    <>
      <DatabaseToolbarHeaderView icons={icons} style={style} />
      <DatabaseScopeCollectionForm
        databaseName={databaseName}
        setDatabaseName={setDatabaseName}
        scopeName={scopeName}
        setScopeName={setScopeName}
        collectionName={collectionName}
        setCollectionName={setCollectionName}
      />
    </>
  );
}
