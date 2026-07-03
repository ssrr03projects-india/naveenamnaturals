"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import "@/styles/cart.scss";
import { ProductType } from "@/type/ProductType";
import { useModalCartContext } from "@/context/ModalCartContext";
import { useCart } from "@/context/CartContext";
import { getBackendImageUrl } from "@/lib/utils";
import { getMaxStock } from "@/lib/stock-utils";
import { calculateGstInclusivePrice } from "@/lib/price-utils";
import toast from "react-hot-toast";

const resolveCartItemGstRate = (item: ProductType): number => {
  const itemRate =
    item.gstPercentage !== undefined && item.gstPercentage !== null
      ? Number(item.gstPercentage)
      : NaN;
  if (Number.isFinite(itemRate) && itemRate > 0) {
    return itemRate;
  }

  const matchedVariant = item.variants?.find((variant) => {
    if (item.variantId) {
      return String(variant.id) === String(item.variantId);
    }
    if (item.selectedSize) {
      return variant.name === item.selectedSize || variant.weight === item.selectedSize;
    }
    return false;
  });

  const matchedVariantRate =
    matchedVariant?.gstPercentage !== undefined &&
    matchedVariant?.gstPercentage !== null
      ? Number(matchedVariant.gstPercentage)
      : NaN;
  if (Number.isFinite(matchedVariantRate) && matchedVariantRate > 0) {
    return matchedVariantRate;
  }

  const fallbackVariantRate =
    item.variants?.[0]?.gstPercentage !== undefined &&
    item.variants?.[0]?.gstPercentage !== null
      ? Number(item.variants[0].gstPercentage)
      : NaN;

  return Number.isFinite(fallbackVariantRate) && fallbackVariantRate > 0
    ? fallbackVariantRate
    : 0;
};

