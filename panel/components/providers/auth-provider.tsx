"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS, getAuthHeaders } from "@/lib/api";

type User = {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  user: User | null;
  token: string | null;
  loading: boolean;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  // Verify token and restore session on mount
  React.useEffect(() => {
    const verifySession = async () => {
      const authToken = localStorage.getItem("auth_token");
      const userData = localStorage.getItem("user_data");

      if (!authToken || !userData) {
        setLoading(false);
        return;
      }

      try {
        // Verify token with backend
        const response = await fetch(API_ENDPOINTS.ADMIN.VERIFY, {
          method: "GET",
          headers: getAuthHeaders(authToken),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setIsAuthenticated(true);
            setUser(result.data.admin);
            setToken(authToken);
            // Update stored user data
            localStorage.setItem("user_data", JSON.stringify(result.data.admin));
          } else {
            // Token invalid, clear storage
            clearAuth();
          }
        } else {
          // Token invalid, clear storage
          clearAuth();
        }
      } catch (error) {
        console.error("Token verification error:", error);
        // On error, try to use stored data (offline mode)
        try {
          const parsedUser = JSON.parse(userData);
          setIsAuthenticated(true);
          setUser(parsedUser);
          setToken(authToken);
        } catch (parseError) {
          clearAuth();
        }
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const clearAuth = () => {
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_status");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
  };

  const login = React.useCallback(
    async (username: string, password: string): Promise<void> => {
      if (!username || !password) {
        throw new Error("Username and password are required");
      }

      try {
        const response = await fetch(API_ENDPOINTS.ADMIN.LOGIN, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        });

        const result = await response.json();

        // Get remaining attempts from response headers (fallback)
        const rateLimitRemaining = response.headers.get("ratelimit-remaining");
        const rateLimitRemainingNum = rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : undefined;

        // Handle rate limiting (429 status)
        if (response.status === 429) {
          const errorMessage = result.message || "Too many login attempts. Please try again later.";
          const retryAfter = result.retryAfter || 900; // Default to 15 minutes in seconds
          const minutes = Math.ceil(retryAfter / 60);
          const error = new Error(`${errorMessage} (Wait ${minutes} minute${minutes > 1 ? 's' : ''})`);
          (error as any).remainingAttempts = 0;
          (error as any).maxAttempts = 8;
          throw error;
        }

        if (!response.ok || !result.success) {
          const error = new Error(result.message || "Login failed");
          // Include remaining attempts info if available (from response body or headers)
          if (result.remainingAttempts !== undefined) {
            (error as any).remainingAttempts = result.remainingAttempts;
            (error as any).maxAttempts = result.maxAttempts || 8;
          } else if (rateLimitRemainingNum !== undefined && rateLimitRemainingNum >= 0) {
            (error as any).remainingAttempts = rateLimitRemainingNum;
            (error as any).maxAttempts = 8;
          }
          throw error;
        }

        const { token: authToken, admin: adminData } = result.data;

        // Store authentication data
        setIsAuthenticated(true);
        setUser(adminData);
        setToken(authToken);
        localStorage.setItem("auth_status", "authenticated");
        localStorage.setItem("auth_token", authToken);
        localStorage.setItem("user_data", JSON.stringify(adminData));

        router.push("/dashboard");
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    [router]
  );

  const logout = React.useCallback(() => {
    clearAuth();
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, login, logout, user, token, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
