import React from 'react';
import { HeaderRunActionViewProps } from '@/types/headerRunActionViewProps.type';
import HeaderToolbarView from '@/components/HeaderToolbarView';

export default function HeaderRunActionView({
  name,
  iconName,
  handleUpdatePressed,
}: HeaderRunActionViewProps) {
  const icons = [
    {
      iconName: 'play',
      onPress: handleUpdatePressed,
    },
  ];
  return <HeaderToolbarView name={name} iconName={iconName} icons={icons} />;
}
