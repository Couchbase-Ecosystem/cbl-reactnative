import React from 'react';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useClientOnlyValue } from '@/hooks/useClientOnlyValue';

import { MaterialCommunityIcons } from '@expo/vector-icons';

function MaterialCommunityTabBarIcon(props: {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
}) {
  return (
    <MaterialCommunityIcons size={28} style={{ marginBottom: -3 }} {...props} />
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Database',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityTabBarIcon name="database" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: 'Collection',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityTabBarIcon name="bookshelf" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityTabBarIcon
              name="file-document-multiple-outline"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="query"
        options={{
          title: 'Query',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityTabBarIcon name="magnify" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="replication"
        options={{
          title: 'Replication',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityTabBarIcon name="database-sync" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="tests"
        options={{
          title: 'Tests',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityTabBarIcon name="run" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
