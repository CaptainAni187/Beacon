/**
 * User-related type definitions for the Beacon messaging platform.
 */

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  status: UserStatus;
  bio: string | null;
  /** Base64 SPKI-encoded ECDH (P-256) public key, used to encrypt message keys for this user. */
  publicKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UserStatus = "online" | "offline" | "away" | "busy";

export interface UserProfile extends User {
  phoneNumber: string | null;
  lastSeenAt: string | null;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload extends AuthCredentials {
  username: string;
  displayName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  user: User;
  otpRequired: boolean;
  message: string;
}

export interface OtpVerificationPayload {
  email: string;
  code: string;
}
