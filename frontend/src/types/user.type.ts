type User = {
  id: string;
  displayName?: string | null;
  username: string;
  email: string;
  isAdmin: boolean;
  isActivated: boolean;
  isLdap: boolean;
  totpVerified: boolean;
  hasPassword: boolean;
  shareSizeLimit?: string;
  storageQuotaLimit?: string;
  allowShare?: boolean;
  allowCreateReverseShares?: boolean;
  maxShares?: number | null;
  maxReverseShares?: number | null;
};

export type CreateUser = {
  displayName?: string | null;
  username: string;
  email: string;
  password?: string;
  isAdmin?: boolean;
  shareSizeLimit?: string | null;
  storageQuotaLimit?: string | null;
  allowShare?: boolean;
  allowCreateReverseShares?: boolean;
  maxShares?: number | null;
  maxReverseShares?: number | null;
};

export type UpdateUser = {
  displayName?: string | null;
  username?: string;
  email?: string;
  password?: string;
  isAdmin?: boolean;
  isActivated?: boolean;
  shareSizeLimit?: string | null;
  storageQuotaLimit?: string | null;
  allowShare?: boolean;
  allowCreateReverseShares?: boolean;
  maxShares?: number | null;
  maxReverseShares?: number | null;
};

export type UpdateCurrentUser = {
  displayName?: string | null;
  username?: string;
  email?: string;
};

export type CurrentUser = User & {};

export type UserHook = {
  user: CurrentUser | null;
  refreshUser: () => Promise<CurrentUser | null>;
};

export default User;
