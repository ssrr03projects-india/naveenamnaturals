"use client";

import React, { useState } from "react";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import toast from "react-hot-toast";

// Helper function to format delivery date range
const formatDeliveryDateRange = (estimatedDays: number): string => {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + estimatedDays);

  const endDate = new Date(today);
  endDate.setDate(today.getDate() + estimatedDays + 2);

  const formatDate = (date: Date): string => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayName = days[date.getDay()];
    const month = months[date.getMonth()];
    const day = date.getDate();

    // Add ordinal suffix (st, nd, rd, th)
    const getOrdinalSuffix = (n: number): string => {
      if (n > 3 && n < 21) return 'th';
      switch (n % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    return `${dayName}, ${month} ${day}${getOrdinalSuffix(day)}`;
  };

  const startFormatted = formatDate(startDate);
  const endFormatted = formatDate(endDate);

  return `You can expect delivery between ${startFormatted} to ${endFormatted}`;
};

interface ShippingCheckerProps {
  productId?: string;
  className?: string;
}

interface ShippingInfo {
  serviceable: boolean;
  estimatedDays?: number;
  message?: string;
}

const ShippingChecker: React.FC<ShippingCheckerProps> = ({
  productId,
  className = "",
}) => {
  const [pincode, setPincode] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  const validatePincode = (pin: string): boolean => {
    // Indian pincode validation (6 digits)
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    return pincodeRegex.test(pin);
  };

  const handleCheckShipping = async () => {
    const trimmedPincode = pincode.trim();

    if (!trimmedPincode) {
      toast.error("Please enter a pincode");
      return;
    }

    if (!validatePincode(trimmedPincode)) {
      toast.error("Please enter a valid 6-digit pincode");
      return;
    }

    setIsChecking(true);
    setHasChecked(false);

    try {
      const response = await fetch(
        `/api/shipping/check?pincode=${trimmedPincode}${productId ? `&productId=${productId}` : ""}`
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setShippingInfo(data.data);
        setHasChecked(true);

        if (data.data.serviceable) {
          const days = data.data.estimatedDays || 3;
          const deliveryMessage = formatDeliveryDateRange(days);
          toast.success(deliveryMessage, { duration: 5000 });
        } else {
          toast.error(data.data.message || "Shipping not available to this pincode", {
            duration: 4000,
          });
        }
      } else {
        throw new Error(data.message || "Failed to check shipping");
      }
    } catch (error: any) {
      console.error("Shipping check error:", error);
      toast.error(error.message || "Failed to check shipping availability");
      setShippingInfo({
        serviceable: false,
        message: "Unable to verify shipping. Please try again later.",
      });
      setHasChecked(true);
    } finally {
      setIsChecking(false);
    }
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPincode(value);
    if (hasChecked) {
      setHasChecked(false);
      setShippingInfo(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isChecking) {
      handleCheckShipping();
    }
  };

  return (
    <div className={`bg-white border border-gray rounded-xl p-4 sm:p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon.Truck size={24} className="text-primary" />
        <h3 className="text-base sm:text-lg font-semibold text-black">
          Check Shipping Availability
        </h3>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={pincode}
              onChange={handlePincodeChange}
              onKeyPress={handleKeyPress}
              placeholder="Enter pincode"
              maxLength={6}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
              disabled={isChecking}
            />
          </div>
          <button
            onClick={handleCheckShipping}
            disabled={isChecking || !pincode.trim()}
            className="px-4 sm:px-6 py-2 sm:py-2.5 bg-success text-white rounded-xl font-medium hover:bg-success/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base whitespace-nowrap"
          >
            {isChecking ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                Checking...
              </span>
            ) : (
              "Check"
            )}
          </button>
        </div>

        {hasChecked && shippingInfo && (
          <div
            className={`p-3 sm:p-4 rounded-xl ${shippingInfo.serviceable
              ? "bg-green border border-green"
              : "bg-red border border-red"
              }`}
          >
            <div className="flex items-start gap-2">
              {shippingInfo.serviceable ? (
                <Icon.CheckCircle size={20} className="text-green flex-shrink-0 mt-0.5" weight="fill" />
              ) : (
                <Icon.XCircle size={20} className="text-red flex-shrink-0 mt-0.5" weight="fill" />
              )}
              <div className="flex-1">
                {shippingInfo.serviceable ? (
                  shippingInfo.estimatedDays ? (
                    <p className="text-[14px] sm:text-base font-medium text-green leading-relaxed">
                      {formatDeliveryDateRange(shippingInfo.estimatedDays)}
                    </p>
                  ) : (
                    <p className="text-[14px] sm:text-base font-medium text-green">
                      Shipping Available
                    </p>
                  )
                ) : (
                  <p className="text-[14px] sm:text-base font-medium text-red">
                    {shippingInfo.message || "Shipping Not Available"}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!hasChecked && !isChecking && (
          <p className="text-[14px] font-medium text-gray">
            Enter your pincode to check delivery availability and estimated delivery time
          </p>
        )}
      </div>
    </div>
  );
};

export default ShippingChecker;
