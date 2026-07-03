"use client";

import Link from "next/link";
import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-black">Something went wrong</h1>
      <p className="mt-3 text-secondary">
        We could not load this page right now. Please try again.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-primary px-5 py-3 font-semibold text-white transition-colors hover:bg-secondary"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-outline px-5 py-3 font-semibold text-secondary transition-colors hover:bg-surface"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
