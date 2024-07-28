/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import {
  Text as DefaultText,
  View as DefaultView,
  StyleSheet,
} from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { TextProps, ViewProps } from '@/types/themeProps.type';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    'background'
  );

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}

export function useStyleScheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DarkStyles() : LightStyles();
}

export function BaseStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      fontSize: 16,
      fontWeight: 'bold',
      paddingStart: 10,
      paddingEnd: 8,
      paddingTop: 4,
      paddingBottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
    },
    itemContainer: {
      flexDirection: 'row', // Align items in a row
      justifyContent: 'space-between', // Space between items
      alignItems: 'center', // Center items vertically
      padding: 10,
      borderBottomWidth: 1,
    },
    dividerTextInput: {
      marginTop: 15,
      marginBottom: 5,
      marginLeft: 8,
    },
    dividerCollectionFormTextInput: {
      marginTop: 5,
      marginBottom: 5,
      marginLeft: 8,
    },
    textInput: {
      height: 40,
      paddingStart: 8,
      fontSize: 16,
    },
    selectTextDescription: {
      paddingTop: 8,
      paddingLeft: 4,
      paddingBottom: 4,
      fontSize: 16,
    },
    link: {
      padding: 10,
      fontSize: 16,
    },
    selectContainer: {
      paddingTop: 10,
      paddingBottom: 8,
    },
  });
}

export function LightStyles() {
  const baseStyles = BaseStyles();
  return StyleSheet.create({
    ...baseStyles,
    header: {
      ...baseStyles.header,
      backgroundColor: '#e6e6e6',
      color: '#000',
    },
    itemContainer: {
      ...baseStyles.itemContainer,
      backgroundColor: '#f9f9f9',
      borderBottomColor: '#ddd',
    },
    link: {
      ...baseStyles.link,
      color: '#000',
    },
    select: {
      borderColor: '#333',
      // Add more style adjustments for dark/light mode
    },
  });
}

export function DarkStyles() {
  const baseStyles = BaseStyles();
  return StyleSheet.create({
    ...baseStyles,
    header: {
      ...baseStyles.header,
      backgroundColor: '#2C2C2E',
      color: '#fff',
    },
    itemContainer: {
      ...baseStyles.itemContainer,
      backgroundColor: '#1C1C1E',
      borderBottomColor: '#38383A',
    },
    link: {
      ...baseStyles.link,
      color: '#fff',
    },
    select: {
      borderColor: '#FFF',
      // Add more style adjustments for dark/light mode
    },
  });
}
