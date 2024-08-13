import React from 'react';

export type ReplicatorConfigGeneralProps = {
  setReplicatorType: (arg: string) => void;
  setConnectionString: (arg: string) => void;
  connectionString: string;
  setHeartbeat: (arg: string) => void;
  heartbeat: string;
  setMaxAttempts: (arg: string) => void;
  maxAttempts: string;
  setMaxWaitTime: (arg: string) => void;
  maxWaitTime: string;
  setContinuous: (arg: boolean) => void;
  continuous: boolean;
  setAutoPurgeEnabled: (arg: boolean) => void;
  autoPurgeEnabled: boolean;
  setAcceptParentDomainCookies: (arg: boolean) => void;
  acceptParentDomainCookies: boolean;
  setAcceptOnlySelfSignedCerts: (args: boolean) => void;
  acceptOnlySelfSignedCerts: boolean;
};