const ModalCart = () => {
  const { isModalOpen, closeModalCart } = useModalCartContext();
  const { cartState, removeFromCart, updateCart, freeShippingThreshold } =
    useCart();
  const [totalCart, setTotalCart] = useState<number>(0);

  // Calculate total
  useEffect(() => {
    const total = cartState.cartArray.reduce(
      (sum, item) =>
        sum +
        calculateGstInclusivePrice(item.price, resolveCartItemGstRate(item)) *
          item.quantity,
      0,
    );
    setTotalCart(total);
  }, [cartState.cartArray]);

  const hasFreeShippingThreshold =
    freeShippingThreshold !== null && freeShippingThreshold > 0;
  const hasReachedFreeShipping =
    hasFreeShippingThreshold && totalCart >= freeShippingThreshold;
  const freeShippingRemaining = hasFreeShippingThreshold
    ? Math.max(0, freeShippingThreshold - totalCart)
    : 0;

  const handleIncreaseQuantity = (product: ProductType) => {
    const maxStock = getMaxStock(product, product.selectedSize);
    if (product.quantity >= maxStock) {
      toast.error(`Max stock reached (${maxStock})`);
      return;
    }

    if ("cartId" in product) {
      updateCart(
        (product as any).cartId,
        product.quantity + 1,
        product.selectedSize || "",
      );
    }
  };

  const handleDecreaseQuantity = (product: ProductType) => {
    if (product.quantity > 1) {
      if ("cartId" in product) {
        updateCart(
          (product as any).cartId,
          product.quantity - 1,
          product.selectedSize || "",
        );
      }
    } else {
      // Optional: remove if quantity becomes 0? Or just keep at 1. Design says "Save for later" removes.
    }
  };

  const handleRemove = (product: ProductType) => {
    // "Save for Later" currently functions as remove
    if ("cartId" in product) {
      removeFromCart((product as any).cartId);
      toast.success("Removed from cart");
    }
  };

  const progressPercent = hasFreeShippingThreshold
    ? Math.min((totalCart / freeShippingThreshold) * 100, 100)
    : 0;

  return (
    <>
      <div
        className={`modal-cart-block ${isModalOpen ? "open" : ""}`}
        onClick={closeModalCart}
      >
        <div
          className={`modal-cart-main flex flex-col w-full max-w-[480px] h-screen bg-surface shadow-2xl transition-transform duration-300 ml-auto ${isModalOpen ? "translate-x-0 open" : "translate-x-full"}`}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {/* Header */}
          <div className="flex flex-col px-6 pt-8 pb-4 bg-surface">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-secondary font-serif text-3xl italic">
                My Basket
              </h2>
              <button
                onClick={closeModalCart}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary/5 transition-colors"
              >
                <Icon.X size={24} className="text-secondary" />
              </button>
            </div>

            {/* Free Gift Progress */}
            {hasFreeShippingThreshold && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                    Free Shipping
                  </span>
                  <span className="text-xs text-secondary numeric-contrast">
                    {hasReachedFreeShipping
                      ? "Goal Reached!"
                      : `${String.fromCharCode(8377)}${freeShippingRemaining.toFixed(0)} away`}
                  </span>
                </div>
                <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-6 py-2">
            {cartState.cartArray.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-secondary">
                <Icon.ShoppingCart size={48} className="mb-4 opacity-50" />
                <p className="font-medium">Your basket is empty</p>
                <button
                  onClick={closeModalCart}
                  className="mt-4 text-accent hover:underline font-medium"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {cartState.cartArray.map((product) => {
                  const gstRate = resolveCartItemGstRate(product);
                  const unitPriceWithGst = calculateGstInclusivePrice(
                    product.price,
                    gstRate,
                  );
                  return (
                    <div
                      key={(product as any).cartId || product.id}
                      className="flex gap-4"
                    >
                    {/* Image */}
                    <div className="w-24 h-32 flex-shrink-0 bg-surface rounded-lg border border-white p-2 flex items-center justify-center">
                      <Image
                        src={getBackendImageUrl(product.images?.[0])}
                        width={80}
                        height={96}
                        alt={product.name || "Product"}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-secondary text-sm leading-tight max-w-[140px]">
                            {product.name}
                          </h4>
                          <span className="font-bold text-secondary text-sm">
                            <span className="numeric-contrast">
                              ₹{unitPriceWithGst.toFixed(0)}
                            </span>
                          </span>
                        </div>
                        <p className="text-xs text-secondary2 mb-3">
                          {product.selectedSize ||
                            (() => {
                              if (
                                Array.isArray(product.sizes) &&
                                product.sizes.length > 0
                              ) {
                                const firstSize = product.sizes[0];
                                if (
                                  typeof firstSize === "object" &&
                                  "size" in firstSize
                                ) {
                                  return firstSize.size;
                                }
                                return String(firstSize);
                              }
                              return "Regular";
                            })()}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        {/* Quantity */}
                        <div className="flex items-center border border-white rounded-md h-8 bg-surface">
                          <button
                            onClick={() => handleDecreaseQuantity(product)}
                            className="w-8 h-full flex items-center justify-center text-secondary hover:bg-surface rounded-l-md"
                          >
                            <Icon.Minus size={12} />
                          </button>
                          <span className="w-8 text-center text-xs font-medium text-secondary">
                            {product.quantity}
                          </span>
                          <button
                            onClick={() => handleIncreaseQuantity(product)}
                            disabled={
                              product.quantity >=
                              getMaxStock(product, product.selectedSize)
                            }
                            className={`w-8 h-full flex items-center justify-center text-secondary rounded-r-md ${product.quantity >= getMaxStock(product, product.selectedSize) ? "opacity-30 cursor-not-allowed" : "hover:bg-surface"}`}
                          >
                            <Icon.Plus size={12} />
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemove(product)}
                          className="text-[10px] font-bold text-secondary border-b border-secondary hover:text-accent hover:border-accent uppercase tracking-wider transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Eco Badges (in scrollable area or footer? Design usually puts in footer but let's put slightly above footer) */}
            {cartState.cartArray.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-8 py-6 border-t border-white">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-secondary">
                    <Icon.Package size={20} weight="light" />
                  </div>
                  <span className="text-[10px] font-medium text-secondary leading-tight">
                    Eco-Friendly
                    <br />
                    Packing
                  </span>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-secondary">
                    <Icon.Plant size={20} weight="light" />
                  </div>
                  <span className="text-[10px] font-medium text-secondary leading-tight">
                    Natural
                    <br />
                    Ingredients
                  </span>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-secondary">
                    <Icon.Leaf size={20} weight="light" />
                  </div>
                  <span className="text-[10px] font-medium text-secondary leading-tight">
                    Carbon
                    <br />
                    Neutral
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {cartState.cartArray.length > 0 && (
            <div className="px-6 py-6 bg-surface border-t border-white">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center text-secondary">
                  <span className="text-sm">Subtotal</span>
                  <span className="font-bold numeric-contrast">
                    ₹{totalCart.toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-secondary text-lg pt-2 mt-2 border-t border-dashed border-white">
                  <span className="font-bold">Total</span>
                  <span className="font-bold numeric-contrast">
                    ₹{totalCart.toFixed(0)}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                onClick={closeModalCart}
                className="block w-full"
              >
                <button className="w-full bg-primary text-white font-bold tracking-widest uppercase py-3.5 rounded hover:bg-secondary transition-colors">
                  Checkout
                </button>
              </Link>

              <Link
                href="/cart"
                onClick={closeModalCart}
                className="block w-full mt-3"
              >
                <button className="w-full bg-surface text-primary border border-primary font-bold tracking-widest uppercase py-3.5 rounded hover:bg-primary hover:text-white transition-colors">
                  View Cart
                </button>
              </Link>

              <div className="text-center mt-3">
                <button
                  onClick={closeModalCart}
                  className="text-xs text-secondary2 hover:text-primary underline decoration-1 underline-offset-2"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ModalCart;
