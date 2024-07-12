import React from 'react';

import { useCollectionNavigationSections } from '@/hooks/useCollectionNavigationSections';
import NavigationSectionListing from '@/components/NavigationSectionListing';

export default function CollectionTabScreen() {
  const sections = useCollectionNavigationSections();
  return <NavigationSectionListing sections={sections} />;
}
