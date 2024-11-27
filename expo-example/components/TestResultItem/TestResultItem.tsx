import React from 'react';
import { View, Text } from 'react-native';
import { StyledText } from '@/components/StyledText/StyledText';
import { useStyleScheme } from '@/components/Themed/Themed';
import { TestResultItemProps } from './testResultItemProp.type';
import { Spinner, Icon, CheckIcon, CloseIcon } from '@gluestack-ui/themed';

export default function TestResultItem({
  result,
  showDetails,
}: TestResultItemProps) {
 const styles = useStyleScheme();
  return (
    <>
      <View
        style={[
		{
		  backgroundColor: styles.header.backgroundColor,
          borderRadius: 8,
          padding: 16,
          marginVertical: 8,
          marginHorizontal: 16,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5, // This is for Android shadow
        }
		]}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <StyledText style={{ fontSize: 16, fontWeight: 'bold' }}>
            {result.testName}
          </StyledText>
          { result.success ? (
            <Icon as={CheckIcon} color="green" />
          ) : (
            <Icon as={CloseIcon} color="red" />
          )}
        </View>
        {showDetails && result.message && result.message.length > 0 && (
			<View style={{ marginTop: 12, marginBottom: 10 }}>
          <StyledText style={{ fontSize: 14 }}>{result.message}</StyledText>
		  </View>
        )}
      </View>
    </>
  );
}
