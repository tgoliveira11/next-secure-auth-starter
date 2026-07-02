import { apiClient } from "./client";

export type AccountAuthStatus = {
  email: string;
  authProvider: string;
  hasPassword: boolean;
  emailVerified: boolean;
  canChangePassword: boolean;
};

export const accountAuthApi = {
  getStatus: () => apiClient.get<AccountAuthStatus>("/api/account/auth-status"),
  resendVerification: (payload?: { email?: string }) =>
    apiClient.post<{ message: string }>("/api/auth/verify-email/resend", payload ?? {}),
  confirmVerification: (token: string) =>
    apiClient.post<{ verified: boolean; email: string }>("/api/auth/verify-email/confirm", {
      token,
    }),
  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>("/api/auth/forgot-password", { email }),
  resetPassword: (token: string, newPassword: string) =>
    apiClient.post<{ success: boolean }>("/api/auth/reset-password", {
      token,
      newPassword,
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post<{ success: boolean }>("/api/account/change-password", {
      currentPassword,
      newPassword,
    }),
  requestMagicLink: (email: string) =>
    apiClient.post<{ message: string }>("/api/auth/magic-link/request", { email }),
};