"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import LogoutModal from "./LogoutModal";
import toast from "react-hot-toast";

interface UserSidebarProps {
  activeTab: string | undefined;
  setActiveTab: (tab: string) => void;
}

const UserSidebar: React.FC<UserSidebarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    toast.success("You have been logged out successfully.");
    setShowLogoutModal(false);
    router.push("/login");
  };

  return (
    <div className="user-infor bg-white lg:px-6 px-4 lg:py-6 py-4 rounded-lg border border-outline">
      <div className="heading flex items-center gap-3 pb-4 border-b border-outline">
        <div className="w-10 h-10 rounded-full bg-surface border border-black flex items-center justify-center">
          <span className="text-black text-lg font-semibold">
            {(user?.firstName || "U").charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <div className="name text-base font-semibold text-black">
            {user?.firstName || "User"}
          </div>
          <div className="mail text-sm text-secondary/60">{user?.email || ""}</div>
        </div>
      </div>
      <div className="menu-tab w-full mt-4 space-y-1">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === "dashboard"
              ? "bg-primary text-white"
              : "text-black hover:bg-surface"
            }`}
        >
          <Icon.HouseLine
            size={18}
            weight={activeTab === "dashboard" ? "fill" : "regular"}
          />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === "orders"
              ? "bg-primary text-white"
              : "text-black hover:bg-surface"
            }`}
        >
          <Icon.Package
            size={18}
            weight={activeTab === "orders" ? "fill" : "regular"}
          />
          Orders
        </button>
        <button
          onClick={() => setActiveTab("address")}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === "address"
              ? "bg-primary text-white"
              : "text-black hover:bg-surface"
            }`}
        >
          <Icon.MapPin
            size={18}
            weight={activeTab === "address" ? "fill" : "regular"}
          />
          Address
        </button>
        <button
          onClick={() => setActiveTab("setting")}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === "setting"
              ? "bg-primary text-white"
              : "text-black hover:bg-surface"
            }`}
        >
          <Icon.GearSix
            size={18}
            weight={activeTab === "setting" ? "fill" : "regular"}
          />
          Settings
        </button>
        <button
          onClick={handleLogoutClick}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium text-secondary hover:bg-error/10 hover:text-error transition-colors"
        >
          <Icon.SignOut size={18} />
          Logout
        </button>
      </div>
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
};

export default UserSidebar;
