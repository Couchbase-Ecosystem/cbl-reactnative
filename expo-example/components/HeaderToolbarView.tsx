import React from 'react';
import { Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useStyleScheme } from '@/components/Themed';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { HeaderToolbarViewProps } from '@/types/headerToolbarViewProps.type';

export default function HeaderToolbarView({
  name,
  iconName,
  icons,
}: HeaderToolbarViewProps) {
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
        },
      ]}
    >
      <View style={{ flexDirection: 'row' }}>
        <MaterialCommunityIcons
          name={iconName}
          size={24}
          color={scheme === 'dark' ? '#fff' : '#000'}
        />
        <Text style={styles.header}>{name}</Text>
      </View>
      <View style={{ flexDirection: 'row', marginRight: 8 }}>
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
