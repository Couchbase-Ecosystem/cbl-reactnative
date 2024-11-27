import { Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useStyleScheme } from '@/components/Themed/Themed';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Switch } from '@gluestack-ui/themed';
import { TestToolbarHeaderViewProps } from '@/components/TestHeaderToolbarView/testToolbarHeaderViewProps.type';

export default function TestToolbarHeaderView({
  showDetails,
  setShowDetails,
  icons,
  style,
}: TestToolbarHeaderViewProps) {

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
		  marginTop: 10,
        },
        style && style,
      ]}
    >
      <View style={{ flexDirection: 'row' }}>
        <MaterialCommunityIcons
          name='run-fast'
          size={24}
          color={scheme === 'dark' ? '#fff' : '#000'}
        />
        <Text style={styles.header}>Run Tests</Text>
      </View>
      <View style={{ flexDirection: 'row', marginRight: 8 }}>
	  	<Switch
            style={{ paddingRight: 8, paddingLeft: 16 }}
          value={showDetails}
          onValueChange={setShowDetails}
        />
        {icons.map((icon, index) => (
          <TouchableOpacity key={index} onPress={icon.onPress}>
            <MaterialCommunityIcons
              name={icon.iconName}
              size={24}
              style={{ marginLeft: 20 }}
              color="#428cff"
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
