import { Collection } from '../../../lib/typescript/src';
import React from 'react';

export type CBLDocumentIdCollectionContainerProps = {
  screenTitle: string;
  handleUpdatePressed: (
    collection: Collection,
    documentId: string
  ) => Promise<string[]>;
  handleResetPressed: () => void;
  children?: React.ReactNode;
};
