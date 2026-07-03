"use client";

import React from "react";
import * as Icon from "@phosphor-icons/react/dist/ssr";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  sideTitle?: string;
  sideDescription?: string;
}

const defaultPoints = [
  "Secure checkout and faster reorders",
  "Track your orders in one dashboard",
  "Save addresses and manage profile",
];

export default function AuthShell({
  title,
  subtitle,
  children,
  sideTitle = "Welcome to Naveenam Naturals Store",
  sideDescription = "Manage your account and shopping journey with a clean, secure experience.",
}: AuthShellProps) {
  return (
    <section className="bg-surface py-8 sm:py-12 md:py-16">
      <div className="container">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <aside className="order-2 rounded-3xl border border-line bg-white p-5 sm:p-8 lg:order-1 lg:col-span-5">
            {/* <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              E-commerce Account
            </div> */}
            <h2 className="mt-4 text-xl font-bold text-primary sm:text-2xl lg:text-3xl">
              {sideTitle}
            </h2>
            <p className="mt-3 text-xs leading-5 text-secondary sm:text-sm md:text-base">
              {sideDescription}
            </p>
            <ul className="mt-6 space-y-3">
              {defaultPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-xs text-secondary sm:text-sm"
                >
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                    <Icon.Check size={12} weight="bold" />
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </aside>

          <div className="order-1 rounded-3xl border border-line bg-white p-4 shadow-sm sm:p-8 lg:order-2 lg:col-span-7">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-primary sm:text-2xl lg:text-3xl">
                {title}
              </h1>
              <p className="mt-2 text-xs text-secondary sm:text-sm md:text-base">
                {subtitle}
              </p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
