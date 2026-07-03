"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";

const PageLoader: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastStartRef = useRef<number>(0);

  // Helper to stop the loader
  const stopLoader = React.useCallback(() => {
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
    if (progressRef.current) clearInterval(progressRef.current);

    setProgress((prev) => (prev > 0 ? 100 : 0));

    // Keep completion snappy.
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 120);
  }, []);

  // Listen for custom navigation events (Global triggers)
  useEffect(() => {
    const handleStart = () => {
      const now = Date.now();
      if (now - lastStartRef.current < 120) {
        return;
      }
      lastStartRef.current = now;

      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);

      setLoading(true);
      setProgress(5);

      // Safety: force stop after 6s so loader never sticks
      safetyTimeoutRef.current = setTimeout(() => {
        safetyTimeoutRef.current = null;
        stopLoader();
      }, 3500);

      progressRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return 90;
          return prev + (prev < 50 ? 5 : 2);
        });
      }, 100);
    };

    window.addEventListener("navigation-start", handleStart);
    window.addEventListener("navigation-end", stopLoader);

    return () => {
      window.removeEventListener("navigation-start", handleStart);
      window.removeEventListener("navigation-end", stopLoader);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, [stopLoader]);

  // Automatically finish loading when the route actually changes
  useEffect(() => {
    stopLoader();
  }, [pathname, searchParams, stopLoader]);

  // Ensure loader clears when the window has finished loading (catches initial load if navigation-end never fired)
  useEffect(() => {
    const onLoad = () => stopLoader();
    if (document.readyState === "complete") {
      onLoad();
      return () => {};
    }
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, [stopLoader]);

  // Don't render anything if not active
  if (!loading && progress === 0) return null;

  return (
    <>
      {/* Transition mask to avoid background flash between route paints */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--surface)",
          opacity: loading ? 0.92 : 0,
          transition: "opacity 120ms ease",
          pointerEvents: "none",
          zIndex: 99998,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: loading
              ? "translate(-50%, -50%) scale(1)"
              : "translate(-50%, -50%) scale(0.98)",
            opacity: loading ? 1 : 0,
            transition: "opacity 120ms ease, transform 120ms ease",
          }}
        >
          <Image
            src="/images/NaveenamNaturalsLogo.png"
            alt="Naveenam Naturals"
            width={180}
            height={56}
            priority
          />
        </div>
      </div>

      {/* Top progress bar - Always visible during loading */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "3px",
          background: "color-mix(in srgb, var(--secondary) 5%, transparent)",
          zIndex: 99999,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, var(--red), var(--accent))",
            transition: "width 0.2s ease",
            boxShadow: "0 0 10px color-mix(in srgb, var(--red) 50%, transparent)",
          }}
        />
      </div>

    </>
  );
};

export default PageLoader;
