import HeaderView from '@/components/HeaderView';
import React from 'react';
import { ScrollView } from 'react-native';
import { Text } from '@/components/Themed';
import { ResultsListViewProps } from '@/types/resultsListViewProps.type';
import { Divider } from '@gluestack-ui/themed';

export default function ResultListView({ messages }: ResultsListViewProps) {
  const date = new Date().toISOString();
  return (
    <>
      <HeaderView name={'Results'} iconName={'information'} />
      <ScrollView style={{ marginLeft: 16, marginTop: 2 }}>
        {messages?.map((message, index) => (
          <>
            <Text key={`message-${index}-${date}`}>{message}</Text>
            <Divider
              key={`divider-${index}-${date}`}
              style={{ marginTop: 16, marginBottom: 16, marginLeft: 2 }}
            />
          </>
        ))}
      </ScrollView>
    </>
  );
}
