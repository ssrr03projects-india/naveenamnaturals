"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  SquaresFour,
  Handbag,
  User,
} from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const BottomNav = () => {
  const pathname = usePathname();
  const { cartState } = useCart();
  const { isAuthenticated } = useAuth();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const navItems = [
    {
      label: "Home",
      icon: House,
      path: "/",
    },
    {
      label: "Shop",
      icon: SquaresFour,
      path: "/product",
    },
    {
      label: "Cart",
      icon: Handbag,
      path: "/cart",
      badge: true,
    },
    {
      label: "Account",
      icon: User,
      path: isAuthenticated ? "/my-account" : "/login",
    },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 z-[100] w-full">
      <div className="bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] px-6 py-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] flex items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.path ||
            (item.path !== "/" && pathname.startsWith(item.path));

          return (
            <Link
              key={item.label}
              href={item.path}
              className={`flex flex-col items-center gap-1 group relative transition-all duration-300 ${
                isActive
                  ? "text-primary scale-105"
                  : "text-secondary/60 hover:text-black"
              }`}
            >
              <div className="relative">
                <Icon
                  size={26}
                  weight={isActive ? "fill" : "regular"}
                  className="transition-all duration-300"
                />
                {item.badge && hasMounted && cartState.cartArray.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full border-2 border-white">
                    {cartState.cartArray.length}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider transition-all duration-300 ${isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full shadow-[0_2px_8px_rgba(var(--primary-rgb),0.4)]" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
