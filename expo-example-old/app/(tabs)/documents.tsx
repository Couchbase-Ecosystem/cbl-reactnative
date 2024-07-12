import React from 'react';

import { useDocumentNavigationSections } from '@/hooks/useDocumentNavigationSections';
import NavigationSectionListing from '@/components/NavigationSectionListing';

export default function DocumentsTabScreen() {
  const sections = useDocumentNavigationSections();
  return <NavigationSectionListing sections={sections} />;
}
