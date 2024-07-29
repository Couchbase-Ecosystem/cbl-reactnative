import HeaderToolbarView from '@/components/HeaderToolbarView';
import { ToolbarViewProps } from '@/types/toolbarViewProps.type';

export default function DatabaseHeaderView({ icons }: ToolbarViewProps) {
  return HeaderToolbarView({ name: 'Database', iconName: 'database', icons });
}
