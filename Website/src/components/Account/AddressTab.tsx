"use client";
import React, { useState, useEffect } from "react";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchCustomerProfile,
  updateCustomerProfile,
} from "@/store/slices/customerSlice";
import toast from "react-hot-toast";

interface Address {
  fullname?: string;
  email?: string;
  phonenumber?: string;
  street?: string;
  state?: string; // State code (e.g., "MH" for Maharashtra)
  city?: string;
  pincode?: string;
  country?: string; // Country code (e.g., "IN" for India)
}

const AddressTab: React.FC = () => {
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState<Address>({
    fullname: "",
    email: "",
    phonenumber: "",
    street: "",
    state: "",
    city: "",
    pincode: "",
    country: "IN", // Default to India
  });

  const dispatch = useAppDispatch();
  const { profile: customer, loading: isLoading } = useAppSelector(
    (state) => state.customer,
  );

  // Fetch customer profile on mount
  useEffect(() => {
    if (!customer) {
      dispatch(fetchCustomerProfile());
    }
  }, [dispatch, customer]);

  // Update form when customer data is loaded
  useEffect(() => {
    if (customer) {
      if (customer.address) {
        // Handle both string and object formats
        const addressData =
          typeof customer.address === "string"
            ? JSON.parse(customer.address)
            : customer.address;

        // Combine firstName and lastName into fullname, or use name field
        const fullname =
          addressData.fullname ||
          (addressData.firstName && addressData.lastName
            ? `${addressData.firstName} ${addressData.lastName}`
            : addressData.firstName ||
              addressData.lastName ||
              addressData.name ||
              "");

        setAddress({
          fullname: fullname,
          street: addressData.street || addressData.address || "",
          city: "",
          state: "",
          pincode: addressData.pincode || addressData.postalCode || "",
          country: "IN",
          phonenumber:
            addressData.phonenumber ||
            addressData.phone ||
            customer.phone ||
            "",
          email: addressData.email || customer.email || "",
        });
      } else {
        // If no shipping address, use customer data
        const fullname =
          customer.firstName && customer.lastName
            ? `${customer.firstName} ${customer.lastName}`
            : customer.firstName || "";

        setAddress({
          fullname: fullname,
          phonenumber: customer.phone || "",
          email: customer.email || "",
          street: "",
          state: "",
          city: "",
          pincode: "",
          country: "IN",
        });
      }
    }
  }, [customer]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setAddress((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      const addressPayload = {
        fullname: address.fullname,
        street: address.street,
        city: "",
        state: "",
        pincode: address.pincode,
        country: "India",
        countryCode: "IN",
        stateCode: "",
        phonenumber: address.phonenumber,
        email: address.email,
      };

      await dispatch(
        updateCustomerProfile({
          address: addressPayload,
        }),
      ).unwrap();
    } catch (error) {
      // Error is handled by the mutation's onError
      console.error("Failed to update address:", error);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="tab_address text-content w-full bg-white border border-gray-200 rounded-lg p-4 md:p-6">
        <div className="py-8 text-center text-gray-500">Loading address...</div>
      </div>
    );
  }

  return (
    <div className="tab_address text-content w-full bg-white border border-gray-200 rounded-lg p-4 md:p-6">
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon.Truck size={20} className="text-purple-600" />
            <h6 className="text-lg font-semibold text-gray-900">Address</h6>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 md:gap-4 gap-y-4 md:gap-y-5">
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
              type="text"
              value={address.fullname}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="email">
            <label htmlFor="email" className="caption1 capitalize font-medium">
              Email <span className="text-red">*</span>
            </label>
            <input
              className="w-full border border-black/20 rounded-xl px-4 py-3 mt-2 placeholder-secondary/50 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white"
              id="email"
              type="email"
              value={address.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="phonenumber">
            <label
              htmlFor="phonenumber"
              className="caption1 capitalize font-medium"
            >
              Phone Number <span className="text-red">*</span>
            </label>
            <input
              className="w-full border border-black/20 rounded-xl px-4 py-3 mt-2 placeholder-secondary/50 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white"
              id="phonenumber"
              type="text"
              value={address.phonenumber}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="street sm:col-span-2">
            <label htmlFor="street" className="caption1 capitalize font-medium">
              Address (House No, Building, Street, Area){" "}
              <span className="text-red">*</span>
            </label>
            <textarea
              className="w-full border border-black/20 rounded-xl px-4 py-3 mt-2 placeholder-secondary/50 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white"
              id="street"
              rows={3}
              value={address.street}
              onChange={(e) =>
                setAddress({ ...address, street: e.target.value })
              }
              required
            />
          </div>

          <div className="pincode">
            <label
              htmlFor="pincode"
              className="caption1 capitalize font-medium"
            >
              Pincode <span className="text-red">*</span>
            </label>
            <input
              className="w-full border border-black/20 rounded-xl px-4 py-3 mt-2 placeholder-secondary/50 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white"
              id="pincode"
              type="text"
              value={address.pincode}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>
        <div className="mt-6">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-black hover:bg-black/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Update Address"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddressTab;
