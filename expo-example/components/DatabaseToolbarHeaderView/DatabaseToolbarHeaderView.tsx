import HeaderToolbarView from '@/components/HeaderToolbarView/HeaderToolbarView';
import { DatabaseToolbarHeaderViewProps } from '@/components/DatabaseToolbarHeaderView/databaseHeaderViewProps.type';

export default function DatabaseToolbarHeaderView({
  icons,
  style,
}: DatabaseToolbarHeaderViewProps) {
  return HeaderToolbarView({
    style: style,
    name: 'Database',
    iconName: 'database',
    icons,
  });
}
