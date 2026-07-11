/**
 * Authentication utility module.
 * Provides placeholder methods for token management and session handling.
 * TODO: Implement full auth flow once backend JWT endpoints are ready.
 */

import { apiGet, apiPost } from "@/lib/api";
import type {
  AuthCredentials,
  AuthResponse,
  AuthTokens,
  OtpVerificationPayload,
  RegisterPayload,
  RegisterResponse,
  User,
} from "@/types/user";

const ACCESS_TOKEN_KEY = "beacon_access_token";
const REFRESH_TOKEN_KEY = "beacon_refresh_token";

/**
 * Persist authentication tokens to local storage.
 * TODO: Migrate to httpOnly cookies for production security.
 */
export function storeTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Clear stored authentication tokens.
 */
export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Retrieve the current access token.
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Retrieve the current refresh token.
 */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Check whether the user has a stored access token.
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

type ApiUser = Omit<User, "displayName" | "avatarUrl" | "createdAt" | "updatedAt" | "publicKey"> & {
  display_name: string;
  avatar_url: string | null;
  public_key: string | null;
  created_at: string;
  updated_at: string;
};

type ApiTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

type ApiAuthResponse = {
  user: ApiUser;
  tokens: ApiTokens;
};

type ApiRegisterResponse = {
  user: ApiUser;
  otp_required: boolean;
  message: string;
};

function mapUser(user: ApiUser): User {
  return {
    ...user,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    publicKey: user.public_key,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function mapTokens(tokens: ApiTokens): AuthTokens {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
  };
}

function mapAuthResponse(response: ApiAuthResponse): AuthResponse {
  return {
    user: mapUser(response.user),
    tokens: mapTokens(response.tokens),
  };
}

export async function login(credentials: AuthCredentials): Promise<AuthResponse> {
  const response = await apiPost<ApiAuthResponse>("/api/auth/login", credentials);
  const auth = mapAuthResponse(response);
  storeTokens(auth.tokens.accessToken, auth.tokens.refreshToken);
  return auth;
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const response = await apiPost<ApiRegisterResponse>("/api/auth/register", {
    email: payload.email,
    username: payload.username,
    password: payload.password,
    display_name: payload.displayName,
  });
  return {
    user: mapUser(response.user),
    otpRequired: response.otp_required,
    message: response.message,
  };
}

export async function verifyOtp(payload: OtpVerificationPayload): Promise<AuthResponse> {
  const response = await apiPost<ApiAuthResponse>("/api/auth/verify-otp", payload);
  const auth = mapAuthResponse(response);
  storeTokens(auth.tokens.accessToken, auth.tokens.refreshToken);
  return auth;
}

/**
 * Log out the current user and clear session state.
 * TODO: Call POST /api/auth/logout and invalidate refresh token.
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await apiPost("/api/auth/logout", { refresh_token: refreshToken }).catch(() => undefined);
  }
  clearTokens();
}

/**
 * Refresh the access token using the stored refresh token.
 * TODO: Call POST /api/auth/refresh once implemented.
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");
  const tokens = await apiPost<ApiTokens>("/api/auth/refresh", {
    refresh_token: refreshToken,
  });
  const mapped = mapTokens(tokens);
  storeTokens(mapped.accessToken, mapped.refreshToken);
  return mapped.accessToken;
}

/**
 * Fetch the currently authenticated user's profile.
 * TODO: Call GET /api/users/me once implemented.
 */
export async function getCurrentUser(): Promise<User> {
  return mapUser(await apiGet<ApiUser>("/api/auth/me"));
}
