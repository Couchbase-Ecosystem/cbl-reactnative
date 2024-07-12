import React from 'react';
import { Text, useColorScheme, View } from 'react-native';
import { useStyleScheme } from '@/components/Themed';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { HeaderViewProps } from '@/types/headerViewProps.type';

export default function HeaderView({ name, iconName }: HeaderViewProps) {
  const scheme = useColorScheme();
  const styles = useStyleScheme();
  return (
    <View style={styles.header}>
      <MaterialCommunityIcons
        name={iconName}
        size={24}
        color={scheme === 'dark' ? '#fff' : '#000'}
      />
      <Text style={styles.header}>{name}</Text>
    </View>
  );
}
