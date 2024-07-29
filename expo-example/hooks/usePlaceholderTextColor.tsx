import { ColorSchemeName } from 'react-native';

export function usePlaceholderTextColor(scheme: ColorSchemeName) {
  return scheme === 'dark' ? '#808080' : '#666';
}
