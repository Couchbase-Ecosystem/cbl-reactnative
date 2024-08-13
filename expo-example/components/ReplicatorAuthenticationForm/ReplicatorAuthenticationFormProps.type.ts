export type ReplicatorAuthenticationFormProps = {
  selectedAuthenticationType: string;
  setSelectedAuthenticationType: (arg: string) => void;
  username: string;
  setUsername: (arg: string) => void;
  password: string;
  setPassword: (arg: string) => void;
  sessionId: string;
  setSessionId: (arg: string) => void;
  cookieName: string;
  setCookieName: (arg: string) => void;
};
