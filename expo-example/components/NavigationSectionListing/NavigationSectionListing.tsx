import React from 'react';
import { SectionList, useColorScheme, Pressable } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import {
  Text,
  View,
  LightStyles,
  DarkStyles,
} from '@/components/Themed/Themed';
import { NavigationSectionListingProps } from '@/components/NavigationSectionListing/navigationSectionListingProps.type';

export default function NavigationSectionListing({
  sections,
}: NavigationSectionListingProps) {
  const scheme = useColorScheme(); // Detects the current theme (light or dark)
  const styles = scheme === 'dark' ? DarkStyles() : LightStyles(); // Conditionally sets the styles
  const router = useRouter(); // Use useRouter hook for navigation
  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `navItem-${item.id}-${index}`}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(item.path)}
            style={({ pressed }) => [
              styles.itemContainer,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Text style={styles.link}>{item.title}</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={scheme === 'dark' ? '#fff' : '#000'}
            />
          </Pressable>
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.header}>
            <MaterialCommunityIcons
              name={section.icon as any}
              size={24}
              color={scheme === 'dark' ? '#fff' : '#000'}
            />
            <Text style={styles.header}>{section.title}</Text>
          </View>
        )}
      />
    </View>
  );
}
