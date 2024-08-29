import React from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '@/components/Themed/Themed';
import HeaderView from '@/components/HeaderView/HeaderView';
import { ResultsListViewProps } from '@/components/ResultsListView/resultsListViewProps.type';
import { Divider } from '@gluestack-ui/themed';

export default function ResultListView({
  messages,
  style,
  useScrollView = true,
}: ResultsListViewProps) {
  const date = new Date().toISOString();

  const content = (
    <>
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
    </>
  );

  return (
    <>
      <View style={style}>
        <HeaderView name="Results" iconName="information" />
        {useScrollView ? <ScrollView>{content}</ScrollView> : content}
      </View>
    </>
  );
}
