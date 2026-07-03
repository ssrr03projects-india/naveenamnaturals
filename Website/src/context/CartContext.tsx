"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
} from "react";
import { ProductType } from "@/type/ProductType";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { settingsApi } from "@/lib/api";
import {
  initializeCart,
  addToCart as addToCartAction,
  removeFromCart as removeFromCartAction,
  updateCartItem,
  clearCart as clearCartAction,
  syncCartWithProducts,
  CartItem,
} from "@/store/slices/cartSlice";

interface CartContextProps {
  cartState: { cartArray: CartItem[] };
  addToCart: (item: ProductType) => void;
  removeFromCart: (itemId: string) => void;
  updateCart: (itemId: string, quantity: number, selectedSize: string) => void;
  clearCart: () => void;
  freeShippingThreshold: number | null;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

// Helper to create a hash of product prices for change detection
const getProductPriceHash = (product: ProductType): string => {
  if (!product.sizes) return "";
  let sizes = product.sizes;
  if (typeof sizes === "string") {
    try {
      sizes = JSON.parse(sizes);
    } catch {
      return "";
    }
  }
  if (!Array.isArray(sizes)) return "";
  return JSON.stringify(
    sizes.map((s: any) => ({
      size: s.size,
      price: s.price,
      mrpPrice: s.mrpPrice,
    })),
  );
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);
  const isInitialized = useAppSelector((state) => state.cart.isInitialized);
  const allProducts = useAppSelector((state) => state.products.allProducts);
  const [freeShippingThreshold, setFreeShippingThreshold] =
    useState<number | null>(null);

  // Fetch free shipping threshold from API
  useEffect(() => {
    const fetchThreshold = async () => {
      try {
        const response = await settingsApi.getSettingByKey(
          "free_shipping_threshold",
        );
        if (response.data.success && response.data.data) {
          let rawValue = response.data.data.value;
          // Handle case where value might be double-stringified or a string
          if (typeof rawValue === "string") {
            rawValue = rawValue.replace(/^"|"$/g, "");
          }
          const val = Number(rawValue);
          if (Number.isFinite(val) && val > 0) {
            setFreeShippingThreshold(val);
            return;
          }
        }
        setFreeShippingThreshold(null);
      } catch (error) {
        console.error("Failed to fetch free shipping threshold:", error);
        setFreeShippingThreshold(null);
      }
    };
    fetchThreshold();
  }, []);

  // Initialize cart on mount
  useEffect(() => {
    if (!isInitialized) {
      dispatch(initializeCart());
    }
  }, [dispatch, isInitialized]);

  // Create a hash of product data to detect changes
  const productsHash = useMemo(() => {
    if (allProducts.length === 0) return "";
    return JSON.stringify(
      allProducts.map((p) => ({
        id: p.id,
        price: getProductPriceHash(p),
        isActive: p.isActive,
      })),
    );
  }, [allProducts]);

  // Sync cart with product data when products are loaded/updated
  const prevProductsHashRef = useRef<string>("");

  useEffect(() => {
    if (isInitialized && allProducts.length > 0 && cartItems.length > 0) {
      // Only sync if product data actually changed
      if (prevProductsHashRef.current !== productsHash) {
        prevProductsHashRef.current = productsHash;
        dispatch(syncCartWithProducts(allProducts));
      }
    }
  }, [dispatch, isInitialized, allProducts, cartItems.length, productsHash]);

  const addToCart = (item: ProductType) => {
    dispatch(addToCartAction(item));
  };

  const removeFromCart = (itemId: string) => {
    dispatch(removeFromCartAction(itemId));
  };

  const updateCart = (
    itemId: string,
    quantity: number,
    selectedSize: string,
  ) => {
    dispatch(updateCartItem({ cartId: itemId, quantity, selectedSize }));
  };

  const clearCart = () => {
    dispatch(clearCartAction());
  };

  return (
    <CartContext.Provider
      value={{
        cartState: { cartArray: cartItems },
        addToCart,
        removeFromCart,
        updateCart,
        clearCart,
        freeShippingThreshold,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
