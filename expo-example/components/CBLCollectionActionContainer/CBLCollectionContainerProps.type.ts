import React from 'react';
import { Collection } from 'cbl-reactnative';

export type CBLCollectionContainerProps = {
  screenTitle: string;
  handleUpdatePressed: (collection: Collection) => Promise<string[]>;
  handleResetPressed: () => void;
  children?: React.ReactNode;
};
