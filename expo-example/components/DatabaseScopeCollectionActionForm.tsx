import React from 'react';
import { DatabaseScopeCollectionActionFormProps } from '@/types/databaseScopeCollectionActionFormProps.type';
import DatabaseScopeCollectionForm from '@/components/DatabaseScopeCollectionForm';
import DatabaseToolbarHeaderView from '@/components/DatabaseToolbarHeaderView';

export default function DatabaseScopeCollectionActionForm({
  databaseName,
  setDatabaseName,
  scopeName,
  setScopeName,
  collectionName,
  setCollectionName,
  handleUpdatePressed,
}: DatabaseScopeCollectionActionFormProps) {
  const icons = [
    {
      iconName: 'play',
      onPress: handleUpdatePressed,
    },
  ];
  return (
    <>
      <DatabaseToolbarHeaderView icons={icons} />
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
