"use client";

import React, {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import axios from "axios";
import useSWR from "swr";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuCosmeticThree from "@/components/Header/Menu/MenuCosmeticThree";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Country, State } from "country-state-city";
import { getMaxStock } from "@/lib/stock-utils";
import CouponList from "@/components/Checkout/CouponList";

const ORDER_SUCCESS_STORAGE_KEY = "nn_last_order_success";
type MissingGstLookupItem = {
  cartId: string;
  productId: string | number;
  variantId?: string | number | null;
  selectedSize?: string | null;
};

const DEFAULT_SHIPPING_WEIGHT_KG = 0.5;
const DEFAULT_PACKAGING_WEIGHT_KG = 0.1;
const PER_UNIT_PACKAGING_WEIGHT_KG = 0.03;
const MAX_PACKAGING_WEIGHT_KG = 0.4;

const findMatchedVariant = (item: {
  variantId?: string | number | null;
  selectedSize?: string | null;
  variants?: Array<{ id?: string | number; name?: string | null; weight?: string | null }>;
}) => {
  if (!Array.isArray(item.variants) || item.variants.length === 0) {
    return null;
  }

  if (item.variantId) {
    const matchedById = item.variants.find(
      (variant) => String(variant.id) === String(item.variantId),
    );
    if (matchedById) return matchedById;
  }

  if (item.selectedSize) {
    const matchedBySize = item.variants.find(
      (variant) =>
        variant.name === item.selectedSize || variant.weight === item.selectedSize,
    );
    if (matchedBySize) return matchedBySize;
  }

  return item.variants[0] || null;
};

const parseWeightToKg = (rawValue: unknown): number | null => {
  if (rawValue === null || rawValue === undefined) return null;

  const text = String(rawValue).trim().toLowerCase().replace(/,/g, "");
  if (!text) return null;

  const match = text.match(
    /(\d+(?:\.\d+)?)\s*(kg|kgs?|kilograms?|g|gm|gms|grams?|mg|milligrams?|ml|millilit(?:er|re)s?|l|lt|ltr|lit(?:er|re)s?)/i,
  );

  if (!match) {
    const numericValue = Number(text);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(value) || value <= 0) return null;

  if (["kg", "kgs", "kilogram", "kilograms"].includes(unit)) return value;
  if (["g", "gm", "gms", "gram", "grams"].includes(unit)) return value / 1000;
  if (["mg", "milligram", "milligrams"].includes(unit)) return value / 1000000;
  if (
    ["l", "lt", "ltr", "liter", "liters", "litre", "litres"].includes(unit)
  ) {
    return value;
  }
  if (
    ["ml", "milliliter", "milliliters", "millilitre", "millilitres"].includes(
      unit,
    )
  ) {
    return value / 1000;
  }

  return null;
};

const estimateShippingWeightKg = (
  items: Array<{
    quantity?: number;
    selectedSize?: string | null;
    variantId?: string | number | null;
    variants?: Array<{ id?: string | number; name?: string | null; weight?: string | null }>;
  }>,
) => {
  let totalWeightKg = 0;
  let totalQuantity = 0;

  items.forEach((item) => {
    const matchedVariant = findMatchedVariant(item);
    const rawWeight = matchedVariant?.weight || matchedVariant?.name || item.selectedSize;
    const perUnitWeightKg = parseWeightToKg(rawWeight);
    const quantity = Number(item.quantity || 0);
    totalQuantity += Math.max(0, quantity);

    if (Number.isFinite(perUnitWeightKg) && perUnitWeightKg! > 0 && quantity > 0) {
      totalWeightKg += perUnitWeightKg! * quantity;
    }
  });

  const packagingBufferKg = Math.min(
    MAX_PACKAGING_WEIGHT_KG,
    Number(
      (
        DEFAULT_PACKAGING_WEIGHT_KG +
        totalQuantity * PER_UNIT_PACKAGING_WEIGHT_KG
      ).toFixed(3),
    ),
  );

  if (totalWeightKg <= 0) {
    return Number(
      Math.max(
        DEFAULT_SHIPPING_WEIGHT_KG,
        DEFAULT_SHIPPING_WEIGHT_KG + packagingBufferKg,
      ).toFixed(3),
    );
  }

  return Math.max(
    DEFAULT_SHIPPING_WEIGHT_KG,
    Number((totalWeightKg + packagingBufferKg).toFixed(3)),
  );
};

const resolveItemVariantLabel = (item: {
  selectedSize?: string | null;
  variantId?: string | number | null;
  variants?: Array<{ id?: string | number; name?: string | null; weight?: string | null }>;
}) => {
  const explicitSize = String(item.selectedSize || "").trim();
  if (explicitSize) return explicitSize;

  const matchedVariant = findMatchedVariant(item);
  const variantLabel = String(
    matchedVariant?.weight || matchedVariant?.name || "",
  ).trim();

  return variantLabel;
};

