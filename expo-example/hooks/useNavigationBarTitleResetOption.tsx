// Custom hook to set reset icon in navigation header
import React from 'react';
import { useLayoutEffect } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/build/MaterialCommunityIcons';

const useNavigationBarTitleResetOption = (
  title: string,
  navigation: any,
  reset: () => void
) => {
  useLayoutEffect(() => {
    navigation.setOptions({
      title: title,
      headerBackTitle: 'Back',
      headerRight: () => (
        <MaterialCommunityIcons
          name="refresh"
          size={24}
          color="#428cff"
          onPress={reset}
        />
      ),
    });
  }, [navigation, reset, title]);
};

export default useNavigationBarTitleResetOption;
