import HeaderToolbarView from '@/components/HeaderToolbarView';
import { ToolbarViewProps } from '@/types/toolbarViewProps.type';

export default function CollectionToolbarHeaderView({
  icons,
}: ToolbarViewProps) {
  return HeaderToolbarView({
    name: 'Collection',
    iconName: 'bookshelf',
    icons,
  });
}
