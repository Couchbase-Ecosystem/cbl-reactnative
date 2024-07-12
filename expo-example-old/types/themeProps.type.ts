import { Text as DefaultText } from 'react-native/Libraries/Text/Text';
import { View as DefaultView } from 'react-native/Libraries/Components/View/View';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];
