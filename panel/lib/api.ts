
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005";

export const API_ENDPOINTS = {
  // Admin Auth endpoints
  ADMIN: {
    LOGIN: `${API_BASE_URL}/api/admin/login`,
    VERIFY: `${API_BASE_URL}/api/admin/verify`,
    PROFILE: `${API_BASE_URL}/api/admin/profile`,
    UPDATE_PROFILE: `${API_BASE_URL}/api/admin/profile`,
    CHANGE_PASSWORD: `${API_BASE_URL}/api/admin/change-password`,
  },
  // Dashboard endpoints
  DASHBOARD: {
    STATS: `${API_BASE_URL}/api/dashboard/stats`,
  },
} as const;


/**
 * Get the full API URL for an endpoint
 */
export function getApiUrl(endpoint: string): string {
  return endpoint;
}


/**
 * Get authorization header with bearer token
 */
export function getAuthHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}
