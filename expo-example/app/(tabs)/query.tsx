import React from 'react';

import { useQueryNavigationSections } from '@/hooks/useQueryNavigationSections';
import NavigationSectionListing from '@/components/NavigationSectionListing/NavigationSectionListing';

export default function QueryTabScreen() {
  const sections = useQueryNavigationSections();
  return <NavigationSectionListing sections={sections} />;
}
