"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchCustomerProfile,
  updateCustomerProfile,
} from "@/store/slices/customerSlice";
import toast from "react-hot-toast";

const SettingsTab: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const { profile: customerProfile, loading: isLoading } = useAppSelector(
    (state) => state.customer,
  );
  const [saving, setSaving] = useState(false);

  // Fetch customer profile on mount
  useEffect(() => {
    if (!customerProfile) {
      dispatch(fetchCustomerProfile());
    }
  }, [dispatch, customerProfile]);

  // Combine firstName and lastName into fullname
  const fullname =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const fullnameValue = formData.get("fullname") as string;

      // Split fullname into firstName and lastName for backend
      const nameParts = fullnameValue.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const updateData: any = {
        firstName,
        lastName: lastName || null,
        phone: formData.get("phoneNumber") as string,
        email: formData.get("email") as string,
      };

      // Only include password fields if they're filled
      const currentPassword = formData.get("password") as string;
      const newPassword = formData.get("newPassword") as string;
      const confirmPassword = formData.get("confirmPassword") as string;

      if (currentPassword && newPassword && confirmPassword) {
        if (newPassword !== confirmPassword) {
          toast.error("New password and confirm password do not match");
          setSaving(false);
          return;
        }
        // Note: Backend should handle password update with current password verification
        updateData.password = newPassword;
      }

      await dispatch(updateCustomerProfile(updateData)).unwrap();
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="tab text-content w-full bg-white border border-gray-200 rounded-lg p-4 md:p-6">
        <div className="py-8 text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="tab text-content w-full bg-white border border-gray-200 rounded-lg p-4 md:p-6">
      <form onSubmit={handleSubmit}>
        <h6 className="text-lg font-semibold text-gray-900 pb-4 border-b border-gray-200 mb-6">
          Information
        </h6>
        <div className="grid sm:grid-cols-2 gap-4 gap-y-5 mt-5">
          <div className="fullname sm:col-span-2">
            <label
              htmlFor="fullname"
              className="caption1 capitalize font-medium"
            >
              Full Name <span className="text-red">*</span>
            </label>
            <input
              className="w-full border border-black/20 rounded-xl px-4 py-3 mt-2 placeholder-secondary/50 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white"
              id="fullname"
              name="fullname"
              type="text"
              defaultValue={fullname}
              placeholder="Full name"
              required
            />
          </div>
          <div className="phone-number">
            <label
              htmlFor="phoneNumber"
              className="caption1 capitalize font-medium"
            >
              Phone Number <span className="text-red">*</span>
            </label>
            <input
              className="w-full border border-black/20 rounded-xl px-4 py-3 mt-2 placeholder-secondary/50 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white"
              id="phoneNumber"
              name="phoneNumber"
              type="text"
              defaultValue={user?.phone || ""}
              placeholder="Phone number"
              required
            />
          </div>
          <div className="email">
            <label htmlFor="email" className="caption1 capitalize font-medium">
              Email Address <span className="text-red">*</span>
            </label>
            <input
              className="w-full border border-black/20 rounded-xl px-4 py-3 mt-2 placeholder-secondary/50 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white"
              id="email"
              name="email"
              type="email"
              defaultValue={user?.email || ""}
              placeholder="Email address"
              required
            />
          </div>
        </div>
        <h6 className="text-lg font-semibold text-gray-900 pb-4 lg:mt-10 mt-6 border-b border-gray-200 mb-6">
          Change Password
        </h6>
        <div className="pass mt-5">
          <label htmlFor="password" className="caption1 font-medium">
            Current password
          </label>
          <input
            className="w-full border border-black/20 rounded-xl px-4 py-3 mt-2 placeholder-secondary/50 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white"
            id="password"
            name="password"
            type="password"
            placeholder="Current Password"
          />
        </div>
        <div className="new-pass mt-5">
          <label htmlFor="newPassword" className="caption1 font-medium">
            New password
          </label>
          <input
            className="w-full border border-black/20 rounded-xl px-4 py-3 mt-2 placeholder-secondary/50 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white"
            id="newPassword"
            name="newPassword"
            type="password"
            placeholder="New Password"
          />
        </div>
        <div className="confirm-pass mt-5">
          <label htmlFor="confirmPassword" className="caption1 font-medium">
            Confirm new password
          </label>
          <input
            className="w-full border border-black/20 rounded-xl px-4 py-3 mt-2 placeholder-secondary/50 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
          />
        </div>
        <div className="mt-6">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-black hover:bg-black/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsTab;
