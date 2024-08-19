import {
  Database,
  Replicator,
  ReplicatorConfiguration,
  BasicAuthenticator,
  SessionAuthenticator,
} from 'cbl-reactnative';

export default async function createReplicationConfig(
  database: Database,
  scopeName: string,
  collections: string[],
  replicatorType: string,
  connectionString: string,
  heartbeat: string,
  maxAttempts: string,
  maxWaitTime: string,
  continuous: boolean,
  autoPurgeEnabled: boolean,
  acceptParentDomainCookies: boolean,
  acceptOnlySelfSignedCerts: boolean,
  selectedAuthenticationType: string,
  username: string | undefined,
  password: string | undefined,
  sessionId: string | undefined,
  cookieName: string | undefined
): Promise<string> {
  return '';
}
