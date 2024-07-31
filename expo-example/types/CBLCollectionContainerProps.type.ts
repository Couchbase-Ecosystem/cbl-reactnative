import { Collection } from 'cbl-reactnative';
import React from 'react';

export type CBLCollectionContainerProps = {
  screenTitle: string;
  handleUpdatePressed: (collection: Collection) => Promise<string[]>;
  handleResetPressed: () => void;
  children?: React.ReactNode;
};
