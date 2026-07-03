"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/context/CartContext";

import MenuCosmeticThree from "@/components/Header/Menu/MenuCosmeticThree";
import toast from "react-hot-toast";
import { getMaxStock } from "@/lib/stock-utils";
import { calculateGstInclusivePrice } from "@/lib/price-utils";
import { ProductType } from "@/type/ProductType";

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

const Cart = () => {
  const router = useRouter();

  const { cartState, updateCart, removeFromCart, freeShippingThreshold } =
    useCart();

  const handleQuantityChange = (cartId: string, newQuantity: number) => {
    const itemToUpdate = cartState.cartArray.find(
      (item) => item.cartId === cartId,
    );

    if (itemToUpdate) {
      const maxStock = getMaxStock(itemToUpdate, itemToUpdate.selectedSize);
      if (newQuantity > maxStock) {
        toast.error(`Max stock available is ${maxStock}`);
        return;
      }
      updateCart(cartId, newQuantity, itemToUpdate.selectedSize);
    }
  };

  const handleRemoveItem = (cartId: string, productName: string) => {
    removeFromCart(cartId);
    toast.success(`${productName} removed from cart`);
  };

  // Calculate subtotal
  const subtotal = cartState.cartArray.reduce(
    (sum, item) =>
      sum +
      calculateGstInclusivePrice(item.price, resolveCartItemGstRate(item)) *
        item.quantity,
    0,
  );

  const hasFreeShippingThreshold =
    freeShippingThreshold !== null && freeShippingThreshold > 0;
  const amountToFreeShipping = hasFreeShippingThreshold
    ? Math.max(0, freeShippingThreshold - subtotal)
    : 0;
  const shippingProgress = hasFreeShippingThreshold
    ? Math.min(100, (subtotal / freeShippingThreshold) * 100)
    : 0;

  const total = subtotal;

  const redirectToCheckout = () => {
    if (cartState.cartArray.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    router.push("/checkout");
  };

  return (
    <>
      <TopNavOne
        props="style-one bg-primary"
        slogan="Welcome to Naveenam Naturals Store"
      />
      <div id="header" className="relative w-full">
        <MenuCosmeticThree />
        <Breadcrumb heading="Shopping cart" subHeading="Shopping cart" />
      </div>
      <div className="cart-block md:py-16 py-8 bg-surface text-[15px] sm:text-base">
        <div className="container max-w-7xl mx-auto px-4">
          {cartState.cartArray.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 sm:py-20">
              <Icon.ShoppingCart size={64} className="text-secondary/40 mb-4" />
              <h2 className="text-xl sm:text-2xl font-semibold text-secondary mb-2">
                Your cart is empty
              </h2>
              <p className="text-sm sm:text-base text-secondary/80 mb-6 text-center">
                Looks like you haven't added anything to your cart yet.
              </p>
              <Link
                href="/product"
                className="button-main px-6 py-3 rounded-xl"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <>
              {/* Page Title */}
              <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black mb-2">
                  Shopping Bag
                  <span className="text-secondary/60 text-base sm:text-xl lg:text-2xl ml-2 sm:ml-3">
                    (<span className="numeric-contrast">{cartState.cartArray.length}</span> Items)
                  </span>
                </h1>
              </div>

              {/* Free Shipping Progress */}
              {hasFreeShippingThreshold && amountToFreeShipping > 0 && (
                <div className="bg-white rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-sm border border-outline">
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <div className="flex items-center gap-2">
                      <Icon.Truck size={20} className="text-accent shrink-0" />
                      <span className="text-xs sm:text-sm font-medium text-secondary">
                        Only{" "}
                        <span className="text-accent font-bold numeric-contrast">
                          ₹{amountToFreeShipping.toFixed(0)}
                        </span>{" "}
                        away from{" "}
                        <span className="font-bold text-black">
                          Free Shipping!
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="relative w-full h-2 bg-secondary/10 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-accent transition-all duration-500 rounded-full"
                      style={{ width: `${shippingProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="content-main flex justify-between max-xl:flex-col gap-6 lg:gap-8">
                {/* Cart Items */}
                <div className="xl:w-2/3 w-full">
                  <div className="space-y-4">
                    {cartState.cartArray.map((product, index) => {
                      const gstRate = resolveCartItemGstRate(product);
                      const unitPriceWithGst = calculateGstInclusivePrice(
                        product.price,
                        gstRate,
                      );
                      const linePriceWithGst = unitPriceWithGst * product.quantity;
                      const unitOriginPriceWithGst = calculateGstInclusivePrice(
                        product.originPrice,
                        gstRate,
                      );
                      const lineOriginPriceWithGst =
                        unitOriginPriceWithGst * product.quantity;
                      return (
                        <div
                          key={
                            product.cartId ||
                            `${String(product.id)}-${product.selectedSize || "default"}-${index}`
                          }
                          className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-outline hover:shadow-md transition-shadow"
                        >
                        <div className="flex gap-4 sm:gap-6 max-md:flex-col">
                          {/* Product Image */}
                          <div className="flex-shrink-0">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl overflow-hidden bg-surface">
                              <Image
                                src={
                                  Array.isArray(product.images) &&
                                  product.images.length > 0
                                    ? product.images[0]
                                    : typeof product.images === "string"
                                      ? product.images
                                      : "/images/product/default.png"
                                }
                                width={200}
                                height={200}
                                alt={
                                  typeof product.name === "string" &&
                                  product.name.trim().length > 0
                                    ? `${product.name} image`
                                    : "Product image"
                                }
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>

                          {/* Product Details */}
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="text-base sm:text-lg font-semibold text-black mb-1">
                                {product.name}
                              </h4>
                              <div className="text-sm text-secondary/60 flex flex-col gap-1">
                                {product.selectedSize && (
                                  <span>
                                    {product.selectedSize} | Travel Friendly
                                  </span>
                                )}
                              </div>
                            </div>

                              <div className="flex items-center justify-between mt-4 max-md:flex-col max-md:items-start max-md:gap-3">
                              {/* Quantity Controls */}
                              <div className="flex items-center gap-3 border border-outline rounded-full px-4 py-2">
                                <button
                                  onClick={() => {
                                    if (product.quantity > 1) {
                                      handleQuantityChange(
                                        product.cartId,
                                        product.quantity - 1,
                                      );
                                    }
                                  }}
                                  disabled={product.quantity === 1}
                                  className={`w-6 h-6 flex items-center justify-center transition-colors ${
                                    product.quantity === 1
                                      ? "opacity-30 cursor-not-allowed"
                                      : "hover:text-primary cursor-pointer"
                                  }`}
                                >
                                  <Icon.Minus size={16} weight="bold" />
                                </button>
                                <span className="w-8 text-center font-semibold text-black numeric-contrast">
                                  {product.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    handleQuantityChange(
                                      product.cartId,
                                      product.quantity + 1,
                                    )
                                  }
                                  disabled={
                                    product.quantity >=
                                    getMaxStock(product, product.selectedSize)
                                  }
                                  className={`w-6 h-6 flex items-center justify-center transition-colors cursor-pointer ${product.quantity >= getMaxStock(product, product.selectedSize) ? "opacity-30 cursor-not-allowed" : "hover:text-primary"}`}
                                >
                                  <Icon.Plus size={16} weight="bold" />
                                </button>
                              </div>

                              {/* Price */}
                              <div className="text-right max-md:text-left">
                                <p className="text-xl sm:text-2xl font-bold text-secondary numeric-contrast">
                                  ₹{linePriceWithGst.toFixed(0)}
                                </p>
                                {product.originPrice &&
                                  product.originPrice > product.price && (
                                    <p className="text-sm text-secondary/60 line-through numeric-contrast">
                                      ₹{lineOriginPriceWithGst.toFixed(0)}
                                    </p>
                                  )}
                              </div>
                            </div>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() =>
                              handleRemoveItem(product.cartId, product.name)
                            }
                            className="text-secondary/60 hover:text-error transition-colors p-1.5 sm:p-2 self-start"
                            title="Remove item"
                          >
                            <span className="text-sm uppercase font-medium">
                              REMOVE
                            </span>
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="xl:w-1/3 w-full">
                  <div className="bg-white rounded-2xl border border-outline shadow-sm p-4 sm:p-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-black mb-5 sm:mb-6">
                      Order Summary
                    </h3>

                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between items-center text-sm sm:text-base">
                        <span className="text-secondary">Subtotal</span>
                        <span className="font-semibold text-black numeric-contrast">
                          ₹{subtotal.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm sm:text-base">
                        <span className="text-secondary">Shipping</span>
                        <span className="text-sm text-secondary">
                          Calculated at checkout
                        </span>
                      </div>
                      <div className="pt-4 border-t border-outline">
                        <div className="flex justify-between items-center">
                          <span className="text-lg sm:text-xl font-bold text-black">
                            Total
                          </span>
                          <span className="text-xl sm:text-2xl font-bold text-primary numeric-contrast">
                            ₹{total.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={redirectToCheckout}
                      className="w-full bg-primary hover:bg-secondary text-white font-bold py-3.5 sm:py-4 px-5 sm:px-6 rounded-full transition-all mb-4 uppercase text-xs sm:text-sm flex items-center justify-center gap-2"
                    >
                      Proceed to Checkout
                      <Icon.ArrowRight size={18} weight="bold" />
                    </button>

                    <div className="text-center mb-6">
                      <Link
                        href="/product"
                        className="text-sm font-medium text-secondary hover:text-black transition-colors uppercase"
                      >
                        Continue Shopping
                      </Link>
                    </div>

                    {/* Trust Badges */}
                    <div className="space-y-3 pt-6 border-t border-outline">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                          <Icon.Check
                            size={12}
                            weight="bold"
                            className="text-success"
                          />
                        </div>
                        <span className="text-sm text-secondary">
                          Secure SSL encryption for all payments
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                          <Icon.Check
                            size={12}
                            weight="bold"
                            className="text-success"
                          />
                        </div>
                        <span className="text-sm text-secondary">
                          <span className="numeric-contrast">100%</span> Authentic Products
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Cart;
