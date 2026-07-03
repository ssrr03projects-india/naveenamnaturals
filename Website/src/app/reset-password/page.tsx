"use client";
import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuCosmeticThree from "@/components/Header/Menu/MenuCosmeticThree";
import Footer from "@/components/Footer/Footer";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import toast from "react-hot-toast";
import { customerApi } from "@/lib/api";
import AuthShell from "@/components/Auth/AuthShell";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidLink, setIsValidLink] = useState<boolean | null>(null); // null = loading
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");

  // Parse URL params on mount
  useEffect(() => {
    const tokenParam = searchParams.get("token");
    const emailParam = searchParams.get("email");

    if (tokenParam && emailParam) {
      setToken(tokenParam);
      setEmail(emailParam);
      setIsValidLink(true);
    } else {
      setIsValidLink(false);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !email) {
      toast.error("Invalid reset link. Please request a new password reset.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await customerApi.resetPassword({ token, email, password });
      setIsSuccess(true);
      toast.success("Password reset successfully!");

      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to reset password. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking URL params
  if (isValidLink === null) {
    return (
      <div className="py-8 text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-primary"></div>
        <p className="mt-4 text-secondary">Verifying reset link...</p>
      </div>
    );
  }

  // Invalid link
  if (!isValidLink) {
    return (
      <div className="py-4 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
            <Icon.Warning size={30} className="text-error" weight="fill" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-primary sm:text-xl">Invalid reset link</h3>
        <p className="mt-3 text-sm text-secondary sm:text-base">
          This link is invalid or expired. Request a new password reset link.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-secondary"
        >
          Request new link
        </Link>
      </div>
    );
  }

  return (
    <div className="py-4">
      {isSuccess ? (
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <Icon.CheckCircle size={32} className="text-success" weight="fill" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-primary sm:text-2xl">Password reset successful</h3>
          <p className="mt-3 text-sm text-secondary sm:text-base">
            Your password has been updated. You&apos;ll be redirected to login shortly.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-secondary"
          >
            Login now
          </Link>
        </div>
      ) : (
        <>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-primary">
                New password
              </label>
              <div className="relative">
                <input
                  className="h-12 w-full rounded-xl border border-line px-4 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/70 hover:text-primary"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <Icon.EyeSlash size={18} /> : <Icon.Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-primary">
                Confirm password
              </label>
              <div className="relative">
                <input
                  className="h-12 w-full rounded-xl border border-line px-4 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/70 hover:text-primary"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  {showConfirmPassword ? <Icon.EyeSlash size={18} /> : <Icon.Eye size={18} />}
                </button>
              </div>
            </div>
            {password && password.length < 6 && (
              <p className="text-sm text-error">Password must be at least 6 characters.</p>
            )}
            {confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-error">Passwords do not match.</p>
            )}
            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-white hover:bg-secondary disabled:opacity-60 sm:text-base"
              disabled={isLoading || password.length < 6 || password !== confirmPassword}
            >
              {isLoading ? "Resetting..." : "Reset password"}
            </button>
          </form>
          <p className="mt-5 border-t border-line pt-5 text-center text-sm text-secondary">
            Remember your password?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Back to login
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

const ResetPassword = () => {
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
        title="Set a new password"
        subtitle="Create a secure password for your account."
      >
        <Suspense fallback={<div className="py-6 text-sm text-secondary">Loading...</div>}>
          <ResetPasswordContent />
        </Suspense>
      </AuthShell>
      <Footer />
    </>
  );
};

export default ResetPassword;
