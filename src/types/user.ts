/**
 * User and authentication type definitions
 */

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  phone?: string;
  location?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  location?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserCreate {
  email: string;
  password: string;
  name: string;
  phone?: string;
  location?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Session {
  userId: string;
  refreshToken: string;
  createdAt: string;
  expiresAt: string;
}

export interface RefreshTokenRecord {
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
}

export interface EmailMapping {
  userId: string;
  email: string;
  createdAt: string;
}