const CheckoutContent = () => {
  const searchParams = useSearchParams();
  const discount = searchParams.get("discount");
  const ship = searchParams.get("ship");

  const {
    cartState,
    clearCart,
    updateCart,
    removeFromCart,
    freeShippingThreshold,
  } = useCart();
  const { isAuthenticated, user, login, token, loading } = useAuth();
  const router = useRouter();
  const didRedirectToAuthRef = useRef(false);
  const checkoutRedirectPath = useMemo(() => {
    const params = searchParams.toString();
    return params ? `/checkout?${params}` : "/checkout";
  }, [searchParams]);

  const [totalCart, setTotalCart] = useState(0);
  const [showLoginForm, setShowLoginForm] = useState(!isAuthenticated);
  const [loginFormData, setLoginFormData] = useState({
    email: "",
    password: "",
  });
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    type: "percentage" | "fixed" | "free_shipping";
    value?: number;
    applicableProducts?: number[];
  } | null>(() => {
    // Initialize from sessionStorage to survive re-renders
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("checkout_applied_coupon");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed;
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [couponError, setCouponError] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  /* State: Removed apartment and city */
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "IN",
    notes: "",
  });

  // Ref to track applied coupon for Razorpay callback (prevents stale closure)
  const appliedCouponRef = React.useRef<typeof appliedCoupon>(null);

  useEffect(() => {
    appliedCouponRef.current = appliedCoupon;
  }, [appliedCoupon]);

  // Keep coupon persisted between refreshes in checkout flow.
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (appliedCoupon) {
        sessionStorage.setItem(
          "checkout_applied_coupon",
          JSON.stringify(appliedCoupon),
        );
      } else {
        sessionStorage.removeItem("checkout_applied_coupon");
      }
    }
  }, [appliedCoupon]);

  // State variables for pincode validation
  const [isValidatingPincode, setIsValidatingPincode] = useState(false);
  const [pincodeServiceable, setPincodeServiceable] = useState<boolean | null>(
    null,
  );
  const [pincodeMessage, setPincodeMessage] = useState("");
  const [shippingCharge, setShippingCharge] = useState<number | null>(null);
  const estimatedShipmentWeightKg = useMemo(
    () => estimateShippingWeightKg(cartState.cartArray),
    [cartState.cartArray],
  );

  const missingGstLookupItems = useMemo<MissingGstLookupItem[]>(() => {
    return cartState.cartArray
      .filter((item) => {
        const itemLevelGst =
          item.gstPercentage !== undefined && item.gstPercentage !== null
            ? Number(item.gstPercentage)
            : NaN;
        if (Number.isFinite(itemLevelGst) && itemLevelGst > 0) return false;

        const matchedVariant = item.variants?.find((variant) => {
          if (item.variantId) {
            return String(variant.id) === String(item.variantId);
          }
          if (item.selectedSize) {
            return (
              variant.name === item.selectedSize ||
              variant.weight === item.selectedSize
            );
          }
          return false;
        });

        const variantRate =
          matchedVariant?.gstPercentage !== undefined &&
          matchedVariant?.gstPercentage !== null
            ? Number(matchedVariant.gstPercentage)
            : NaN;
        if (Number.isFinite(variantRate) && variantRate > 0) return false;

        return Boolean(item.id);
      })
      .map((item) => ({
        cartId: item.cartId,
        productId: item.id,
        variantId: item.variantId ?? null,
        selectedSize: item.selectedSize ?? null,
      }));
  }, [cartState.cartArray]);

  const missingGstLookupKey = useMemo(() => {
    if (missingGstLookupItems.length === 0) return null;
    return `checkout-missing-gst:${JSON.stringify(missingGstLookupItems)}`;
  }, [missingGstLookupItems]);

  const { data: resolvedGstRates = {} } = useSWR<Record<string, number>>(
    missingGstLookupKey,
    async () => {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005/api";

      const resolvedEntries = await Promise.all(
        missingGstLookupItems.map(async (item) => {
          try {
            const response = await axios.get(`${apiBaseUrl}/products/${item.productId}`);
            const variants = response?.data?.data?.variants;
            if (!Array.isArray(variants) || variants.length === 0) return null;

            let matchedVariant = variants.find((variant: any) => {
              if (item.variantId) {
                return String(variant.id) === String(item.variantId);
              }
              if (item.selectedSize) {
                return (
                  variant.name === item.selectedSize ||
                  variant.weight === item.selectedSize
                );
              }
              return false;
            });

            if (!matchedVariant) {
              matchedVariant = variants[0];
            }

            const rate =
              matchedVariant?.gstPercentage !== undefined &&
              matchedVariant?.gstPercentage !== null
                ? Number(matchedVariant.gstPercentage)
                : NaN;
            if (!Number.isFinite(rate) || rate <= 0) return null;

            return [item.cartId, rate] as const;
          } catch {
            return null;
          }
        }),
      );

      return resolvedEntries
        .filter((entry): entry is readonly [string, number] => Boolean(entry))
        .reduce(
          (acc, [cartId, rate]) => {
            acc[cartId] = rate;
            return acc;
          },
          {} as Record<string, number>,
        );
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      keepPreviousData: true,
    },
  );

  const resolveItemGstRate = useCallback(
    (item: (typeof cartState.cartArray)[number]) => {
      const itemLevelGst =
        item.gstPercentage !== undefined && item.gstPercentage !== null
          ? Number(item.gstPercentage)
          : NaN;
      if (Number.isFinite(itemLevelGst)) {
        return itemLevelGst;
      }

      const resolvedRate = Number(resolvedGstRates[item.cartId]);
      if (Number.isFinite(resolvedRate)) {
        return resolvedRate;
      }

      const matchedVariant = item.variants?.find((variant) => {
        if (item.variantId) {
          return String(variant.id) === String(item.variantId);
        }
        if (item.selectedSize) {
          return (
            variant.name === item.selectedSize ||
            variant.weight === item.selectedSize
          );
        }
        return false;
      });

      const variantRate =
        matchedVariant?.gstPercentage !== undefined &&
        matchedVariant?.gstPercentage !== null
          ? Number(matchedVariant.gstPercentage)
          : NaN;

      return Number.isFinite(variantRate) ? variantRate : 0;
    },
    [cartState.cartArray, resolvedGstRates],
  );

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Pre-fill form when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      setShowLoginForm(false);

      let savedAddress: any = user.address || {};

      // Handle case where address is a JSON string (backend/frontend mismatch)
      if (typeof savedAddress === "string") {
        try {
          savedAddress = JSON.parse(savedAddress);
        } catch (e) {
          console.error("Failed to parse user address", e);
          savedAddress = {};
        }
      }

      // Backend uses 'street' field for address, not 'address'
      const address = savedAddress.street || "";
      const stateName = savedAddress.state || savedAddress.stateCode || "";
      const pincode = savedAddress.pincode || "";

      // Backend uses 'phonenumber' and 'fullname' fields
      const phone =
        savedAddress.phonenumber || savedAddress.phone || user.phone || "";
      const firstName = savedAddress.fullname
        ? savedAddress.fullname.split(" ")[0]
        : user.firstName || "";
      const lastName = savedAddress.fullname
        ? savedAddress.fullname.split(" ").slice(1).join(" ")
        : user.lastName || "";

      let stateCode = stateName;
      if (stateName) {
        const states = State.getStatesOfCountry("IN");
        const foundState = states.find(
          (s) =>
            s.name.toLowerCase() === stateName.toLowerCase() ||
            s.isoCode === stateName,
        );
        stateCode = foundState?.isoCode || stateName;
      }

      setFormData({
        firstName: firstName,
        lastName: lastName,
        email: savedAddress.email || user.email || "",
        phoneNumber: phone,
        address: address,
        city: savedAddress.city || "",
        state: stateCode,
        pincode: pincode,
        country: "IN",
        notes: "",
      });
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (loading || isAuthenticated || didRedirectToAuthRef.current) return;
    didRedirectToAuthRef.current = true;
    router.replace(
      `/login?redirect=${encodeURIComponent(checkoutRedirectPath)}`,
    );
  }, [loading, isAuthenticated, router, checkoutRedirectPath]);

  const validatePincode = async (pincode: string) => {
    if (pincode.length !== 6) {
      setPincodeServiceable(null);
      setPincodeMessage("");
      setShippingCharge(null);
      return;
    }

    setIsValidatingPincode(true);
    setPincodeMessage("");

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005/api";
      const response = await fetch(`${apiBaseUrl}/shipping/check-pincode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destPincode: pincode,
          weight: estimatedShipmentWeightKg,
          declaredValue: totalCart,
          cod: false,
        }),
      });

      const data = await response.json();
      const isServiceable = Boolean(data?.data?.serviceable);
      if (response.ok && isServiceable) {
        setPincodeServiceable(true);
        setPincodeMessage("Delivery available");
        const quotedShippingCharge = Number(data?.data?.shippingRate);
        setShippingCharge(
          Number.isFinite(quotedShippingCharge) ? quotedShippingCharge : 0,
        );

        // Fetch City/State from Pincode
        try {
          const pinRes = await fetch(
            `https://api.postalpincode.in/pincode/${pincode}`,
          );
          const pinData = await pinRes.json();
          if (
            pinData &&
            pinData[0].Status === "Success" &&
            pinData[0].PostOffice &&
            pinData[0].PostOffice.length > 0
          ) {
            const details = pinData[0].PostOffice[0];
            setFormData((prev) => ({
              ...prev,
              city: details.District || details.Block || "",
              state: details.State || prev.state,
            }));
          }
        } catch (e) {
          console.error("Failed to fetch location details", e);
        }
      } else {
        setPincodeServiceable(false);
        setPincodeMessage(
          data?.message ||
            data?.data?.message ||
            "Delivery not available to this pincode",
        );
        setShippingCharge(null);
      }
    } catch (error) {
      console.error("Pincode check error:", error);
      setPincodeServiceable(false);
      setPincodeMessage("Unable to verify pincode");
      setShippingCharge(null);
    } finally {
      setIsValidatingPincode(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.pincode && formData.pincode.length === 6) {
        validatePincode(formData.pincode);
      } else {
        setPincodeServiceable(null);
        setPincodeMessage("");
        setShippingCharge(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.pincode, estimatedShipmentWeightKg, totalCart]);

  // Calculate total cart value
  useEffect(() => {
    const total = cartState.cartArray.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    setTotalCart(total);
  }, [cartState.cartArray]);

  const couponDiscountAmount = useMemo(() => {
    const rawDiscount = appliedCoupon?.discount || Number(discount || 0);
    if (!Number.isFinite(rawDiscount) || rawDiscount <= 0) {
      return 0;
    }

    return Math.min(totalCart, rawDiscount);
  }, [appliedCoupon, discount, totalCart]);

  const gstTotal = useMemo(() => {
    const discountForTax = Math.min(couponDiscountAmount, totalCart);
    const canAllocateDiscount = discountForTax > 0 && totalCart > 0;

    return cartState.cartArray.reduce((sum, item) => {
      const lineBaseTotal = item.price * item.quantity;
      const gstRate = resolveItemGstRate(item);

      if (!Number.isFinite(gstRate) || gstRate <= 0 || lineBaseTotal <= 0) {
        return sum;
      }

      const allocatedDiscount = canAllocateDiscount
        ? discountForTax * (lineBaseTotal / totalCart)
        : 0;

      const taxableValue = Math.max(0, lineBaseTotal - allocatedDiscount);

      return sum + (taxableValue * gstRate) / 100;
    }, 0);
  }, [
    cartState.cartArray,
    couponDiscountAmount,
    totalCart,
    resolveItemGstRate,
  ]);

  // Remove coupon when cart changes (quantity or items) to ensure validity
  const prevCartRef = useRef<string>("");

  useEffect(() => {
    // Create a unique signature of the cart state (id + quantity)
    const cartSignature = JSON.stringify(
      cartState.cartArray.map((item) => ({
        id: item.cartId,
        qty: item.quantity,
      })),
    );

    // If signature changed (and not initial load), remove applied coupon
    if (
      prevCartRef.current &&
      prevCartRef.current !== cartSignature &&
      appliedCoupon
    ) {
      setAppliedCoupon(null);
      // Keep the code in the input for easy re-application, but clear the applied state
      // setCouponCode("");
      setCouponError("Coupon removed due to cart update. Please apply again.");
    }

    prevCartRef.current = cartSignature;
  }, [cartState.cartArray, appliedCoupon]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      await login(loginFormData);
      setShowLoginForm(false);
    } catch (err: any) {
      setLoginError(err.message || "Login failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleApplyCoupon = async (codeOverride?: string) => {
    const codeToExecute = codeOverride || couponCode;
    if (!codeToExecute.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    const isRevalidation =
      appliedCoupon?.code === codeToExecute.toUpperCase().trim();

    setIsValidatingCoupon(true);
    setCouponError("");
    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005/api";
      const response = await fetch(`${apiBaseUrl}/coupons/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          code: codeToExecute.toUpperCase().trim(),
          orderAmount: totalCart,
          items: cartState.cartArray.map((item) => ({
            productId: Number(item.id),
            categoryId: Number(item.categoryId),
            price: item.price,
            quantity: item.quantity,
          })),
          customerId: user?.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        const newDiscount = data.data.discountAmount;
        const oldDiscount = appliedCoupon?.discount || 0;

        setAppliedCoupon({
          code: data.data.code,
          discount: newDiscount,
          type: data.data.type,
          value: data.data.coupon?.value || 0,
          applicableProducts: data.data.applicableProducts || [],
        });
        setCouponError("");
      } else {
        // If validation fails, clear the coupon (especially important for re-validation)
        if (isRevalidation) {
          setAppliedCoupon(null);
        }
        setCouponError(data.message || "Invalid coupon code");
      }
    } catch {
      // On error, clear coupon if it was a re-validation
      if (isRevalidation) {
        setAppliedCoupon(null);
      }
      setCouponError("Failed to validate coupon");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponError("");
  };

  const handleRemoveCartItem = (cartId: string) => {
    const isLastItem = cartState.cartArray.length === 1;
    removeFromCart(cartId);
    if (isLastItem) {
      router.push("/product");
    }
  };

  const hasFreeShippingThreshold =
    freeShippingThreshold !== null && freeShippingThreshold > 0;
  const qualifiedForFreeShipping =
    hasFreeShippingThreshold && totalCart >= freeShippingThreshold;
  const resolvedShippingCharge = shippingCharge ?? 0;

  const calculateTotal = useCallback(() => {
    const couponDiscount = couponDiscountAmount;
    const shipping = qualifiedForFreeShipping ? 0 : resolvedShippingCharge;

    return Math.max(0, totalCart - couponDiscount + gstTotal + shipping);
  }, [
    totalCart,
    couponDiscountAmount,
    gstTotal,
    qualifiedForFreeShipping,
    resolvedShippingCharge,
  ]);

  // Free shipping calculation
  const amountToFreeShipping = hasFreeShippingThreshold
    ? Math.max(0, freeShippingThreshold - totalCart)
    : 0;

  const validateForm = () => {
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.phoneNumber ||
      !formData.address ||
      !formData.pincode
    ) {
      setPaymentError("Please fill in all required fields");
      return false;
    }

    if (isValidatingPincode) {
      setPaymentError("Please wait, validating pincode...");
      return false;
    }

    if (pincodeServiceable === false) {
      setPaymentError("Delivery is not available to this pincode");
      return false;
    }

    // Check if pincode has been validated (it should be if length is 6)
    // If user clicked immediately after typing, pincodeServiceable might be null but isValidatingPincode is true or about to be.
    // However, since we debounce, we might miss it if they type and click super fast.
    // Ideally we should await validation, but sync validation here:
    if (
      formData.pincode &&
      formData.pincode.length === 6 &&
      pincodeServiceable === null
    ) {
      setPaymentError("Please wait for pincode validation");
      validatePincode(formData.pincode); // Force validation check
      return false;
    }

    if (formData.pincode && formData.pincode.length !== 6) {
      setPaymentError("Please enter a valid 6-digit pincode");
      return false;
    }
    if (
      !qualifiedForFreeShipping &&
      pincodeServiceable === true &&
      shippingCharge === null
    ) {
      setPaymentError(
        "Unable to calculate shipping charges. Please recheck pincode",
      );
      return false;
    }
    if (formData.country !== "IN") {
      setFormData((prev) => ({ ...prev, country: "IN" }));
    }
    if (cartState.cartArray.length === 0) {
      setPaymentError("Your cart is empty");
      return false;
    }
    if (!isAuthenticated || !user) {
      setPaymentError("Please login to place an order");
      return false;
    }

    // Validate stock availability
    for (const item of cartState.cartArray) {
      const maxStock = getMaxStock(item, item.selectedSize);
      if (item.quantity > maxStock) {
        setPaymentError(
          `Item "${item.name}" exceeds available stock (${maxStock}). Please go back to cart to adjust quantity.`,
        );
        return false;
      }
    }

    return true;
  };

  const getAddressDetails = () => {
    const stateName = formData.state
      ? State.getStateByCodeAndCountry(formData.state, formData.country)
          ?.name || formData.state
      : "";
    const countryName =
      Country.getCountryByCode(formData.country)?.name || formData.country;
    const postalCode = formData.pincode.replace(/\D/g, "");

    return {
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      address: formData.address,
      city: formData.city,
      state: stateName,
      postalCode,
      country: countryName,
      phone: formData.phoneNumber,
      email: formData.email,
    };
  };

  const storeOrderSuccessData = (data: Record<string, unknown>) => {
    if (typeof window === "undefined") return;
    const safeData = {
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      totalAmount: data.totalAmount,
      paidAmount: data.paidAmount,
      paymentMethod: data.paymentMethod,
      subtotal: data.subtotal,
      discountAmount: data.discountAmount,
      taxAmount: data.taxAmount,
      shippingAmount: data.shippingAmount,
      couponCode: data.couponCode,
      gstBreakdown: data.gstBreakdown,
      items: data.items,
      address: data.address,
      trackingNumber: data.trackingNumber || null,
      shippingCarrier: data.shippingCarrier || null,
      shippingProvider: data.shippingProvider || null,
      shippingShipmentId: data.shippingShipmentId || null,
      shippingProviderOrderId: data.shippingProviderOrderId || null,
      shippingCourierName: data.shippingCourierName || null,
      shippingLatestStatus: data.shippingLatestStatus || null,
      createdAt: new Date().toISOString(),
    };
    sessionStorage.setItem(ORDER_SUCCESS_STORAGE_KEY, JSON.stringify(safeData));
  };

  const handleRazorpayPayment = async () => {
    if (!validateForm()) return;
    setIsProcessingPayment(true);
    setPaymentError("");

    try {
      // Final coupon validation before payment
      if (appliedCoupon?.code) {
        const apiBaseUrl =
          process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005/api";
        const validationResponse = await fetch(
          `${apiBaseUrl}/coupons/validate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({
              code: appliedCoupon.code,
              orderAmount: totalCart,
              items: cartState.cartArray.map((item) => ({
                productId: Number(item.id),
                categoryId: Number(item.categoryId),
                price: item.price,
                quantity: item.quantity,
              })),
              customerId: user?.id,
            }),
          },
        );

        const validationData = await validationResponse.json();

        if (!validationData.success) {
          setPaymentError(
            `Coupon validation failed: ${validationData.message || "Coupon is no longer valid"}`,
          );
          setAppliedCoupon(null);
          setIsProcessingPayment(false);
          return;
        }

        // Check if discount amount changed
        const newDiscount = validationData.data.discountAmount;
        if (Math.abs(newDiscount - appliedCoupon.discount) > 0.01) {
          // Update with new discount
          setAppliedCoupon({
            code: validationData.data.code,
            discount: newDiscount,
            type: validationData.data.type,
            value: validationData.data.coupon?.value || 0,
            applicableProducts: validationData.data.applicableProducts || [],
          });
          setPaymentError(
            `Coupon discount has been updated to ₹${newDiscount.toFixed(2)}. Please review and try again.`,
          );
          setIsProcessingPayment(false);
          return;
        }
      }

      const totalAmount = calculateTotal();
      const addressDetails = getAddressDetails();

      const orderResponse = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalAmount,
          currency: "INR",
          receipt: `receipt_${Date.now()}`,
          cartItems: cartState.cartArray.map((item) => ({
            id: item.id,
            productId: item.id,
            quantity: item.quantity,
            price: item.price,
            gstRate: resolveItemGstRate(item),
          })),
          couponCode: appliedCoupon?.code,
          customerId: user?.id,
          shippingAmount:
            qualifiedForFreeShipping ? 0 : resolvedShippingCharge,
          notes: {
            customer_name: addressDetails.name,
            customer_email: addressDetails.email,
            customer_phone: addressDetails.phone,
          },
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create order");
      }

      const orderData = await orderResponse.json();
      if (!orderData.success)
        throw new Error(orderData.message || "Failed to create order");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Naveenam Naturals",
        description: "Order Payment",
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            const currentCouponCode = appliedCouponRef.current?.code;

            const verifyResponse = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderData: {
                  customerId: user!.id,
                  items: cartState.cartArray.map((item) => ({
                    productId:
                      typeof item.id === "number"
                        ? item.id
                        : parseInt(String(item.id)),
                    quantity: item.quantity,
                    selectedSize: item.selectedSize,
                    ...(item.variantId ? { variantId: item.variantId } : {}),
                  })),
                  address: addressDetails,
                  paymentMethod: "online",
                  paymentId: response.razorpay_payment_id,
                  couponCode: currentCouponCode,
                  shippingAmount:
                    qualifiedForFreeShipping ? 0 : resolvedShippingCharge,
                  notes: formData.notes,
                },
                totalAmount: calculateTotal(),
              }),
            });

            const verifyData = await verifyResponse.json();
            if (verifyData.success && verifyData.verified) {
              storeOrderSuccessData({
                orderId: verifyData.orderId,
                orderNumber: verifyData.orderNumber,
                totalAmount: verifyData.totalAmount || totalAmount,
                subtotal: verifyData.subtotal,
                discountAmount: verifyData.discountAmount,
                taxAmount: verifyData.taxAmount,
                shippingAmount: verifyData.shippingAmount,
                couponCode: verifyData.couponCode,
                gstBreakdown: verifyData.gstBreakdown,
                items: cartState.cartArray.map((item) => ({
                  id: String(item.cartId || item.id),
                  name: item.name,
                  price: Number(item.price || 0),
                  quantity: item.quantity,
                  selectedSize: item.selectedSize,
                  image: Array.isArray(item.thumbImage)
                    ? item.thumbImage[0]
                    : item.thumbImage,
                })),
                paidAmount: totalAmount,
                paymentMethod: "online",
                address: addressDetails,
                trackingNumber: verifyData.trackingNumber || null,
                shippingCarrier: verifyData.shippingCarrier || null,
                shippingProvider: verifyData.shippingProvider || null,
                shippingShipmentId: verifyData.shippingShipmentId || null,
                shippingProviderOrderId:
                  verifyData.shippingProviderOrderId || null,
                shippingCourierName: verifyData.shippingCourierName || null,
                shippingLatestStatus: verifyData.shippingLatestStatus || null,
              });
              clearCart();
              router.push(
                `/order-success?orderId=${verifyData.orderId}&orderNumber=${verifyData.orderNumber}`,
              );
            } else {
              setPaymentError(
                verifyData.error || "Payment verification failed",
              );
            }
          } catch {
            setPaymentError("Payment verification failed");
          } finally {
            setIsProcessingPayment(false);
          }
        },
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          contact: formData.phoneNumber,
        },
        theme: { color: "var(--success)" },
        modal: { ondismiss: () => setIsProcessingPayment(false) },
      };

      if (typeof window !== "undefined" && window.Razorpay) {
        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } else {
        throw new Error("Razorpay SDK not loaded");
      }
    } catch (error: any) {
      setPaymentError(error.message || "Payment failed");
      setIsProcessingPayment(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleRazorpayPayment();
  };

  return (
    <div className="bg-surface text-[15px] sm:text-base">
      <TopNavOne
        props="style-one bg-primary"
        slogan="Welcome to Naveenam Naturals Store"
      />
      <div id="header" className="relative w-full">
        <MenuCosmeticThree />
      </div>

      <div className="checkout-page py-8 md:py-12 lg:py-16">
        <div className="container max-w-7xl mx-auto px-4">
          {/* Secure Checkout Header */}
          <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
            <Icon.Lock size={18} className="text-gray" />
            <span className="text-xs sm:text-sm font-medium text-gray uppercase tracking-wide">
              Secure Checkout
            </span>
          </div>

          {/* Progress Steps */}
          {/* <div className="flex items-center justify-center mb-8 sm:mb-12 max-w-2xl mx-auto">
            <div className="flex items-center w-full">
    
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${currentStep >= 1 ? "bg-primary text-white" : "bg-surface border border-secondary/20 text-secondary"}`}
                >
                  {currentStep > 1 ? (
                    <Icon.Check size={20} weight="bold" />
                  ) : (
                    "1"
                  )}
                </div>
                <span className="text-xs mt-2 font-medium text-secondary">
                  Information
                </span>
              </div>
              <div
                className={`flex-1 h-0.5 ${currentStep >= 2 ? "bg-primary" : "bg-secondary/20"} -mx-2`}
              ></div>

             
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${currentStep >= 2 ? "bg-primary text-white" : "bg-surface border border-secondary/20 text-secondary"}`}
                >
                  {currentStep > 2 ? (
                    <Icon.Check size={20} weight="bold" />
                  ) : (
                    "2"
                  )}
                </div>
                <span className="text-xs mt-2 font-medium text-secondary">
                  Shipping
                </span>
              </div>
              <div
                className={`flex-1 h-0.5 ${currentStep >= 3 ? "bg-primary" : "bg-secondary/20"} -mx-2`}
              ></div>

              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${currentStep >= 3 ? "bg-primary text-white" : "bg-surface border border-secondary/20 text-secondary"}`}
                >
                  3
                </div>
                <span className="text-xs mt-2 font-medium text-secondary">
                  Payment
                </span>
              </div>
            </div>
          </div> */}

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
            {/* Left Column - Form */}
            <div className="flex-1 lg:max-w-2xl">
              {/* Login Section */}
              {!isAuthenticated && (
                <div className="mb-5 sm:mb-6 bg-white rounded-2xl p-4 sm:p-6 border border-outline">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-secondary">
                        Already have an account?{" "}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowLoginForm(!showLoginForm)}
                        className="text-primary font-semibold hover:underline"
                        aria-expanded={showLoginForm}
                        aria-controls="checkout-login-form"
                      >
                        Log in
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLoginForm(!showLoginForm)}
                      className="rounded p-1 transition-colors hover:bg-surface"
                      aria-label={
                        showLoginForm ? "Hide login form" : "Show login form"
                      }
                      aria-expanded={showLoginForm}
                      aria-controls="checkout-login-form"
                    >
                      <Icon.CaretDown
                        size={20}
                        className={`transition-transform text-gray ${showLoginForm ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>

                  {showLoginForm && (
                    <form
                      id="checkout-login-form"
                      onSubmit={handleLogin}
                      className="space-y-4"
                    >
                      {loginError && (
                        <div className="p-3 bg-error/10 border border-error text-error rounded-xl text-sm">
                          {loginError}
                        </div>
                      )}
                      <input
                        className="w-full px-4 py-3 border border-outline rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        type="email"
                        aria-label="Login email"
                        placeholder="Email"
                        value={loginFormData.email}
                        onChange={(e) =>
                          setLoginFormData({
                            ...loginFormData,
                            email: e.target.value,
                          })
                        }
                        required
                        disabled={isLoggingIn}
                      />
                      <input
                        className="w-full px-4 py-3 border border-outline rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        type="password"
                        aria-label="Login password"
                        placeholder="Password"
                        value={loginFormData.password}
                        onChange={(e) =>
                          setLoginFormData({
                            ...loginFormData,
                            password: e.target.value,
                          })
                        }
                        required
                        disabled={isLoggingIn}
                      />
                      <button
                        type="submit"
                        className="w-full bg-primary hover:bg-secondary text-white font-semibold py-3 rounded-xl transition-all"
                        disabled={isLoggingIn}
                      >
                        {isLoggingIn ? "Logging in..." : "Login"}
                      </button>
                      <div className="text-center text-sm text-secondary">
                        Don't have an account?{" "}
                        <Link
                          href={`/register?redirect=${encodeURIComponent(checkoutRedirectPath)}`}
                          className="text-primary font-semibold hover:underline"
                        >
                          Register
                        </Link>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Contact Information */}
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="bg-white rounded-2xl p-4 sm:p-6 border border-outline">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg sm:text-xl font-bold text-black">
                      Contact Information
                    </h3>
                    {/* {!isAuthenticated && (
                      <div className="text-sm text-secondary">
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setShowLoginForm(true)}
                          className="text-primary font-semibold hover:underline"
                        >
                          Log in
                        </button>
                      </div>
                    )} */}
                  </div>

                  <div className="space-y-4">
                    <input
                      className="w-full px-4 py-3.5 border border-outline rounded-xl focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success"
                      type="email"
                      aria-label="Contact email or phone"
                      placeholder="Email or mobile phone number"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />

                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-white rounded-2xl p-4 sm:p-6 border border-outline">
                  <h3 className="text-lg sm:text-xl font-bold text-black mb-5 sm:mb-6">
                    Shipping Address
                  </h3>

                  <div className="space-y-4">
                    <select
                      className="w-full px-4 py-3 border border-outline rounded-xl focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success appearance-none bg-white"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      required
                    >
                      <option value="IN">India</option>
                    </select>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <input
                        className="w-full px-4 py-3 border border-outline rounded-xl focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success"
                        type="text"
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            firstName: e.target.value,
                          })
                        }
                        required
                      />
                      <input
                        className="w-full px-4 py-3 border border-outline rounded-xl focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success"
                        type="text"
                        placeholder="Last name"
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        required
                      />
                    </div>

                    <textarea
                      className="w-full px-4 py-3.5 border border-outline rounded-xl focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success"
                      placeholder="Address"
                      rows={4}
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      required
                    />

                    <div className="relative">
                      <input
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 appearance-none 
                          ${
                            pincodeServiceable === false
                              ? "border-error focus:ring-error/20 focus:border-error"
                              : pincodeServiceable === true
                                ? "border-success focus:ring-success/20 focus:border-success"
                                : "border-outline focus:ring-success/20 focus:border-success"
                          }`}
                        type="text"
                        placeholder="ZIP code"
                        value={formData.pincode}
                        onChange={(e) => {
                          const val = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6);
                          setFormData({ ...formData, pincode: val });
                        }}
                        maxLength={6}
                        required
                      />
                      {isValidatingPincode && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                        </div>
                      )}
                      {!isValidatingPincode && pincodeServiceable === true && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-success">
                          <Icon.CheckCircle size={18} weight="fill" />
                        </div>
                      )}
                      {pincodeMessage && (
                        <p
                          className={`text-xs mt-1 ${pincodeServiceable === true ? "text-success" : "text-error"}`}
                        >
                          {pincodeMessage}
                        </p>
                      )}
                    </div>

                    <input
                      className="w-full px-4 py-3 border border-outline rounded-xl focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success"
                      type="tel"
                      placeholder="Phone"
                      value={formData.phoneNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          phoneNumber: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
                  <Link
                    href="/cart"
                    className="text-success text-sm sm:text-base font-medium hover:underline flex items-center gap-2"
                  >
                    <Icon.CaretLeft size={16} />
                    Return to cart
                  </Link>

                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-primary hover:bg-secondary text-white font-bold py-3.5 sm:py-4 px-6 sm:px-8 rounded-full transition-all uppercase text-xs sm:text-sm"
                    disabled={
                      isProcessingPayment || cartState.cartArray.length === 0
                    }
                  >
                    {isProcessingPayment
                      ? "Processing..."
                      : "Continue to Payment"}
                  </button>
                </div>

                {paymentError && (
                  <div className="p-4 bg-error/10 border border-error text-error rounded-xl text-sm">
                    {paymentError}
                  </div>
                )}
              </form>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-outline">
                <div className="flex flex-col items-center text-center">
                  <Icon.ShieldCheck
                    size={24}
                    className="text-secondary/60 mb-2"
                  />
                  <span className="text-xs text-secondary/60 uppercase font-medium">
                    Secure Payments
                  </span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <Icon.Truck size={24} className="text-secondary/60 mb-2" />
                  <span className="text-xs text-secondary/60 uppercase font-medium">
                    Fast Delivery
                  </span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <Icon.BoxArrowDownIcon
                    size={24}
                    className="text-secondary/60 mb-2"
                  />
                  <span className="text-xs text-secondary/60 uppercase font-medium">
                    Safe Packing
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:w-5/12">
              <div className="bg-white rounded-2xl border border-outline p-4 sm:p-6 lg:sticky lg:top-6">
                <h3 className="text-xl sm:text-2xl font-bold text-black mb-5 sm:mb-6">
                  Order Summary
                </h3>

                {/* Products */}
                <div className="space-y-3 sm:space-y-4 mb-5 sm:mb-6 max-h-96 overflow-y-auto">
                  {cartState.cartArray.map((item) => {
                    const itemBaseTotal = item.price * item.quantity;

                    return (
                      <div key={item.cartId} className="flex gap-3 sm:gap-4">
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl overflow-hidden bg-surface">
                          <Image
                            src={
                              Array.isArray(item.images) &&
                              item.images.length > 0
                                ? item.images[0]
                                : typeof item.images === "string"
                                  ? item.images
                                  : "/images/product/default.png"
                            }
                            width={80}
                            height={80}
                            alt={item.name || "Product image"}
                            className="w-full h-full object-cover"
                          />
                          <div
                            style={{ backgroundColor: "#fb923c" }}
                            className="absolute top-1 right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white text-[9px] sm:text-[10px] font-bold leading-none shadow-md z-10"
                          >
                            {item.quantity}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-secondary text-sm mb-1 line-clamp-2">
                            {item.name}
                          </div>
                          <p className="text-xs text-secondary/80 mb-2">
                            {[
                              resolveItemVariantLabel(item),
                              item.category || "Product",
                            ]
                              .filter(Boolean)
                              .join(" | ")}
                          </p>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center bg-surface rounded-lg h-8 border border-secondary/20">
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.quantity > 1) {
                                    updateCart(
                                      item.cartId,
                                      item.quantity - 1,
                                      item.selectedSize,
                                    );
                                  }
                                }}
                                className="w-8 h-full flex items-center justify-center hover:bg-secondary/10 rounded-l-lg transition-colors"
                              >
                                <Icon.Minus
                                  size={12}
                                  className="text-secondary"
                                />
                              </button>
                              <span className="text-xs font-semibold text-secondary w-6 text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  updateCart(
                                    item.cartId,
                                    item.quantity + 1,
                                    item.selectedSize,
                                  );
                                }}
                                disabled={
                                  item.quantity >=
                                  getMaxStock(item, item.selectedSize)
                                }
                                className={`w-8 h-full flex items-center justify-center rounded-r-lg transition-colors ${item.quantity >= getMaxStock(item, item.selectedSize) ? "opacity-30 cursor-not-allowed" : "hover:bg-secondary/10"}`}
                              >
                                <Icon.Plus
                                  size={12}
                                  className="text-secondary"
                                />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveCartItem(item.cartId)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                              aria-label={`Remove ${item.name} from cart`}
                            >
                              <Icon.Trash size={12} />
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-secondary text-sm sm:text-base numeric-contrast">
                            &#8377;{itemBaseTotal.toFixed(2)}
                          </div>
                          <div className="text-[11px] sm:text-xs text-secondary/70 mt-1">
                            Excl. GST
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Discount Code */}
                <div className="mb-6 pb-6 border-b border-outline">
                  {appliedCoupon ? (
                    <div
                      className={`flex items-center justify-between bg-success/10 border border-success/20 rounded-xl p-4 ${isValidatingCoupon ? "opacity-60" : ""}`}
                    >
                      <div>
                        <div className="font-semibold text-success flex items-center gap-2">
                          {appliedCoupon.code} Applied
                          {isValidatingCoupon && (
                            <span className="text-xs text-gray animate-pulse">
                              (Validating...)
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray numeric-contrast">
                          Discount: ₹{appliedCoupon.discount.toFixed(2)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-sm text-gray hover:text-black"
                        disabled={isValidatingCoupon}
                      >
                        <Icon.X size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) =>
                          setCouponCode(e.target.value.toUpperCase())
                        }
                        placeholder="Discount code"
                        className="flex-1 px-4 py-3 border border-outline rounded-xl focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success"
                        disabled={isValidatingCoupon}
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon()}
                        disabled={isValidatingCoupon || !couponCode.trim()}
                        className="px-6 py-3 bg-gray/10 hover:bg-gray/20 text-gray font-semibold rounded-xl transition-all disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <div className="text-sm text-red-600 mt-2">
                      {couponError}
                    </div>
                  )}

                  <CouponList
                    onApply={(code) => {
                      setCouponCode(code);
                      handleApplyCoupon(code);
                    }}
                    appliedCouponCode={appliedCoupon?.code}
                    orderTotal={totalCart}
                    cartProductIds={cartState.cartArray.map((item) =>
                      Number(item.id),
                    )}
                  />
                </div>

                {/* Totals */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-base">
                    <span className="text-gray">Base Price</span>
                    <span className="font-semibold text-black numeric-contrast">
                      ₹{totalCart.toFixed(2)}
                    </span>
                  </div>

                  {couponDiscountAmount > 0 && (
                    <div className="flex justify-between text-base text-success">
                      <span>Coupon Discount</span>
                      <span className="font-semibold text-success numeric-contrast">
                        -₹{couponDiscountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-base">
                    <span className="text-gray">GST</span>
                    <span className="font-semibold text-black numeric-contrast">
                      ₹{gstTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-base">
                    <span className="text-gray">Shipping</span>
                    <span className="text-sm font-semibold text-black numeric-contrast">
                      {qualifiedForFreeShipping ? (
                        <span className="text-success">Free</span>
                      ) : shippingCharge !== null &&
                        pincodeServiceable === true ? (
                        `₹${shippingCharge.toFixed(2)}`
                      ) : (
                        <span className="text-gray-500 font-normal text-xs">
                          Calculated at next step
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-6 border-t border-outline mb-6">
                  <span className="text-lg font-bold text-black">
                    Total Payable
                  </span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary numeric-contrast">
                      ₹{calculateTotal().toFixed(2)}
                    </div>
                    <div className="text-xs text-gray mt-1">
                      Inclusive of all taxes
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="relative w-full max-w-full sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto">
                    <div className="flex items-center justify-center">
                      <Image
                        src="/images/payment/safecheckoutbadge.webp"
                        alt="Safe Checkout Badge"
                        width={300}
                        height={80}
                        className="w-full h-auto max-h-18 sm:max-h-24 md:max-h-28 object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                </div>

                {/* Free Shipping Progress */}
                {hasFreeShippingThreshold && amountToFreeShipping > 0 && (
                  <div className="bg-success/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon.Package size={20} className="text-accent" />
                      <span className="text-sm font-medium text-black">
                        You're{" "}
                        <span className="text-accent font-bold numeric-contrast">
                          ₹{amountToFreeShipping.toFixed(2)}
                        </span>{" "}
                        away from{" "}
                        <span className="font-bold">
                          FREE EXPRESS SHIPPING!
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

const Checkout = () => {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
};

export default Checkout;
