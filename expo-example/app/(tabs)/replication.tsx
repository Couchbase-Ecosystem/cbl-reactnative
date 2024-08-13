import React from 'react';

import { useReplicationNavigationSections } from '@/hooks/useReplicationNavigationSections';
import NavigationSectionListing from '@/components/NavigationSectionListing/NavigationSectionListing';

export default function ReplicationTabScreen() {
  const sections = useReplicationNavigationSections();
  return <NavigationSectionListing sections={sections} />;
}
