import { Text } from '../Themed/Themed';
import { TextProps } from '@/components/Themed/themeProps.type';

export function MonoText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: 'SpaceMono' }]} />;
}
