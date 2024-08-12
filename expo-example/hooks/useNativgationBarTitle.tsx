import { useLayoutEffect } from 'react';

const useNavigationBarTitleOption = (title: string, navigation: any) => {
  useLayoutEffect(() => {
    navigation.setOptions({
      title: title,
      headerBackTitle: 'Back',
    });
  }, [navigation, title]);
};

export default useNavigationBarTitleOption;
