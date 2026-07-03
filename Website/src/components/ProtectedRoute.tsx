'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Set session expired flag if user was likely logged in before
      // (this handles cases where auth check fails on page load)
      if (typeof window !== "undefined") {
        const wasLoggedIn = sessionStorage.getItem("was_logged_in");
        if (wasLoggedIn === "true") {
          sessionStorage.setItem("session_expired", "true");
          sessionStorage.removeItem("was_logged_in");
        }
      }
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  // Track that user is logged in (for detecting session expiry later)
  useEffect(() => {
    if (isAuthenticated && typeof window !== "undefined") {
      sessionStorage.setItem("was_logged_in", "true");
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-success"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

