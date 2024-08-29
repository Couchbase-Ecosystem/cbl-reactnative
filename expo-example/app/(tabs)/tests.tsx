import React from 'react';

import { useTestsNavigationSections } from '@/hooks/useTestsNavigationSections';
import NavigationSectionListing from '@/components/NavigationSectionListing/NavigationSectionListing';

export default function TestsTabScreen() {
  const sections = useTestsNavigationSections();
  return <NavigationSectionListing sections={sections} />;
}
