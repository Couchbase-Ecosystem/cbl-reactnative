import React from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '@/components/Themed/Themed';
import HeaderView from '@/components/HeaderView/HeaderView';
import { ResultsListViewProps } from '@/components/ResultsListView/resultsListViewProps.type';
import { Divider } from '@gluestack-ui/themed';

export default function ResultListView({
  messages,
  style,
}: ResultsListViewProps) {
  const date = new Date().toISOString();
  return (
    <>
      <HeaderView name="Results" iconName="information" style={style} />
      <ScrollView>
        {messages?.map((message, index) => (
          <View
            style={{ marginLeft: 16, marginTop: 12 }}
            key={`view-${index}-${date}`}
          >
            <Text key={`message-${index}-${date}`}>{message}</Text>
            <Divider
              key={`divider-${index}-${date}`}
              style={{ marginTop: 14, marginBottom: 4, marginLeft: 2 }}
            />
          </View>
        ))}
      </ScrollView>
    </>
  );
}
