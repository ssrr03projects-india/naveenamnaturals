"use client";
import React, { useState } from "react";
import Link from "next/link";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuCosmeticThree from "@/components/Header/Menu/MenuCosmeticThree";
import Footer from "@/components/Footer/Footer";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import toast from "react-hot-toast";
import { customerApi } from "@/lib/api";
import AuthShell from "@/components/Auth/AuthShell";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await customerApi.forgotPassword({ email });
      setEmailSent(true);
      toast.success("Password reset email sent! Please check your inbox.");
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to send reset email. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
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
        title="Forgot your password?"
        subtitle="Enter your email and we’ll send a secure reset link."
      >
        {emailSent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <Icon.CheckCircle size={28} className="text-success" weight="fill" />
            </div>
            <h3 className="text-lg font-bold text-primary sm:text-xl">Reset link sent</h3>
            <p className="mt-2 text-sm text-secondary sm:text-base">
              Please check your inbox. The password reset link expires in 1 hour.
            </p>
            <button
              onClick={() => {
                setEmailSent(false);
                setEmail("");
              }}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <Icon.ArrowLeft size={14} /> Try another email
            </button>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-white transition-colors hover:bg-secondary disabled:opacity-60 sm:text-base"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send reset link"}
            </button>

            <p className="border-t border-line pt-5 text-center text-sm text-secondary">
              Remember your password?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Back to login
              </Link>
            </p>
          </form>
        )}
      </AuthShell>
      <Footer />
    </>
  );
};

export default ForgotPassword;
