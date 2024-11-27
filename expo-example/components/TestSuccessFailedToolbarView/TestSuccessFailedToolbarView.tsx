import { Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useStyleScheme } from '@/components/Themed/Themed';
import { TestSuccessFailedToolbarViewProps } from './testSuccessFailedToolbarViewProps.type';

export default function TestSuccessFailedToolbarView({
  successCount,
  failedCount,
  style,
}: TestSuccessFailedToolbarViewProps) {
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
      <View style={{ flexDirection: 'row' }}>
        <Text style={styles.header}>Success: {successCount}</Text>
      </View>
      <View style={{ flexDirection: 'row', marginRight: 8 }}>
        <Text style={styles.header}>Failed: {failedCount}</Text>
      </View>
    </View>
  );
}
