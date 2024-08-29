import HeaderView from '@/components/HeaderView/HeaderView';

export default function DatabaseHeaderView({ style }: DatabaseHeaderViewProps) {
  return HeaderView({ name: 'Database', iconName: 'database', style: style });
}
