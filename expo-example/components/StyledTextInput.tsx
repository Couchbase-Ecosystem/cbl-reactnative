import { TextInput, TextInputProps, useColorScheme } from 'react-native';
import { useStyleScheme, useThemeColor } from '@/components/Themed';
import { usePlaceholderTextColor } from '@/hooks/usePlaceholderTextColor';

export function StyledTextInput(props: TextInputProps) {
  const scheme = useColorScheme();
  const styles = useStyleScheme();
  const textColor = useThemeColor({ light: 'black', dark: 'white' }, 'text');
  const placeholderTextColor = usePlaceholderTextColor(scheme);
  return (
    <TextInput
      {...props}
      style={[styles.textInput, props.style, { color: textColor }]}
      placeholderTextColor={placeholderTextColor}
    />
  );
}
