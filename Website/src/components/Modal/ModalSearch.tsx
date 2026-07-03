"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Marquee from "react-fast-marquee";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useModalSearchContext } from "@/context/ModalSearchContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAllActiveProducts,
  fetchProducts,
} from "@/store/slices/productsSlice";
import { ProductType } from "@/type/ProductType";
import { useCart } from "@/context/CartContext";
import { useModalCartContext } from "@/context/ModalCartContext";
import { getBackendImageUrl } from "@/lib/utils";
import { formatProductPrice, getProductMaxDiscount } from "@/lib/price-utils";

const SearchProductCard = ({
  product,
  onClick,
  onAddToCart,
}: {
  product: ProductType;
  onClick: (product: ProductType) => void;
  onAddToCart: (product: ProductType) => void;
}) => {
  return (
    <div
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer border border-line"
      onClick={() => onClick(product)}
    >
      {/* Product Image */}
      <div className="relative h-[200px] w-full overflow-hidden bg-surface flex items-center justify-center">
        <Image
          src={getBackendImageUrl(
            Array.isArray(product.images) && product.images.length > 0
              ? product.images[0]
              : "",
          )}
          alt={product.name}
          width={300}
          height={300}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badges */}
        {product.tag?.toLowerCase() === "new" && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-1 rounded text-xs font-medium bg-purple text-white">
              New
            </span>
          </div>
        )}
      </div>

      {/* Auto-scrolling Sale Banner between image and info */}
      {product.tag?.toLowerCase() === "sale" &&
        (() => {
          const discountPercent = getProductMaxDiscount(product);
          if (discountPercent === 0) return null;
          return (
            <div className="relative overflow-hidden">
              <Marquee speed={30} gradient={false} className="bg-black py-1.5">
                <div className="flex items-center gap-2 px-3">
                  <Icon.Lightning
                    weight="fill"
                    className="text-yellow"
                    size={16}
                  />
                  <span className="text-xs font-bold uppercase text-white whitespace-nowrap">
                    🔥 Hot Sale {discountPercent}% OFF
                  </span>
                  <Icon.Lightning
                    weight="fill"
                    className="text-yellow"
                    size={16}
                  />
                  <span className="text-xs font-bold uppercase text-white whitespace-nowrap">
                    🔥 Hot Sale {discountPercent}% OFF
                  </span>
                  <Icon.Lightning
                    weight="fill"
                    className="text-yellow"
                    size={16}
                  />
                  <span className="text-xs font-bold uppercase text-white whitespace-nowrap">
                    🔥 Hot Sale {discountPercent}% OFF
                  </span>
                </div>
              </Marquee>
            </div>
          );
        })()}

      {/* Product Info */}
      <div className="p-3 flex flex-col gap-2">
        {/* Title */}
        <h3 className="text-sm font-semibold text-black line-clamp-2 min-h-[40px]">
          {product.name}
        </h3>

        {/* Price and Rating */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-black">
              {formatProductPrice(product)}
            </span>
            {getProductMaxDiscount(product) > 0 && (
              <span className="text-xs text-secondary font-semibold">
                {getProductMaxDiscount(product)}% OFF
              </span>
            )}
          </div>
          {(product.rate || 0) > 0 && (
            <div className="flex items-center gap-1">
              <Icon.Star size={12} weight="fill" className="text-yellow" />
              <span className="text-xs text-secondary font-medium">
                {(product.rate || 0).toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          className="w-full bg-primary text-white py-2 px-3 rounded-lg font-medium hover:bg-secondary transition-colors duration-300 text-xs mt-2"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
        >
          Add To Cart
        </button>
      </div>
    </div>
  );
};

const ModalSearch = () => {
  const { isModalOpen, closeModalSearch } = useModalSearchContext();
  const [searchKeyword, setSearchKeyword] = useState("");
  const router = useRouter();
  const { addToCart } = useCart();
  const { openModalCart } = useModalCartContext();

  const handleAddToCart = (product: ProductType) => {
    addToCart(product);
    openModalCart();
  };

  const handleViewDetails = (product: ProductType) => {
    router.push(`/product/${product.slug || product.id}`);
    closeModalSearch();
    setSearchKeyword("");
  };

  const dispatch = useAppDispatch();
  const {
    allProducts: allProductsData,
    filteredProducts,
    loading: productsLoading,
  } = useAppSelector((state) => state.products);

  // Fetch all products on mount
  useEffect(() => {
    if (allProductsData.length === 0) {
      dispatch(fetchAllActiveProducts());
    }
  }, [dispatch, allProductsData.length]);

  // Fetch searched products when search keyword exists
  useEffect(() => {
    if (searchKeyword.trim().length > 0) {
      dispatch(
        fetchProducts({
          search: searchKeyword.trim(),
          isActive: true,
          limit: 8,
        }),
      );
    }
  }, [dispatch, searchKeyword]);

  // Extract products array and limit to 100 for display
  const allProducts: ProductType[] = allProductsData.slice(0, 100);

  // Use filtered products for search results
  const searchedProducts: ProductType[] =
    searchKeyword.trim().length > 0 ? filteredProducts : [];

  // Show loading state only when actively searching
  const isLoading = productsLoading && searchKeyword.trim().length > 0;
  const loadingAll = productsLoading && searchKeyword.trim().length === 0;

  const handleSearch = (value: string) => {
    if (value.trim()) {
      router.push(`/product?search=${encodeURIComponent(value)}`);
      closeModalSearch();
      setSearchKeyword("");
    }
  };

  return (
    <>
      <div className="modal-search-block" onClick={closeModalSearch}>
        <div
          className={`modal-search-main md:p-10 p-6 rounded-[32px] ${
            isModalOpen ? "open" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="form-search relative">
            <Icon.MagnifyingGlass
              className="absolute heading5 right-6 top-1/2 -translate-y-1/2 cursor-pointer"
              onClick={() => {
                handleSearch(searchKeyword);
              }}
            />
            <input
              type="text"
              placeholder="Search products..."
              className="text-button-lg h-14 rounded-2xl border border-line w-full pl-6 pr-12"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && handleSearch(searchKeyword)
              }
            />
          </div>

          {/* Search Results - Show when typing */}
          {searchKeyword.trim() && (
            <div className="search-results mt-6 max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <div className="caption1 text-secondary mt-4">
                    Searching products...
                  </div>
                </div>
              ) : searchedProducts.length > 0 ? (
                <>
                  <div className="heading6 mb-4">
                    Found {searchedProducts.length}{" "}
                    {searchedProducts.length === 1 ? "product" : "products"} for
                    "{searchKeyword}"
                  </div>
                  <div className="list-product hide-product-sold grid xl:grid-cols-4 lg:grid-cols-3 sm:grid-cols-2 gap-4">
                    {searchedProducts.map(
                      (product: ProductType, index: number) => (
                        <div
                          key={product.id}
                          style={{
                            animationDelay: `${index * 0.1}s`,
                            animation: "fadeInUp 0.6s ease-out forwards",
                          }}
                        >
                          <SearchProductCard
                            product={product}
                            onClick={handleViewDetails}
                            onAddToCart={handleAddToCart}
                          />
                        </div>
                      ),
                    )}
                  </div>
                  {searchedProducts.length >= 8 && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => handleSearch(searchKeyword)}
                        className="button-main px-6 py-2"
                      >
                        View All Results
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="heading6 text-secondary mb-2">
                    No products found
                  </div>
                  <div className="caption1 text-secondary">
                    Try searching with different keywords
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recently viewed products - Show when not searching */}
          {!searchKeyword.trim() && (
            <div className="list-recent mt-8">
              <div className="heading6 mb-4">Recently Viewed Products</div>
              {loadingAll ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <div className="caption1 text-secondary mt-4">
                    Loading products...
                  </div>
                </div>
              ) : allProducts.length > 0 ? (
                <div className="list-product pb-5 hide-product-sold grid xl:grid-cols-4 lg:grid-cols-3 sm:grid-cols-2 gap-4 mt-4">
                  {allProducts
                    .slice(0, 4)
                    .map((product: ProductType, index: number) => (
                      <div
                        key={product.id}
                        style={{
                          animationDelay: `${index * 0.1}s`,
                          animation: "fadeInUp 0.6s ease-out forwards",
                        }}
                      >
                        <SearchProductCard
                          product={product}
                          onClick={handleViewDetails}
                          onAddToCart={handleAddToCart}
                        />
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="caption1 text-secondary">
                    No products available
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Animations */}
          <style jsx>{`
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      </div>
    </>
  );
};

export default ModalSearch;
