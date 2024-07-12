import React from 'react';

import { useDatabaseNavigationSections } from '@/hooks/useDatabaseNavigationSections';
import NavigationSectionListing from '@/components/NavigationSectionListing';

export default function DatabaseTabScreen() {
  const sections = useDatabaseNavigationSections();
  return <NavigationSectionListing sections={sections} />;
}
