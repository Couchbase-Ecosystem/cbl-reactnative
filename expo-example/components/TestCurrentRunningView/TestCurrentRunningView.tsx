import { Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useStyleScheme } from '@/components/Themed/Themed';
import { TestCurrentRunningViewProps } from './testCurrentRunningViewProps.type';
import { Spinner } from '@gluestack-ui/themed';

export default function TestCurrentRunningView({
  currentTestName,
  style,
}: TestCurrentRunningViewProps) {
  const scheme = useColorScheme();
  const styles = useStyleScheme();

  return (
    <View
      style={[
        styles.header,
        {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 12,
          marginBottom: 10,
        },
        style && style,
      ]}
    >
      {currentTestName && currentTestName !== '' && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8, // Adds space between the spinner and text
          }}
        >
          <Text style={styles.header}>Running: {currentTestName}</Text>
          <Spinner />
        </View>
      )}
    </View>
  );
}
