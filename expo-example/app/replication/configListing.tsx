import React from 'react';
import { AddIcon, Fab, Icon } from '@gluestack-ui/themed';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme } from '@/components/Themed';
import useNavigationBarTitleOption from '@/hooks/useNativgationBarTitle';

export default function ReplicationConfigListingScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  useNavigationBarTitleOption('Replicator Configs', navigation);

  const handleFabPress = () => {
    router.push('/replication/config');
  };

  return (
    <SafeAreaView style={localStyles.safeArea}>
      <View style={localStyles.container}>
        <Fab
          placement="bottom right"
          style={localStyles.fab}
          onPress={handleFabPress}
        >
          <Icon as={AddIcon} style={localStyles.icon} />
        </Fab>
      </View>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  icon: {
    color: 'white',
    width: 40,
    height: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
