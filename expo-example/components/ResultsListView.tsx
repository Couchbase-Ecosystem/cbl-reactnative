import HeaderView from '@/components/HeaderView';
import React from 'react';
import { ScrollView } from 'react-native';
import { Text } from '@/components/Themed';
import { ResultsListViewProps } from '@/types/resultsListViewProps.type';

export default function ResultListView({ messages }: ResultsListViewProps) {
  return (
    <>
      <HeaderView name={'Results'} iconName={'information'} />
      <ScrollView style={{ marginLeft: 16 }}>
        {messages?.map((message, index) => (
          <Text key={`message-${index}`}>{message}</Text>
        ))}
      </ScrollView>
    </>
  );
}
