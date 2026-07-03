"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Leaf,
  ArrowRight,
  MagnifyingGlass,
} from "@phosphor-icons/react/dist/ssr";
import { ProductType } from "@/type/ProductType";
import ProductCard from "@/components/Product/ProductCard";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAllActiveProducts } from "@/store/slices/productsSlice";
import "@/styles/layout/featured-product.scss";
import { useCart } from "@/context/CartContext";
import { useModalCartContext } from "@/context/ModalCartContext";
import { useRouter } from "next/navigation";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";

const ProductShowcase: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Cart functionality
  const { addToCart, updateCart, cartState } = useCart();
  const { openModalCart } = useModalCartContext();
  const router = useRouter();

  // Fetch products from Redux
  const dispatch = useAppDispatch();
  const { allProducts, loading } = useAppSelector((state) => state.products);

  useEffect(() => {
    dispatch(fetchAllActiveProducts({ forceRefresh: true }));
  }, [dispatch]);

  // Memoize categories calculation
  const categories = useMemo(() => {
    const faceCount = allProducts.filter(
      (p) => p.categoryData?.name === "Face",
    ).length;
    const hairCount = allProducts.filter(
      (p) => p.categoryData?.name === "Hair",
    ).length;
    const bodyCount = allProducts.filter(
      (p) => p.categoryData?.name === "Body",
    ).length;

    return [
      { id: "all", name: "All", count: allProducts.length },
      { id: "face", name: "Face", count: faceCount },
      { id: "hair", name: "Hair", count: hairCount },
      { id: "body", name: "Body", count: bodyCount },
    ];
  }, [allProducts]);

  // Memoize filtered products
  const filteredProducts = useMemo(() => {
    return activeCategory === "all"
      ? allProducts
      : allProducts.filter(
          (product) =>
            product.categoryData?.slug === activeCategory ||
            product.categoryData?.name?.toLowerCase() === activeCategory,
        );
  }, [allProducts, activeCategory]);

  // Always show only 3 products, redirect to shop for more
  const displayedProducts = useMemo(
    () => filteredProducts.slice(0, 3),
    [filteredProducts],
  );

  const handleAddToCart = useCallback(
    (product: ProductType) => {
      const existingCartItem = cartState.cartArray.find(
        (item) => String(item.id) === String(product.id) && item.selectedSize === "",
      );

      if (!existingCartItem) {
        addToCart({ ...product, selectedSize: "" });
        updateCart(`${product.id}-`, product.quantityPurchase, "");
      } else {
        updateCart(
          existingCartItem.cartId,
          existingCartItem.quantity + Math.max(1, product.quantityPurchase || 1),
          "",
        );
      }
      openModalCart();
    },
    [cartState.cartArray, addToCart, updateCart, openModalCart],
  );

  const handleViewDetails = useCallback(
    (product: ProductType) => {
      const slug = product.slug || product.id;
      router.push(`/product/${slug}`);
    },
    [router],
  );

  const handleViewAllProducts = useCallback(() => {
    router.push("/product");
  }, [router]);

  if (loading && allProducts.length === 0) {
    return null;
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "face":
        return "var(--red)";
      case "hair":
        return "var(--accent)";
      case "body":
        return "var(--primary)";
      default:
        return "var(--secondary)";
    }
  };

  return (
    <LazyMotion features={domAnimation}>
    <section className="py-12 md:py-16 bg-white/60">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Modern Compact Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div className="max-w-xl">
            <m.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3"
            >
              <Leaf weight="fill" size={14} />
              <span>Naveenam Naturals</span>
            </m.div>
            <m.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-3xl font-bold text-black leading-tight"
            >
              Pure Ingredients, <br />
              <span className="text-secondary italic">Visible Results.</span>
            </m.h2>
          </div>

          {/* Compact Category Switcher */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex items-center p-1 bg-gray-100 rounded-xl w-fit"
          >
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`relative px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all duration-300 ${
                  activeCategory === category.id
                    ? "text-white"
                    : "text-secondary hover:text-black"
                }`}
              >
                {activeCategory === category.id && (
                  <m.div
                    layoutId="activeCategory"
                    className="absolute inset-0 bg-primary rounded-lg shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{category.name}</span>
              </button>
            ))}
          </m.div>
        </div>

        {/* Products Grid with Animation Library */}
        <m.div
          layout
          className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 md:gap-8"
        >
          <AnimatePresence mode="popLayout">
            {displayedProducts.map((product, index) => (
              <m.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <ProductCard
                  product={product}
                  index={index}
                  onAddToCart={handleAddToCart}
                  onViewDetails={handleViewDetails}
                  getCategoryColor={getCategoryColor}
                />
              </m.div>
            ))}
          </AnimatePresence>
        </m.div>

        {/* View All & Empty States */}
        <div className="mt-10 flex flex-col items-center">
          {filteredProducts.length > 3 ? (
            <m.button
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              onClick={handleViewAllProducts}
              className="group flex items-center gap-3 px-8 py-3 bg-white border-2 border-black text-black rounded-full font-bold hover:bg-black hover:text-white transition-all duration-300 shadow-sm"
            >
              <span>Explore All Products</span>
              <ArrowRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
              />
            </m.button>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MagnifyingGlass size={32} className="text-secondary" />
              </div>
              <h3 className="text-lg font-bold text-black mb-1">Coming Soon</h3>
              <p className="text-secondary text-sm">
                We're crafting something special for this category.
              </p>
            </div>
          ) : null}

          {filteredProducts.length > 3 && (
            <p className="text-xs text-secondary mt-4 font-medium uppercase tracking-widest opacity-60 text-center">
              <span className="numeric-contrast text-sm">
                {filteredProducts.length - 3}</span>+ More specialized products available
            
            </p>
          )}
        </div>
      </div>

      <style>{`
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </section>
    </LazyMotion>
  );
};

export default ProductShowcase;
