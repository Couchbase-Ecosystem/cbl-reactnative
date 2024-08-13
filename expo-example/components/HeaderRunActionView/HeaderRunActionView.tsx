import React from 'react';
import { HeaderRunActionViewProps } from '@/components/HeaderRunActionView/headerRunActionViewProps.type';
import HeaderToolbarView from '@/components/HeaderToolbarView/HeaderToolbarView';

export default function HeaderRunActionView({
  name,
  iconName,
  handleUpdatePressed,
  style,
}: HeaderRunActionViewProps) {
  const icons = [
    {
      iconName: 'play',
      onPress: handleUpdatePressed,
    },
  ];
  return (
    <HeaderToolbarView
      style={style}
      name={name}
      iconName={iconName}
      icons={icons}
    />
  );
}
