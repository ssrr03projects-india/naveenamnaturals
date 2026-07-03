"use client";

import React from "react";
import Image from "next/image";
import Marquee from "react-fast-marquee";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import "@/styles/product.scss";
import { ProductType } from "@/type/ProductType";
import toast from "react-hot-toast";
import { getBackendImageUrl } from "@/lib/utils";
import {
  formatProductPrice,
  getProductMaxDiscount,
} from "@/lib/price-utils";

interface ProductCardProps {
  product: ProductType;
  index?: number;
  onAddToCart: (product: ProductType) => void;
  onViewDetails: (product: ProductType) => void;
  getCategoryColor: (category: string) => string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  index = 0,
  onAddToCart,
  onViewDetails,
  getCategoryColor: _getCategoryColor,
}) => {
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);
  const [showTouchPreview, setShowTouchPreview] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 767.98px)");
    const handleViewportChange = () => setIsMobileViewport(mediaQuery.matches);

    handleViewportChange();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleViewportChange);
      return () =>
        mediaQuery.removeEventListener("change", handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  React.useEffect(() => {
    setShowTouchPreview(false);
  }, [product.id]);

  const percentSale = getProductMaxDiscount(product);
  const normalizedTag = String(product.tag || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, "");
  const isNewProduct = normalizedTag === "new";
  const isBestSellerProduct =
    normalizedTag === "bestseller" || normalizedTag === "bestselling";

  const primaryImage =
    product.images && Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : null;

  const secondaryImage =
    product.images && Array.isArray(product.images) && product.images.length > 1
      ? product.images[1]
      : null;
  const isTouchPreviewEnabled = isMobileViewport && Boolean(secondaryImage);
  const isMobileTouchPreviewActive =
    isTouchPreviewEnabled && showTouchPreview;
  const displayedImage =
    isMobileTouchPreviewActive && secondaryImage ? secondaryImage : primaryImage;

  const handleImageTouchPreview = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isTouchPreviewEnabled) return;
    event.stopPropagation();
    onViewDetails(product);
  };

  return (
    <div
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group flex flex-col cursor-pointer border border-line h-full"
      style={{
        animationDelay: `${index * 0.1}s`,
        animationName: "fadeInUp",
        animationDuration: "0.6s",
        animationTimingFunction: "ease-out",
        animationFillMode: "forwards",
        opacity: 0,
        transform: "translateY(20px)",
      }}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${product.name}`}
      onClick={() => onViewDetails(product)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onViewDetails(product);
        }
      }}
    >
      {/* Product Image - Square Aspect Ratio */}
      <div
        className="relative w-full aspect-square overflow-hidden bg-surface flex items-center justify-center"
        onClick={handleImageTouchPreview}
      >
        <Image
          src={getBackendImageUrl(displayedImage)}
          alt={product.name || "Product image"}
          width={500}
          height={500}
          loading={index < 6 ? "eager" : "lazy"}
          className={`w-full h-full object-contain transition-transform duration-300 ${!isMobileViewport ? "group-hover:scale-105" : ""
            }`}
        />
        {secondaryImage && !isMobileViewport && (
          <Image
            src={getBackendImageUrl(secondaryImage)}
            alt={product.name}
            width={500}
            height={500}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-contain opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
          />
        )}

        {(isNewProduct || isBestSellerProduct) && (
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
            {isNewProduct && (
              <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: "rgb(255, 243, 224)", color: "rgb(230, 81, 0)", border: "1px solid rgb(255, 204, 128)" }}>
                New
              </span>
            )}
            {isBestSellerProduct && (
              <span className="px-2 py-1 rounded text-[10px] sm:text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                Best Selling
              </span>
            )}
          </div>
        )}
        {percentSale > 0 && (
          <div className="product-tag text-button-uppercase text-white bg-red px-3 py-0.5 inline-block rounded-full absolute top-3 left-3 z-[1] numeric-contrast">
            {percentSale}%
          </div>
        )}
      </div>

      {/* Auto-scrolling Sale Banner between image and info */}
      {normalizedTag === "sale" &&
        (() => {
          const discountPercent = getProductMaxDiscount(product);
          if (discountPercent === 0) return null;
          return (
            <div className="relative overflow-hidden">
              <Marquee
                speed={30}
                gradient={false}
                className="bg-primary py-1.5"
              >
                <div className="flex items-center gap-2 px-3">
                  <span className="text-xs font-bold uppercase text-white whitespace-nowrap numeric-contrast">
                    🔥 Hot Sale {discountPercent}% OFF
                  </span>

                  <span className="text-xs font-bold uppercase text-white whitespace-nowrap numeric-contrast">
                    🔥 Hot Sale {discountPercent}% OFF
                  </span>

                  <span className="text-xs font-bold uppercase text-white whitespace-nowrap numeric-contrast">
                    🔥 Hot Sale {discountPercent}% OFF
                  </span>

                  <span className="text-xs font-bold uppercase text-white whitespace-nowrap numeric-contrast">
                    🔥 Hot Sale {discountPercent}% OFF
                  </span>
                </div>
              </Marquee>
            </div>
          );
        })()}

      {/* Product Info - Compact Design */}
      <div className="p-3 sm:p-4 flex flex-col gap-2 flex-1">
        {/* Title */}
        <h3 className="text-xs sm:text-base font-semibold text-gray-900 leading-snug break-words line-clamp-none min-h-[20px] sm:min-h-[24px]">
          {product.name}
        </h3>

        <p className="text-[14px] sm:text-sm font-regular text-gray line-clamp-1">
          {product.description}
        </p>

        {/* Price and Rating */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm sm:text-lg text-secondary font-semibold numeric-contrast">
              {formatProductPrice(product)}
            </span>
          </div>

          {(product.rate || 0) > -1 && (
            <div className="flex items-center gap-1">
              <Icon.Star
                size={12}
                weight="fill"
                className="text-red w-3 h-3 sm:w-3.5 sm:h-3.5"
              />
              <span className="text-xs sm:text-sm text-gray font-medium numeric-contrast">
                {(product.rate || 0).toFixed(1)}
              </span>
            </div>
          )}
        </div>
        <div className=" text-[8px] sm:text-xs font-medium tracking-[0.08em] text-gray-500">
          Incl.GST
        </div>

        {/* Add to Cart Button */}
        {product.quantity <= 0 ? (
          <div className="w-full bg-gray text-white py-2 sm:py-2.5 px-3 rounded-lg font-medium text-xs sm:text-sm mt-auto text-center cursor-not-allowed opacity-60 flex items-center justify-center gap-2">
            <Icon.XCircle size={14} weight="fill" />
            <span>Out of Stock</span>
          </div>
        ) : (
          <button
            type="button"
            aria-label={`Add ${product.name} to cart`}
            onClick={(e) => {
              e.stopPropagation();
              if (product.quantity <= 0) {
                toast.error("This product is currently out of stock.");
                return;
              }
              onAddToCart(product);
            }}
            className="bg-primary text-white py-2 sm:py-2.5 px-3 rounded-lg font-medium text-xs sm:text-sm mt-auto text-center flex items-center justify-center gap-2"
          >
            Add To Cart
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
