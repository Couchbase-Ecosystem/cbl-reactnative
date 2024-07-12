import { Text } from './Themed';
import { TextProps } from '@/types/themeProps.type';

export function MonoText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: 'SpaceMono' }]} />;
}
