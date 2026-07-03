"use client";

import React, { useState, useEffect } from "react";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { ProductType } from "@/type/ProductType";
import "@/styles/shop.scss";
import ProductCard from "../Product/ProductCard";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import HandlePagination from "../Other/HandlePagination";
import { useCart } from "@/context/CartContext";
import { useModalCartContext } from "@/context/ModalCartContext";
import { useRouter, useSearchParams } from "next/navigation";
import { categoryApi } from "@/lib/api";
import { getProductMaxDiscount } from "@/lib/price-utils";

interface Props {
  data: Array<ProductType>;
  productPerPage: number;
  dataType: string | null;
  productStyle: string;
}

interface CategoryOption {
  id: string | number;
  name: string;
  slug: string;
}

const ShopFilterCanvas: React.FC<Props> = ({
  data,
  productPerPage,
  dataType,
  productStyle: _productStyle,
}) => {
  // Use only real data from API - no dummy data fallback
  const productData = data || [];

  const [layoutCol, setLayoutCol] = useState<number | null>(4);
  const [showOnlySale, setShowOnlySale] = useState(false);
  const [sortOption, setSortOption] = useState("");
  const [openSidebar, setOpenSidebar] = useState(false);
  const [type, setType] = useState<string | null>(null);
  const [isTypeManuallySet, setIsTypeManuallySet] = useState(false);
  const [size, setSize] = useState<string | null>();
  const [color, setColor] = useState<string | null>();
  const [brand, setBrand] = useState<string | null>();
  const [inStock, setInStock] = useState<boolean>(false);
  // Calculate price range from products
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({
    min: 0,
    max: 10000,
  });

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const searchParams = useSearchParams(); // Need to import this
  const currentCategorySlug = searchParams.get("category");

  const normalizeCategoryValue = (value?: string | null): string => {
    if (!value) return "";
    const normalized = value.toLowerCase().trim().replace(/[_\s]+/g, "-");
    if (normalized.includes("face")) return "face";
    if (normalized.includes("hair")) return "hair";
    if (normalized.includes("body")) return "body";
    return normalized;
  };

  const getProductCategoryKey = (product: ProductType): string =>
    normalizeCategoryValue(
      product.type ||
        product.categoryData?.slug ||
        product.categoryData?.name ||
        product.category,
    );

  const getProductSoldCount = (product: ProductType): number => {
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      const variantsSold = product.variants.reduce((sum, variant) => {
        const soldValue =
          typeof variant.sold === "number"
            ? variant.sold
            : parseFloat(String(variant.sold || 0));
        return sum + (Number.isFinite(soldValue) ? soldValue : 0);
      }, 0);
      if (variantsSold > 0 || Number(product.sold || 0) === 0) {
        return variantsSold;
      }
    }

    const fallbackSold =
      typeof product.sold === "number"
        ? product.sold
        : parseFloat(String(product.sold || 0));
    return Number.isFinite(fallbackSold) ? fallbackSold : 0;
  };

  const getProductDiscountPercent = (product: ProductType): number =>
    getProductMaxDiscount(product);

  const normalizeTagValue = (value?: string | null): string =>
    String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[\s_-]+/g, "");

  const isBestSellerTagged = (product: ProductType): boolean => {
    const normalizedTag = normalizeTagValue(product.tag);
    return normalizedTag === "bestseller" || normalizedTag === "bestselling";
  };

  useEffect(() => {
    const normalizedRouteType =
      normalizeCategoryValue(dataType || currentCategorySlug) || null;
    setType(normalizedRouteType);
    setIsTypeManuallySet(false);
    setCurrentPage(0);
  }, [dataType, currentCategorySlug]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryApi.getAllCategories();
        // Ensure we always set an array
        if (response.data) {
          if (Array.isArray(response.data)) {
            setCategories(response.data);
          } else if (response.data.data && Array.isArray(response.data.data)) {
            setCategories(response.data.data);
          } else {
            console.warn("Categories response is not an array:", response.data);
            setCategories([]);
          }
        } else {
          setCategories([]);
        }
      } catch (error) {
        console.error("Failed to fetch categories", error);
        setCategories([]); // Ensure it's always an array even on error
      }
    };
    fetchCategories();
  }, []);

  // Update price range based on actual product prices
  useEffect(() => {
    if (productData.length > 0) {
      const prices = productData
        .map((p) =>
          typeof p.price === "number"
            ? p.price
            : parseFloat(String(p.price || 0)),
        )
        .filter((p) => p > 0);
      if (prices.length > 0) {
        const minPrice = Math.floor(Math.min(...prices));
        const maxPrice = Math.ceil(Math.max(...prices));
        setPriceRange((prev) => ({
          min: prev.min === 0 ? minPrice : prev.min,
          max: prev.max === 10000 ? maxPrice : prev.max,
        }));
      }
    }
  }, [productData]);
  const [currentPage, setCurrentPage] = useState(0);
  const productsPerPage = productPerPage;
  const offset = currentPage * productsPerPage;

  // Cart functionality
  const { addToCart, updateCart, cartState } = useCart();
  const { openModalCart } = useModalCartContext();
  const router = useRouter();

  const handleLayoutCol = (col: number) => {
    setLayoutCol(col);
  };

  const handleShowOnlySale = () => {
    setShowOnlySale((toggleSelect) => !toggleSelect);
    setCurrentPage(0);
  };

  const handleSortChange = (option: string) => {
    setSortOption(option);
    setCurrentPage(0);
  };

  const handleOpenSidebar = () => {
    setOpenSidebar((toggleOpen) => !toggleOpen);
  };

  const handleType = (nextType: string | null) => {
    const normalizedType = normalizeCategoryValue(nextType || undefined);
    const resolvedType = normalizedType || null;
    setIsTypeManuallySet(true);
    setType((prevType) => (prevType === resolvedType ? null : resolvedType));
    setCurrentPage(0);
  };

  const handleSize = (size: string) => {
    setSize((prevSize) => (prevSize === size ? null : size));
    setCurrentPage(0);
  };

  const handlePriceChange = (values: number | number[]) => {
    if (Array.isArray(values)) {
      setPriceRange({ min: values[0], max: values[1] });
      setCurrentPage(0);
    }
  };

  const handleColor = (color: string) => {
    setColor((prevColor) => (prevColor === color ? null : color));
    setCurrentPage(0);
  };

  const handleBrand = (brand: string) => {
    setBrand((prevBrand) => (prevBrand === brand ? null : brand));
    setCurrentPage(0);
  };

  const handleInStock = () => {
    setInStock((prevInStock) => !prevInStock);
    setCurrentPage(0);
  };

  // Filter product data by dataType
  let filteredData = productData.filter((product) => {
    const productCategoryKey = getProductCategoryKey(product);
    const routeCategoryKey = normalizeCategoryValue(dataType || currentCategorySlug);
    const manualTypeKey = normalizeCategoryValue(type);
    const activeCategoryKey = isTypeManuallySet ? manualTypeKey : routeCategoryKey;

    let isShowOnlySaleMatched = true;
    if (showOnlySale) {
      isShowOnlySaleMatched =
        product.tag?.toLowerCase() === "sale" || !!product.sale;
    }

    let isCategorySelectionMatched = true;
    if (activeCategoryKey) {
      isCategorySelectionMatched = productCategoryKey === activeCategoryKey;
    }

    let isSizeMatched = true;
    if (size) {
      // Handle sizes that might be a JSON string or array
      let productSizes = product.sizes;
      if (typeof productSizes === "string") {
        try {
          productSizes = JSON.parse(productSizes);
        } catch (e) {
          productSizes = [productSizes] as any;
        }
      }
      if (!Array.isArray(productSizes)) {
        productSizes = productSizes ? [productSizes] : [];
      }

      // Extract size names from both old (string) and new (object) formats
      const sizeNames = productSizes.map((s: any) =>
        typeof s === "object" && s.size ? s.size : String(s),
      );

      isSizeMatched = !!size && sizeNames.includes(size);
    }

    let isPriceRangeMatched = true;
    // Only apply price filter if range has been explicitly set by user
    if (priceRange.min > 0 || priceRange.max < 10000) {
      const productPrice =
        typeof product.price === "number"
          ? product.price
          : parseFloat(String(product.price || 0));
      isPriceRangeMatched =
        productPrice >= priceRange.min && productPrice <= priceRange.max;
    }

    let isColorMatched = true;
    if (color) {
      isColorMatched = product.type === color; // Use type instead of variation
    }

    let isBrandMatched = true;
    if (brand) {
      isBrandMatched = product.brand === brand;
    }

    let isInStockMatched = true;
    if (inStock) {
      isInStockMatched = product.quantity > 0;
    }

    return (
      isShowOnlySaleMatched &&
      isCategorySelectionMatched &&
      isSizeMatched &&
      isColorMatched &&
      isBrandMatched &&
      isPriceRangeMatched &&
      isInStockMatched
    );
  });

  // Create a copy array filtered to sort
  let sortedData = [...filteredData];

  if (sortOption === "soldQuantityHighToLow") {
    const bestSellerProducts = sortedData.filter(isBestSellerTagged);
    filteredData = bestSellerProducts.sort((a, b) => {
      const soldDiff = getProductSoldCount(b) - getProductSoldCount(a);
      if (soldDiff !== 0) return soldDiff;
      return a.name.localeCompare(b.name);
    });
  }

  if (sortOption === "discountHighToLow") {
    filteredData = sortedData.sort((a, b) => {
      const discountDiff =
        getProductDiscountPercent(b) - getProductDiscountPercent(a);
      if (discountDiff !== 0) return discountDiff;
      const soldDiff = getProductSoldCount(b) - getProductSoldCount(a);
      if (soldDiff !== 0) return soldDiff;
      return a.name.localeCompare(b.name);
    });
  }

  if (sortOption === "priceHighToLow") {
    filteredData = sortedData.sort((a, b) => {
      const priceA =
        typeof a.price === "number"
          ? a.price
          : parseFloat(String(a.price || 0));
      const priceB =
        typeof b.price === "number"
          ? b.price
          : parseFloat(String(b.price || 0));
      return priceB - priceA;
    });
  }

  if (sortOption === "priceLowToHigh") {
    filteredData = sortedData.sort((a, b) => {
      const priceA =
        typeof a.price === "number"
          ? a.price
          : parseFloat(String(a.price || 0));
      const priceB =
        typeof b.price === "number"
          ? b.price
          : parseFloat(String(b.price || 0));
      return priceA - priceB;
    });
  }

  const totalProducts = filteredData.length;
  const selectedType = type;
  const selectedSize = size;
  const selectedColor = color;
  const selectedBrand = brand;

  // Find page number base on filteredData
  const pageCount = Math.ceil(filteredData.length / productsPerPage);

  // Reset to first page if current page is out of bounds
  useEffect(() => {
    if (currentPage >= pageCount && pageCount > 0) {
      setCurrentPage(0);
    }
  }, [pageCount, currentPage]);

  // Get product data for current page
  let currentProducts: ProductType[];

  if (filteredData.length > 0) {
    currentProducts = filteredData.slice(offset, offset + productsPerPage);
  } else {
    currentProducts = [];
  }

  const handlePageChange = (selected: number) => {
    setCurrentPage(selected);
  };

  const handleClearAll = () => {
    setType(null);
    setIsTypeManuallySet(true);
    setSize(null);
    setColor(null);
    setBrand(null);
    setInStock(false);
    setShowOnlySale(false);
    // Reset price range to show all products
    if (productData.length > 0) {
      const prices = productData
        .map((p) =>
          typeof p.price === "number"
            ? p.price
            : parseFloat(String(p.price || 0)),
        )
        .filter((p) => p > 0);
      if (prices.length > 0) {
        const minPrice = Math.floor(Math.min(...prices));
        const maxPrice = Math.ceil(Math.max(...prices));
        setPriceRange({ min: minPrice, max: maxPrice });
      } else {
        setPriceRange({ min: 0, max: 10000 });
      }
    } else {
      setPriceRange({ min: 0, max: 10000 });
    }
    setCurrentPage(0);
    setType(null);
  };

  // Cart handler functions
  const handleAddToCart = (product: ProductType) => {
    const existingCartItem = cartState.cartArray.find(
      (item) =>
        String(item.id) === String(product.id) && item.selectedSize === "",
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
  };

  const handleViewDetails = (product: ProductType) => {
    const slug = product.slug || product.id;
    router.push(`/product/${slug}`);
  };

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
    <>
      {/* Abstract Background with Botanical Elements */}
      <div className="breadcrumb-block style-img relative overflow-hidden">
        {/* Full Page Background */}
        <div
          className="fixed inset-0 w-full h-[100vh] opacity-25 pointer-events-none"
          style={{
            backgroundImage: "url('/images/abstract/bgshopall.png')",
            backgroundSize: "100vw 100vh",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            zIndex: 0,
          }}
        />
      </div>

      <div
        className={`sidebar style-canvas ${openSidebar ? "open" : ""}`}
        role="button"
        tabIndex={0}
        onClick={handleOpenSidebar}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOpenSidebar(); }}
      >
        <div
          className="sidebar-main"
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onKeyDown={(e) => { e.stopPropagation(); }}
        >
          <div className="heading flex items-center justify-between">
            <div className="heading5">Filters</div>
            <Icon.X
              size={20}
              weight="bold"
              onClick={handleOpenSidebar}
              className="cursor-pointer"
            />
          </div>

          <div className="filter-category pb-8 border-b border-line mt-7">
            <div className="heading6">Categories</div>
            <div className="list-type mt-4">
              {Array.isArray(categories) && categories.length > 0 ? (
                categories.map((item) => (
                  <div
                    key={item.id}
                    className={`item flex items-center justify-between cursor-pointer ${
                      currentCategorySlug === item.slug ? "active" : ""
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      router.push(`/product?category=${item.slug}`)
                    }
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(`/product?category=${item.slug}`); }}
                  >
                    <div className="text-secondary has-line-before hover:text-black capitalize">
                      {item.name}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-secondary text-sm">
                  No categories available
                </div>
              )}
            </div>
          </div>
          {/* <div className="filter-type pb-8 border-b border-line mt-7">
            <div className="heading6">Products Type</div>
            <div className="list-type mt-4">
              {(() => {
                // Get unique types from actual product data
                const uniqueTypes = Array.from(
                  new Set(
                    productData
                      .map(
                        (p) =>
                          p.type ||
                          p.categoryData?.slug ||
                          p.categoryData?.name?.toLowerCase(),
                      )
                      .filter((t): t is string => !!t),
                  ),
                ).sort();

                // If no types in data, show common types
                const typesToShow =
                  uniqueTypes.length > 0
                    ? uniqueTypes
                    : ["face", "hair", "body"];

                return typesToShow.map((item, index) => (
                  <div
                    key={index}
                    className={`item flex items-center justify-between cursor-pointer ${
                      normalizeCategoryValue(item) === type ? "active" : ""
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleType(item)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleType(item); }}
                  >
                    <div className="text-secondary has-line-before hover:text-black capitalize">
                      {item}
                    </div>
                    <div className="text-secondary2">
                      (
                      {
                        productData.filter(
                          (dataItem) => {
                            const dataItemCategoryKey = normalizeCategoryValue(
                              dataItem.type ||
                                dataItem.categoryData?.slug ||
                                dataItem.categoryData?.name?.toLowerCase(),
                            );
                            return dataItemCategoryKey === normalizeCategoryValue(item);
                          },
                        ).length
                      }
                      )
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div> */}
          <div className="filter-size pb-8 border-b border-line mt-8">
            <div className="heading6">Volume</div>
            <div className="list-size flex items-center flex-wrap gap-3 gap-y-4 mt-4">
              {(() => {
                // Get unique sizes from actual product data
                const allSizes = productData
                  .flatMap((p) => {
                    if (Array.isArray(p.sizes)) {
                      // Extract size names from both old and new formats
                      return p.sizes.map((s: any) =>
                        typeof s === "object" && s.size ? s.size : String(s),
                      );
                    }
                    if (typeof p.sizes === "string") {
                      try {
                        const parsed = JSON.parse(p.sizes);
                        if (Array.isArray(parsed)) {
                          return parsed.map((s: any) =>
                            typeof s === "object" && s.size
                              ? s.size
                              : String(s),
                          );
                        }
                        return [
                          typeof parsed === "object" && parsed.size
                            ? parsed.size
                            : String(parsed),
                        ];
                      } catch {
                        return [p.sizes];
                      }
                    }
                    return [];
                  })
                  .filter(Boolean);

                const uniqueSizes = Array.from(new Set(allSizes)).sort();

                // If no sizes in data, show common sizes
                const sizesToShow =
                  uniqueSizes.length > 0
                    ? uniqueSizes
                    : ["50gms", "100gms", "200gms"];

                return sizesToShow.map((item, index) => (
                  <div
                    key={index}
                    className={`size-item text-button ${
                      item.length > 6 ? "px-4 py-2" : "w-[64px] h-[64px]"
                    } flex items-center justify-center rounded-full border border-line ${
                      size === item ? "active" : ""
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSize(item)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSize(item); }}
                  >
                    {item}
                  </div>
                ));
              })()}
            </div>
          </div>
          <div className="filter-price pb-8 border-b border-line mt-8">
            <div className="heading6">Price Range</div>
            <Slider
              range
              value={[priceRange.min, priceRange.max]}
              min={0}
              max={Math.max(10000, priceRange.max)}
              onChange={handlePriceChange}
              className="mt-5"
            />
            <div className="price-block flex items-center justify-between flex-wrap mt-4">
              <div className="min flex items-center gap-1">
                <div>Min price:</div>
                <div className="price-min">
                  ₹<span>{priceRange.min}</span>
                </div>
              </div>
              <div className="min flex items-center gap-1">
                <div>Max price:</div>
                <div className="price-max">
                  ₹<span>{priceRange.max}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="filter-stock pb-8 mt-8">
            <div className="heading6">Availability</div>
            <div className="list-stock mt-4">
              <div className="stock-item flex items-center justify-between">
                <div className="left flex items-center cursor-pointer">
                  <div className="block-input">
                    <input
                      type="checkbox"
                      name="in-stock"
                      id="in-stock"
                      checked={inStock}
                      onChange={handleInStock}
                    />
                    <Icon.CheckSquare
                      size={20}
                      weight="fill"
                      className="icon-checkbox"
                    />
                  </div>
                  <label
                    htmlFor="in-stock"
                    className="stock-name capitalize pl-2 cursor-pointer"
                  >
                    In Stock
                  </label>
                </div>
                <div className="text-secondary2">
                  (
                  {
                    productData.filter((dataItem) => dataItem.quantity > 0)
                      .length
                  }
                  )
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="shop-product breadcrumb1 lg:py-16 md:py-12 py-8 bg-white/95 text-[15px] sm:text-base">
        <div className="container">
          <div className="list-product-block relative">
            {/* Simple Filters Bar */}
            <div className="simple-filters bg-white border border-line rounded-xl p-3 sm:p-4 mb-5 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Left: Category and Sale Filter */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleOpenSidebar}
                    className="flex items-center gap-2 px-4 py-2 border border-line rounded-lg hover:bg-surface transition-colors"
                  >
                    <Icon.Funnel size={18} />
                    <span className="text-sm font-medium">All Filters</span>
                  </button>

                  {/* Category Quick Filters */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleType(null)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        !type
                          ? "bg-success text-white"
                          : "bg-surface text-black hover:bg-green/10"
                      }`}
                    >
                      All
                    </button>
                    {(() => {
                      const uniqueTypes = Array.from(
                        new Set(
                          productData
                            .map(
                              (p) =>
                                p.type ||
                                p.categoryData?.slug ||
                                p.categoryData?.name?.toLowerCase(),
                            )
                            .filter((t): t is string => !!t),
                        ),
                      ).sort();
                      const typesToShow =
                        uniqueTypes.length > 0
                          ? uniqueTypes.slice(0, 3)
                          : ["face", "hair", "body"];
                      return typesToShow.map((item) => (
                        <button
                          key={item}
                          onClick={() => handleType(item)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                            type === normalizeCategoryValue(item)
                              ? "bg-success text-white"
                              : "bg-surface text-black hover:bg-green/10"
                          }`}
                        >
                          {item}
                        </button>
                      ));
                    })()}
                  </div>

                  {/* Sale Filter */}
                  <label className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-lg cursor-pointer hover:bg-green/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={showOnlySale}
                      onChange={handleShowOnlySale}
                      className="w-4 h-4 text-success border-line rounded"
                    />
                    <span className="text-sm font-medium">On Sale</span>
                  </label>
                </div>

                {/* Right: Sort and Results Count */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* <div className="text-xs sm:text-sm text-secondary">
                    {totalProducts} Products
                  </div> */}
                  <div className="select-block relative">
                    <select
                      className="caption1 h-10 py-2 pl-3 pr-8 rounded-lg border border-line bg-white text-sm"
                      onChange={(e) => handleSortChange(e.target.value)}
                      value={sortOption || "Sorting"}
                    >
                      <option value="Sorting" disabled>
                        Sort by
                      </option>
                      <option value="soldQuantityHighToLow">
                        Best Selling
                      </option>
                      <option value="discountHighToLow">Best Discount</option>
                      <option value="priceHighToLow">Price: High to Low</option>
                      <option value="priceLowToHigh">Price: Low to High</option>
                    </select>
                    <Icon.CaretDown
                      size={12}
                      className="absolute top-1/2 -translate-y-1/2 right-2 pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              {/* Active Filters Display */}
              {(type || size || showOnlySale) && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-line flex-wrap">
                  <span className="text-[11px] sm:text-xs text-secondary">
                    Active filters:
                  </span>
                  {type && (
                    <span className="px-2 py-1 bg-green/10 text-black rounded text-[11px] sm:text-xs flex items-center gap-1">
                      {type}
                      <Icon.X
                        size={12}
                        className="cursor-pointer"
                        onClick={() => handleType(null)}
                      />
                    </span>
                  )}
                  {size && (
                    <span className="px-2 py-1 bg-green/10 text-black rounded text-[11px] sm:text-xs flex items-center gap-1">
                      {size}
                      <Icon.X
                        size={12}
                        className="cursor-pointer"
                        onClick={() => setSize(null)}
                      />
                    </span>
                  )}
                  {showOnlySale && (
                    <span className="px-2 py-1 bg-green/10 text-black rounded text-[11px] sm:text-xs flex items-center gap-1">
                      On Sale
                      <Icon.X
                        size={12}
                        className="cursor-pointer"
                        onClick={() => setShowOnlySale(false)}
                      />
                    </span>
                  )}
                  <button
                    onClick={handleClearAll}
                    className="text-[11px] sm:text-xs text-red hover:underline ml-auto"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Pagination and products grid */}
            {currentProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {currentProducts.map((item, index) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                    index={index}
                    onAddToCart={handleAddToCart}
                    onViewDetails={handleViewDetails}
                    getCategoryColor={getCategoryColor}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 sm:py-20 text-center bg-surface/30 rounded-lg border border-line border-dashed">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                  <Icon.Package size={48} className="text-secondary/40" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-primary mb-2">
                  No Products Found
                </h3>
                <p className="text-sm sm:text-base text-secondary max-w-md mx-auto mb-6">
                  We couldn't find any products matching your filters. Try
                  clearing some filters or searching for something else.
                </p>
                <button
                  onClick={handleClearAll}
                  className="button-main px-6 py-2 h-auto text-sm"
                >
                  Clear All Filters
                </button>
              </div>
            )}

            {pageCount > 1 && (
              <div className="flex justify-center mt-12">
                <HandlePagination
                  pageCount={pageCount}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ShopFilterCanvas;
