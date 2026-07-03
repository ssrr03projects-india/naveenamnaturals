"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuCosmeticThree from "@/components/Header/Menu/MenuCosmeticThree";
import Footer from "@/components/Footer/Footer";
import { useAuth } from "@/context/AuthContext";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import toast from "react-hot-toast";
import AuthShell from "@/components/Auth/AuthShell";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: true, // Default to true as per user's preference for 30-day session
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectPath =
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/my-account";
  const registerHref =
    redirectPath !== "/my-account"
      ? `/register?redirect=${encodeURIComponent(redirectPath)}`
      : "/register";

  // Check for session expired message
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionExpired = sessionStorage.getItem("session_expired");
      if (sessionExpired === "true") {
        sessionStorage.removeItem("session_expired");
        toast.error("Your session has expired. Please login again.", {
          duration: 5000,
          icon: "🔒",
        });
      }
    }
  }, []);

  // Redirect if already authenticated (only after loading is complete)
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(redirectPath);
    }
  }, [isAuthenticated, loading, router, redirectPath]);

  // Show password toggle
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.remember,
      });
      toast.success("Login successful! Welcome back.");
      router.push(redirectPath);
    } catch (err: any) {
      const errorMessage = err.message || "Login failed. Please try again.";
      setError(errorMessage);

      // Handle rate limit
      if (err.retryAfter) {
        setIsRateLimited(true);
        const minutes = Math.ceil(err.retryAfter / 60);
        toast.error(
          `Too many attempts. Try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
          {
            duration: 6000,
            icon: "🚫",
          },
        );
      } else if (
        err.remainingAttempts !== undefined &&
        err.remainingAttempts > 0
      ) {
        toast.error(
          `${errorMessage}\n${err.remainingAttempts} attempt${err.remainingAttempts > 1 ? "s" : ""} remaining`,
          {
            duration: 4000,
            icon: "⚠️",
          },
        );
      } else if (err.remainingAttempts === 0) {
        setIsRateLimited(true);
        toast.error("No attempts remaining. Please try again later.", {
          duration: 6000,
          icon: "🚫",
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <>
      <TopNavOne
        props="style-one bg-primary"
        slogan="Welcome to Naveenam Naturals Store"
      />
      <div id="header" className="relative w-full">
        <MenuCosmeticThree />
      </div>
      <AuthShell
        title="Sign in to your account"
        subtitle="Continue to checkout faster, track orders, and manage saved details."
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-error/20 bg-error/10 p-3 text-sm text-error">
              <Icon.WarningCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-primary" htmlFor="email">
              Email address
            </label>
            <div className="relative">
              <Icon.EnvelopeSimple
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
              />
              <input
                className="h-12 w-full rounded-xl border border-line pl-10 pr-3 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-primary" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Icon.LockKey
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
              />
              <input
                className="h-12 w-full rounded-xl border border-line pl-10 pr-10 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/70 hover:text-primary"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <Icon.EyeSlash size={18} /> : <Icon.Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-secondary">
              <input
                type="checkbox"
                name="remember"
                id="remember"
                checked={formData.remember}
                onChange={handleChange}
                className="h-4 w-4 rounded border-line text-primary"
              />
              Keep me signed in
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-white transition-colors hover:bg-secondary disabled:opacity-60 sm:text-base"
            disabled={isLoading || isRateLimited}
          >
            {isLoading ? "Signing in..." : isRateLimited ? "Too many attempts" : "Sign in"}
          </button>

          <p className="border-t border-line pt-5 text-center text-sm text-secondary">
            Don&apos;t have an account?{" "}
            <Link href={registerHref} className="font-semibold text-primary hover:underline">
              Create account
            </Link>
          </p>
        </form>
      </AuthShell>
      <Footer />
    </>
  );
};

export default Login;
