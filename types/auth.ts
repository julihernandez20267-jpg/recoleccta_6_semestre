export type UserRole = 'admin' | 'guardian' | 'user';

export interface AuthUser {
  uid: number;
  email: string;
  role: UserRole;
  displayName?: string;
  photoURL?: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt?: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: AuthUser;
    token?: string;
    expiresAt?: number;
    temporaryPassword?: string;
  };
}

export interface PasswordRecoveryResponse {
  success: boolean;
  message: string;
  data?: {
    temporaryPassword?: string;
  };
}
