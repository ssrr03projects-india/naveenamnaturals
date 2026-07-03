"use client";

import React, { Suspense, useEffect, useCallback, useState } from "react";
import { useParams } from "next/navigation";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuCosmeticThree from "@/components/Header/Menu/MenuCosmeticThree";
import Sale from "@/components/Product/Detail/Sale";
import Footer from "@/components/Footer/Footer";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAllActiveProducts,
  fetchProduct,
  clearCurrentProduct,
} from "@/store/slices/productsSlice";
import SectionLoader from "@/components/Common/SectionLoader";

const ProductDetailContent = () => {
  const params = useParams();
  const slug = params?.slug as string;

  const dispatch = useAppDispatch();
  const { allProducts, currentProduct, loading, error } = useAppSelector(
    (state) => state.products,
  );
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  // Fetch all products for related products (only once)
  useEffect(() => {
    if (allProducts.length === 0) {
      dispatch(fetchAllActiveProducts());
    }
  }, [dispatch, allProducts.length]);

  // Fetch product by slug
  const loadProduct = useCallback(() => {
    if (slug) {
      setHasAttemptedLoad(true);
      dispatch(fetchProduct(slug));
    }
  }, [dispatch, slug]);

  useEffect(() => {
    loadProduct();
    return () => {
      dispatch(clearCurrentProduct());
    };
  }, [loadProduct, dispatch]);

  // Show loading if we're loading OR if we haven't attempted to load yet
  const isLoading = loading || !hasAttemptedLoad;

  // Loading state
  if (isLoading) {
    return (
      <>
        <TopNavOne
          props="style-one bg-primary"
          slogan="Welcome to Naveenam Naturals Store"
        />
        <div id="header" className="relative w-full">
          <MenuCosmeticThree />
        </div>
        <SectionLoader label="Loading product..." />
        <Footer />
      </>
    );
  }

  // Not found state - only show if we've attempted to load and got no result
  if (hasAttemptedLoad && !loading && !currentProduct) {
    return (
      <>
        <TopNavOne
          props="style-one bg-primary"
          slogan="Welcome to Naveenam Naturals Store"
        />
        <div id="header" className="relative w-full">
          <MenuCosmeticThree />
        </div>
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-black mb-2">
            Product Not Found
          </h2>
          <p className="text-secondary">
            The product you're looking for doesn't exist.
          </p>
          {error && <p className="text-red text-sm mt-2">{error}</p>}
        </div>
        <Footer />
      </>
    );
  }

  // Get related products (limit to 20)
  const relatedProducts = currentProduct
    ? [
        currentProduct,
        ...allProducts
          .filter((p) => String(p.id) !== String(currentProduct.id))
          .slice(0, 19),
      ]
    : allProducts.slice(0, 20);

  return (
    <>
      <TopNavOne
        props="style-one bg-primary"
        slogan="Welcome to Naveenam Naturals Store"
      />
      <div id="header" className="relative w-full">
        <MenuCosmeticThree />
      </div>
      <Sale data={relatedProducts} productId={currentProduct!.id} />
      <Footer />
    </>
  );
};

const ProductDetailPage = () => {
  return (
    <Suspense fallback={null}>
      <ProductDetailContent />
    </Suspense>
  );
};

export default ProductDetailPage;
