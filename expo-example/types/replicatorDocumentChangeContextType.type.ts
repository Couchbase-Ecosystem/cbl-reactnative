import React from 'react';
export type ReplicatorDocumentChangeContextType = {
  documentChangeMessages: Record<string, string[]>;
  setDocumentChangeMessages: React.Dispatch<
    React.SetStateAction<Record<string, string[]>>
  >;
};
