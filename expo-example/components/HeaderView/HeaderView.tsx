import React from 'react';
import { Text, useColorScheme, View, StyleSheet } from 'react-native';
import { useStyleScheme } from '@/components/Themed/Themed';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { HeaderViewProps } from '@/components/HeaderView/headerViewProps.type';

export default function HeaderView({ name, iconName, style }: HeaderViewProps) {
  const scheme = useColorScheme();
  const styles = useStyleScheme();
  return (
    <View style={[styles.header, style && style]}>
      <MaterialCommunityIcons
        name={iconName}
        size={24}
        color={scheme === 'dark' ? '#fff' : '#000'}
      />
      <Text style={styles.header}>{name}</Text>
    </View>
  );
}
