import { View } from 'react-native';
import { Text } from '@/components/Themed/Themed';
import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectTrigger,
} from '@gluestack-ui/themed';
import { useStyleScheme } from '@/components/Themed/Themed';
import React from 'react';
import { SelectKeyValueProps } from '@/components/SelectKeyValue/selectKeyValueProps.type';

export default function SelectKeyValue({
  headerTitle,
  onSelectChange,
  placeholder,
  items,
  style,
}: SelectKeyValueProps) {
  const styles = useStyleScheme();
  return (
    <View style={[styles.selectContainer, style && style]}>
      <Text style={styles.selectTextDescription}>{headerTitle}</Text>
      <Select onValueChange={(value) => onSelectChange(value)}>
        <SelectTrigger variant="outline" size="md">
          <SelectInput placeholder={placeholder} />
        </SelectTrigger>
        <SelectPortal>
          <SelectBackdrop />
          <SelectContent>
            <SelectDragIndicatorWrapper>
              <SelectDragIndicator />
            </SelectDragIndicatorWrapper>
            {items.map((item) => (
              <SelectItem
                label={item.key}
                value={item.value}
                key={`select-item-${item.value}`}
              />
            ))}
          </SelectContent>
        </SelectPortal>
      </Select>
    </View>
  );
}
