import React from 'react';
import HeaderToolbarView from '@/components/HeaderToolbarView/HeaderToolbarView';
import DatabaseConfigForm from '@/components/DatabaseConfigForm/DatabaseConfigForm';
import { DatabaseConfigActionFormProps } from '@/components/DatabaseConfigActionForm/databaseConfigActionFormProps.type';

export default function DatabaseConfigActionForm({
  fileLocation,
  setFileLocation,
  encryptionKey,
  setEncryptionKey,
  handleLocationPress,
  handleUpdatePressed,
}: DatabaseConfigActionFormProps) {
  const icons = [
    {
      iconName: 'folder-open',
      onPress: handleLocationPress,
    },
    {
      iconName: 'play',
      onPress: handleUpdatePressed,
    },
  ];

  return (
    <>
      <HeaderToolbarView
        name="Database Configuration"
        iconName="database-cog"
        icons={icons}
      />
      <DatabaseConfigForm
        fileLocation={fileLocation}
        encryptionKey={encryptionKey}
        setFileLocation={setFileLocation}
        setEncryptionKey={setEncryptionKey}
      />
    </>
  );
}
