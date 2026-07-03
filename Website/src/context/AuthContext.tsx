"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from "react";
import { customerApi } from "@/lib/api";

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: {
    name?: string;
    address?: string;
    apartment?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    phone?: string;
  };
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  isActive?: boolean;
  totalOrders?: number;
  totalSpent?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: Customer | null;
  token: string | null;
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) => Promise<void>;
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    address?: {
      name?: string;
      address?: string;
      apartment?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
      phone?: string;
      email?: string;
    };
    dateOfBirth?: string;
    gender?: "male" | "female" | "other";
  }) => Promise<void>;
  logout: () => void;
  refreshAuth: () => void;
  updateProfile: (data: Partial<Customer>) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<Customer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasCheckedAuth = useRef(false);

  // Sync from localStorage on mount (Client-side only)
  // No localStorage sync - rely on httpOnly cookies and validation check
  // This prevents infinite loops where localStorage says "authenticated" but backend says "401"
  useEffect(() => {
    // Only verify auth on mount
    if (!hasCheckedAuth.current) {
      hasCheckedAuth.current = true;
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    if (typeof window === "undefined") return;

    try {
      const response = await customerApi.getProfile();
      if (response.data.success) {
        const userData = response.data.data;
        setUser(userData);
        setIsAuthenticated(true);
        setUser(userData);
        setIsAuthenticated(true);
        // Do not store in localStorage
        setToken(null);
      } else {
        clearAuth();
      }
    } catch (error: any) {
      // If we have a network error but were previously authenticated, don't immediately logout
      // Unless it's a 401/403 which means the token specifically expired
      if (error.response?.status === 401 || error.response?.status === 403) {
        clearAuth();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAuth = () => {
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    // Tokens are stored in httpOnly cookies, no need to clear localStorage
  };

  // Check auth only once on mount
  useEffect(() => {
    if (!hasCheckedAuth.current) {
      hasCheckedAuth.current = true;
      checkAuthStatus();
    }
  }, [checkAuthStatus]);

  const refreshAuth = () => {
    checkAuthStatus();
  };

  const login = async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
    try {
      const response = await customerApi.login(credentials);
      if (response.data.success) {
        const { customer } = response.data.data;
        // Token is stored in httpOnly cookie by the backend
        setUser(customer);
        setIsAuthenticated(true);
        // Do not store sensitive auth state in localStorage
        setToken(null); // Token is in httpOnly cookie, not in state
      } else {
        throw new Error(response.data.message || "Login failed");
      }
    } catch (error: any) {
      const responseData = error.response?.data;
      const err = new Error(responseData?.message || error.message || "Login failed") as any;
      // Pass rate limit info if available
      if (responseData?.retryAfter) {
        err.retryAfter = responseData.retryAfter;
      }
      if (responseData?.remainingAttempts !== undefined) {
        err.remainingAttempts = responseData.remainingAttempts;
      }
      throw err;
    }
  };

  const register = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    address?: {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
      phone?: string;
      email?: string;
    };
    dateOfBirth?: string;
    gender?: "male" | "female" | "other";
  }) => {
    try {
      const response = await customerApi.register(data);
      if (response.data.success) {
        const { customer } = response.data.data;
        setUser(customer);
        setIsAuthenticated(true);
        // Do not store in localStorage
        setToken(null); // Token is in httpOnly cookie, not in state
      } else {
        throw new Error(response.data.message || "Registration failed");
      }
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const err = new Error(error.response?.data?.message || "Validation failed") as any;
        err.errors = error.response.data.errors;
        throw err;
      }
      throw new Error(error.response?.data?.message || error.message || "Registration failed");
    }
  };

  const updateProfile = async (data: Partial<Customer>) => {
    try {
      const response = await customerApi.updateProfile(data);
      if (response.data.success) {
        setUser(response.data.data);
      } else {
        throw new Error(response.data.message || "Profile update failed");
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || "Profile update failed");
    }
  };

  const logout = async () => {
    try {
      await customerApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      clearAuth();
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      token,
      login,
      register,
      logout,
      refreshAuth,
      updateProfile,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
