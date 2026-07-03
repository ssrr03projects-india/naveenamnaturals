"use client";

import React, { Suspense, useEffect, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import ShopFilterCanvas from "@/components/Shop/ShopFilterCanvas";
import Footer from "@/components/Footer/Footer";
import MenuCosmeticThree from "@/components/Header/Menu/MenuCosmeticThree";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProducts } from "@/store/slices/productsSlice";
import SectionLoader from "@/components/Common/SectionLoader";

const FilterCanvasContent = () => {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") || undefined;
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search") || undefined;

  const normalizeCategoryValue = (value?: string): string => {
    if (!value) return "";
    const normalized = value.toLowerCase().trim().replace(/[_\s]+/g, "-");
    if (normalized.includes("face")) return "face";
    if (normalized.includes("hair")) return "hair";
    if (normalized.includes("body")) return "body";
    return normalized;
  };

  const normalizedCategory = normalizeCategoryValue(category || typeParam);
  const activeType = normalizedCategory || undefined;

  const dispatch = useAppDispatch();
  const { filteredProducts, loading } = useAppSelector(
    (state) => state.products,
  );
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  // Memoize fetch to avoid unnecessary re-renders
  const loadProducts = useCallback(() => {
    const limit = 1000;
    const normalizedSearch = search?.trim() || undefined;

    setHasAttemptedLoad(true);
    dispatch(
      fetchProducts({
        isActive: true,
        limit,
        search: normalizedSearch,
        forceRefresh: true,
      }),
    );
  }, [dispatch, search]);

  // Fetch only when filters change
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Show loading if we're loading OR if we haven't attempted to load yet
  const isLoading = loading || !hasAttemptedLoad;

  return (
    <>
      <TopNavOne
        props="style-one bg-primary"
        slogan="Welcome to Naveenam Naturals Store"
      />
      <div id="header" className="relative w-full">
        <MenuCosmeticThree />
      </div>
      {isLoading ? (
        <SectionLoader label="Loading products..." />
      ) : (
        <ShopFilterCanvas
          data={filteredProducts}
          productPerPage={12}
          dataType={activeType || null}
          productStyle="style-one"
        />
      )}
      <Footer />
    </>
  );
};

const FilterCanvas = () => {
  return (
    <Suspense fallback={null}>
      <FilterCanvasContent />
    </Suspense>
  );
};

export default FilterCanvas;
