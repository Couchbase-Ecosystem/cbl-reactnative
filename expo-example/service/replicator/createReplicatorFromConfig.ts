import {
  Database,
  Replicator,
  ReplicatorConfiguration,
  BasicAuthenticator,
  SessionAuthenticator,
  URLEndpoint,
  Collection,
  ReplicatorType,
} from 'cbl-reactnative';
import React from 'react';

export default async function createReplicatorFromConfig(
  setReplicatorIds: React.Dispatch<
    React.SetStateAction<Record<string, Replicator>>
  >,
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
  const target = new URLEndpoint(connectionString);
  const config = new ReplicatorConfiguration(target);
  const cols = await getCollections(collections, scopeName, database);

  if (selectedAuthenticationType.toLowerCase() === 'basic') {
    const uname = username || '';
    const pwd = password || '';
    config.setAuthenticator(new BasicAuthenticator(uname, pwd));
  } else {
    const session = sessionId || '';
    const cookie = cookieName || '';
    config.setAuthenticator(new SessionAuthenticator(session, cookie));
  }

  config.addCollections(cols);
  config.setReplicatorType(getReplicationType(replicatorType));
  config.setHeartbeat(parseInt(heartbeat, 10));
  config.setMaxAttempts(parseInt(maxAttempts, 10));
  config.setMaxAttemptWaitTime(parseInt(maxWaitTime, 10));
  config.setContinuous(continuous);
  config.setAutoPurgeEnabled(autoPurgeEnabled);
  config.setAcceptParentDomainCookies(acceptParentDomainCookies);
  config.setAcceptOnlySelfSignedCerts(acceptOnlySelfSignedCerts);
  const replicator = await Replicator.create(config);
  const uuid = replicator.getId();
  if (uuid !== undefined && uuid !== '') {
    setReplicatorIds((prev) => {
      return { ...prev, [uuid]: replicator };
    });
    return uuid;
  } else {
    throw new Error("Can't create replicator - id is undefined");
  }
}

async function getCollections(
  collections: string[],
  scopeName: string,
  database: Database
): Promise<Collection[]> {
  const resultsCollections: Collection[] = [];
  collections.map(async (collectionName) => {
    const collection = await database.collection(scopeName, collectionName);
    resultsCollections.push(collection);
  });
  return resultsCollections;
}

function getReplicationType(replicatorType: string): ReplicatorType {
  switch (replicatorType) {
    case 'PUSH':
      return ReplicatorType.PUSH;
    case 'PULL':
      return ReplicatorType.PULL;
    case 'PUSH AND PULL':
      return ReplicatorType.PUSH_AND_PULL;
    default:
      return ReplicatorType.PUSH_AND_PULL;
  }
}
