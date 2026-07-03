"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";
import { ProductType } from "@/type/ProductType";
import Product from "../Product";
import Rate from "@/components/Other/Rate";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Thumbs, Scrollbar, Zoom } from "swiper/modules";
import "swiper/css/bundle";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import SwiperCore from "swiper/core";
import { useCart } from "@/context/CartContext";
import { useModalCartContext } from "@/context/ModalCartContext";
import { useAuth } from "@/context/AuthContext";
import { reviewApi } from "@/lib/api";
import ProductCard from "../ProductCard";
import toast from "react-hot-toast";
import { getBackendImageUrl } from "@/lib/utils";
import { calculateGstInclusivePrice } from "@/lib/price-utils";

interface Props {
  data: Array<ProductType>;
  productId: string | number | null;
}

// Add shake CSS animation
const shakeStyle = `
@keyframes shake {
  0% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
  20%, 40%, 60%, 80% { transform: translateX(6px); }
  100% { transform: translateX(0); }
}
.shake {
  animation: shake 0.5s;
}
`;

const Sale: React.FC<Props> = ({ data, productId }) => {
  const router = useRouter();
  const popupSwiperRef = useRef<SwiperCore | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [openPopupImg, setOpenPopupImg] = useState(false);
  const [openSizeGuide, setOpenSizeGuide] = useState<boolean>(false);
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperCore | null>(null);
  const [activeColor, setActiveColor] = useState<string>("");
  const [activeSize, setActiveSize] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string | undefined>("description");
  const [quantityPurchase, setQuantityPurchase] = useState<number>(1);

  // Cart handlers for ProductCard
  const { addToCart, updateCart, cartState } = useCart();
  const { openModalCart } = useModalCartContext();

  const handleAddRelatedProductToCart = (product: ProductType) => {
    const existingCartItem = cartState.cartArray.find(
      (item) =>
        String(item.id) === String(product.id) && item.selectedSize === "",
    );

    if (!existingCartItem) {
      addToCart({ ...product, selectedSize: "" });
      updateCart(
        `${product.id}-`,
        Math.max(1, product.quantityPurchase ?? 1),
        "",
      );
    } else {
      updateCart(
        existingCartItem.cartId,
        existingCartItem.quantity + Math.max(1, product.quantityPurchase ?? 1),
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
    switch (category?.toLowerCase()) {
      case "face":
      case "face-care":
        return "var(--red)";
      case "hair":
      case "hair-care":
        return "var(--accent)";
      case "body":
      case "body-care":
        return "var(--primary)";
      default:
        return "var(--secondary)";
    }
  };

  const getCategoryKey = (product?: ProductType | null): string => {
    if (!product) return "";
    if (product.categoryId !== null && product.categoryId !== undefined) {
      return `id:${product.categoryId}`;
    }
    if (
      product.categoryData &&
      product.categoryData.id !== null &&
      product.categoryData.id !== undefined
    ) {
      return `id:${product.categoryData.id}`;
    }

    return typeof product.category === "string"
      ? `name:${product.category.trim().toLowerCase()}`
      : "";
  };
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["benefits"]),
  );

  // Scroll-based reveal state
  const [showAccordionSections, setShowAccordionSections] = useState(false);
  const productCardRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const ingredientsSectionRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to detect when product card is fully scrolled
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // When sentinel is visible (product card scrolled past), show accordion sections
          if (entry.isIntersecting) {
            setShowAccordionSections(true);
          }
        });
      },
      {
        threshold: 0.1, // Trigger when 10% of sentinel is visible
        rootMargin: "0px",
      },
    );

    observer.observe(sentinelRef.current);

    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
    };
  }, []);

  // Review states (from API)
  const [productReviews, setProductReviews] = useState<
    Array<{
      id: number;
      name: string;
      rating: number;
      text: string;
      adminReply?: string;
      date: string;
      avatar: string;
      verified?: boolean;
    }>
  >([]);
  const [reviewStats, setReviewStats] = useState<{
    totalReviews: number;
    averageRating: number;
    ratingBreakdown: Record<string, number>;
  }>({
    totalReviews: 0,
    averageRating: 0,
    ratingBreakdown: {},
  });
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("highest");
  // Optimized review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewFormErrors, setReviewFormErrors] = useState<
    Record<string, string>
  >({});
  const [reviewFormData, setReviewFormData] = useState({
    rating: 0,
    content: "",
  });
  const [hoveredRating, setHoveredRating] = useState(0);

  // Fetch product reviews from API
  const fetchProductReviews = React.useCallback(async () => {
    if (!productId) return;
    setReviewsLoading(true);
    try {
      const response = await reviewApi.getProductReviews(String(productId), {
        limit: 500,
      });
      if (response.data.success && response.data.data) {
        const { reviews, statistics } = response.data.data;
        setProductReviews(
          (reviews || []).map((r: any) => ({
            id: r.id,
            name: r.customerName || "Customer",
            rating: parseFloat(r.rating) || 0,
            text: r.comment || "",
            adminReply:
              typeof r.adminReply === "string" ? r.adminReply.trim() : "",
            date: r.createdAt || "",
            avatar: "/images/avatar/face.png",
            verified: r.status === "approved",
          })),
        );
        const totalReviews = statistics?.totalReviews ?? 0;
        const averageRating = parseFloat(statistics?.averageRating ?? 0) || 0;
        const ratingDistribution = statistics?.ratingDistribution || {};
        const ratingBreakdown: Record<string, number> = {
          "1": 0,
          "2": 0,
          "3": 0,
          "4": 0,
          "5": 0,
        };

        Object.entries(ratingDistribution).forEach(([rawRating, rawCount]) => {
          const roundedRating = Math.round(Number(rawRating));
          if (roundedRating >= 1 && roundedRating <= 5) {
            ratingBreakdown[String(roundedRating)] += Number(rawCount || 0);
          }
        });

        // Fallback: build breakdown from fetched approved reviews if API distribution is empty/mismatched.
        const hasDistributionValues = Object.values(ratingBreakdown).some(
          (count) => count > 0,
        );
        if (!hasDistributionValues && Array.isArray(reviews)) {
          reviews.forEach((r: any) => {
            const roundedRating = Math.round(Number(r.rating));
            if (roundedRating >= 1 && roundedRating <= 5) {
              ratingBreakdown[String(roundedRating)] += 1;
            }
          });
        }

        [1, 2, 3, 4, 5].forEach((star) => {
          if (!Number.isFinite(ratingBreakdown[String(star)])) {
            ratingBreakdown[String(star)] = 0;
          }
        });
        setReviewStats({ totalReviews, averageRating, ratingBreakdown });
      }
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
      setProductReviews([]);
      setReviewStats({
        totalReviews: 0,
        averageRating: 0,
        ratingBreakdown: {},
      });
    } finally {
      setReviewsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProductReviews();
  }, [fetchProductReviews]);

  // Auth context
  const { isAuthenticated, user } = useAuth();

  // For shake effect
  const [shakeBuy, setShakeBuy] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);

  // Find the product by ID, ensuring both are converted to strings for comparison
  let productMain = data.find(
    (product) => String(product.id) === String(productId),
  ) as ProductType | undefined;

  // If product not found and data array has items, use first item as fallback
  if (productMain === undefined && data.length > 0) {
    productMain = data[0];
  }

  const currentCategoryKey = getCategoryKey(productMain);
  const relatedProducts = currentCategoryKey
    ? data.filter(
        (item) =>
          String(item.id) !== String(productId) &&
          getCategoryKey(item) === currentCategoryKey,
      )
    : [];

  // Idle shake timer logic - only if product is in stock
  useEffect(() => {
    if (isOutOfStock) {
      setShakeBuy(false);
      return;
    }

    let timer: NodeJS.Timeout;
    let isMounted = true;

    const scheduleShake = () => {
      timer = setTimeout(() => {
        if (isMounted && !isOutOfStock) {
          setShakeBuy(true);
          setTimeout(() => {
            setShakeBuy(false);
            scheduleShake();
          }, 600);
        }
      }, 3000);
    };

    scheduleShake();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [productMain?.id, activeSize]);

  // Set default volume when component mounts
  useEffect(() => {
    const sizeNames = getSizeNames();
    if (productMain && sizeNames && sizeNames.length > 0 && !activeSize) {
      setActiveSize(sizeNames[0]);
    }
  }, [productMain, activeSize]);

  // Reset quantity when product changes
  useEffect(() => {
    setQuantityPurchase(1);
  }, [productMain?.id]);

  useEffect(() => {
    if (openPopupImg && popupSwiperRef.current) {
      popupSwiperRef.current.slideTo(photoIndex, 0);
    }
  }, [openPopupImg, photoIndex]);

  useEffect(() => {
    if (!openPopupImg) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPopupImg(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openPopupImg]);

  // Return early if no product found
  if (
    !productMain ||
    !productMain.sizes ||
    (Array.isArray(productMain.sizes) && productMain.sizes.length === 0)
  ) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-secondary">
          Product not found or product data is incomplete
        </p>
        <Link href="/product" className="button-main mt-4 inline-block">
          Continue Shopping
        </Link>
      </div>
    );
  }

  // Ensure images is always an array
  const productImages = Array.isArray(productMain.images)
    ? productMain.images
    : [];

  // Helper function to parse sizes (handles both array and JSON string, and both old/new formats)
  const parseSizes = (
    sizes: any,
  ): string[] | Array<{ size: string; price: number; mrpPrice?: number }> => {
    if (!sizes) return ["freesize"];
    if (Array.isArray(sizes)) {
      // Check if it's new format (has price property)
      if (
        sizes.length > 0 &&
        typeof sizes[0] === "object" &&
        sizes[0].price !== undefined
      ) {
        return sizes; // Return as-is for new format
      }
      // Old format - array of strings
      return sizes;
    }
    if (typeof sizes === "string") {
      try {
        const parsed = JSON.parse(sizes);
        if (Array.isArray(parsed)) {
          // Check if new format
          if (
            parsed.length > 0 &&
            typeof parsed[0] === "object" &&
            parsed[0].price !== undefined
          ) {
            return parsed;
          }
          return parsed; // Old format
        }
        return [parsed];
      } catch (e) {
        // If it's not valid JSON, treat it as a single size string
        return [sizes];
      }
    }
    return [sizes];
  };

  // Helper function to parse array or string data
  const parseArrayOrString = (data: any): string[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data.filter((item) => item && item.trim());
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed))
          return parsed.filter((item) => item && item.trim());
        return [parsed].filter((item) => item && item.trim());
      } catch (e) {
        // If it's not valid JSON, treat it as a single string
        return data.trim() ? [data.trim()] : [];
      }
    }
    return [];
  };

  // Helper function to parse key ingredients (handles complex object array)
  const parseKeyIngredients = (
    ingredients: any,
  ): Array<{ name?: string; benefits?: string; image?: string }> => {
    if (!ingredients) return [];
    if (Array.isArray(ingredients)) {
      // Check if it's an array of objects or strings
      if (ingredients.length > 0 && typeof ingredients[0] === "object") {
        return ingredients;
      }
      // Convert string array to object array
      return ingredients.map((item) => ({ name: item }));
    }
    if (typeof ingredients === "string") {
      try {
        const parsed = JSON.parse(ingredients);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && typeof parsed[0] === "object") {
            return parsed;
          }
          return parsed.map((item) => ({ name: item }));
        }
        return [{ name: parsed }];
      } catch (e) {
        return [{ name: ingredients }];
      }
    }
    return [];
  };

  // Helper function to parse common questions/FAQs
  const parseCommonQuestions = (
    questions: any,
  ): Array<{ question: string; answer: string }> => {
    if (!questions) return [];
    if (Array.isArray(questions)) return questions;
    if (typeof questions === "string") {
      try {
        const parsed = JSON.parse(questions);
        if (Array.isArray(parsed)) return parsed;
        return [];
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  // Ensure sizes is always an array
  const productSizes = parseSizes(productMain.sizes);
  const ingredientPreviewItems = parseKeyIngredients(productMain.keyIngredients)
    .filter((item) => item && (item.name || item.image))
    .slice(0, 3);

  // Check if using variants for pricing (new format)
  const hasVariants =
    productMain.variants &&
    Array.isArray(productMain.variants) &&
    productMain.variants.length > 0;

  // Check if using new size pricing format (legacy support)
  const hasSizePricing =
    !hasVariants &&
    Array.isArray(productSizes) &&
    productSizes.length > 0 &&
    typeof productSizes[0] === "object" &&
    "price" in productSizes[0];

  // Helper to get size names for display
  const getSizeNames = (): string[] => {
    if (hasVariants) {
      return productMain.variants!.map((v) => v.name);
    }
    if (hasSizePricing) {
      return (
        productSizes as Array<{
          size: string;
          price: number;
          mrpPrice?: number;
        }>
      ).map((s) => s.size);
    }
    return productSizes as string[];
  };

  // Helper to get current price based on selected size
  const getCurrentPrice = (): number => {
    // First, try to get price from variants
    if (hasVariants && activeSize) {
      const variant = productMain.variants!.find((v) => v.name === activeSize);

      if (variant) {
        return Number(variant.price);
      }
    }
    // If no variant selected, use first variant's price
    if (hasVariants && productMain.variants!.length > 0) {
      const firstVariant = productMain.variants![0];

      return Number(firstVariant.price);
    }

    if (hasSizePricing && activeSize) {
      const sizeData = (
        productSizes as Array<{
          size: string;
          price: number;
          mrpPrice?: number;
        }>
      ).find((s) => s.size === activeSize);

      if (sizeData) {
        return Number(sizeData.price);
      }
    }
    // If no size pricing or no size selected, use first size's price
    if (hasSizePricing && productSizes.length > 0) {
      const firstSize = productSizes[0];

      if (typeof firstSize === "object" && firstSize.price) {
        return Number(firstSize.price);
      }
    }

    // Fallback to main product price
    if (productMain.price) {
      return Number(productMain.price);
    }

    return 0;
  };

  // Helper to get current MRP based on selected size
  const getCurrentMRP = (): number | null => {
    // First, try to get MRP from variants
    if (hasVariants && activeSize) {
      const variant = productMain.variants!.find((v) => v.name === activeSize);
      if (variant && variant.mrpPrice) {
        return Number(variant.mrpPrice);
      }
    }
    // If no variant selected, use first variant's MRP
    if (hasVariants && productMain.variants!.length > 0) {
      const firstVariant = productMain.variants![0];
      if (firstVariant.mrpPrice) {
        return Number(firstVariant.mrpPrice);
      }
    }

    // Legacy: Try size pricing format
    if (hasSizePricing && activeSize) {
      const sizeData = (
        productSizes as Array<{
          size: string;
          price: number;
          mrpPrice?: number;
        }>
      ).find((s) => s.size === activeSize);

      if (sizeData && sizeData.mrpPrice) {
        return Number(sizeData.mrpPrice);
      }
    }
    // If no size pricing or no size selected, use first size's MRP
    if (hasSizePricing && productSizes.length > 0) {
      const firstSize = productSizes[0];
      if (typeof firstSize === "object" && firstSize.mrpPrice) {
        return Number(firstSize.mrpPrice);
      }
    }

    // Fallback to main product MRP

    if (productMain.originPrice) {
      return Number(productMain.originPrice);
    }
    if (productMain.mrpPrice) {
      return Number(productMain.mrpPrice);
    }

    return null;
  };

  const getCurrentGstPercentage = (): number => {
    if (hasVariants && activeSize) {
      const variant = productMain.variants!.find((v) => v.name === activeSize);
      if (
        variant?.gstPercentage !== undefined &&
        variant?.gstPercentage !== null
      ) {
        return Number(variant.gstPercentage) || 0;
      }
    }

    if (hasVariants && productMain.variants!.length > 0) {
      return Number(productMain.variants![0].gstPercentage) || 0;
    }

    return Number(productMain.gstPercentage) || 0;
  };

  const getCurrentDisplayPrice = (): number =>
    calculateGstInclusivePrice(getCurrentPrice(), getCurrentGstPercentage());

  const getCurrentDisplayMRP = (): number | null => {
    const currentMRP = getCurrentMRP();
    if (!currentMRP) {
      return null;
    }

    return calculateGstInclusivePrice(currentMRP, getCurrentGstPercentage());
  };

  // Check if product is out of stock - considering variant stock
  const isOutOfStock = (() => {
    // If product has variants and a size is selected, check that variant's stock
    if (hasVariants && activeSize) {
      const variant = productMain.variants!.find((v) => v.name === activeSize);
      if (variant) {
        return variant.stock <= 0;
      }
    }
    // Otherwise, check the main product quantity
    return productMain.quantity <= 0;
  })();

  // Get current available stock - considering variant stock
  const getCurrentStock = () => {
    // If product has variants and a size is selected, get that variant's stock
    if (hasVariants && activeSize) {
      const variant = productMain.variants!.find((v) => v.name === activeSize);
      if (variant) {
        return variant.stock;
      }
    }
    // Otherwise, return the main product quantity
    return productMain.quantity;
  };

  // Get current custom stock label (for selected variant)
  const getCurrentCustomStock = () => {
    if (hasVariants && activeSize) {
      const variant = productMain.variants!.find((v) => v.name === activeSize);
      if (variant?.customStock) {
        return variant.customStock;
      }
    }
    if (hasVariants && productMain.variants!.length > 0) {
      return productMain.variants![0].customStock || null;
    }
    return null;
  };

  // Get current sold count - considering variant sold
  const getCurrentSold = () => {
    // If product has variants and a size is selected, get that variant's sold count
    if (hasVariants && activeSize) {
      const variant = productMain.variants!.find((v) => v.name === activeSize);
      if (variant) {
        return variant.sold;
      }
    }
    // Otherwise, return the main product sold count
    return productMain.sold;
  };

  // Calculate sale percentage safely using current price/MRP
  const percentSale = (() => {
    const currentMRP = getCurrentMRP();
    const currentPrice = getCurrentPrice();
    if (currentMRP && currentMRP > 0 && currentPrice > 0) {
      return Math.floor(100 - (currentPrice / currentMRP) * 100);
    }
    return 0;
  })();
  const currentDisplayPrice = getCurrentDisplayPrice();
  const currentDisplayMrp = getCurrentDisplayMRP();

  // Review statistics from API state
  const totalReviews = reviewStats.totalReviews;
  const averageRating = reviewStats.averageRating;
  const ratingBreakdown = reviewStats.ratingBreakdown;
  const selectedRatingReviewCount =
    reviewFormData.rating > 0
      ? Number(ratingBreakdown[String(reviewFormData.rating)] || 0)
      : 0;

  // Sort reviews
  const sortedReviews = [...productReviews].sort((a, b) => {
    switch (sortBy) {
      case "highest":
        return b.rating - a.rating;
      case "lowest":
        return a.rating - b.rating;
      case "newest":
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case "oldest":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      default:
        return 0;
    }
  });
  const isReviewListScrollable = sortedReviews.length > 3;

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };

  const handleShowReviewForm = () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.error("Please login to write reviews", {
        duration: 4000,
        icon: "🔒",
      });
      router.push("/login");
      return;
    }

    setShowReviewForm(true);
    // Scroll to review form
    setTimeout(() => {
      const reviewForm = document.getElementById("review-form");
      if (reviewForm) {
        reviewForm.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  // Form validation
  const validateReviewForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (reviewFormData.rating === 0) {
      errors.rating = "Please select a rating";
    }

    if (!reviewFormData.content.trim()) {
      errors.content = "Review content is required";
    } else if (reviewFormData.content.trim().length > 300) {
      errors.content = "Review must be less than 300 characters";
    }

    setReviewFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form field changes
  const handleReviewFormChange = (
    field: keyof typeof reviewFormData,
    value: string | number,
  ) => {
    setReviewFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (reviewFormErrors[field]) {
      setReviewFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Reset form
  const handleCancelReviewForm = () => {
    setShowReviewForm(false);
    setReviewFormData({
      rating: 0,
      content: "",
    });
    setHoveredRating(0);
    setReviewFormErrors({});
    setIsSubmittingReview(false);
  };

  // Submit review to backend
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check authentication again before submitting
    if (!isAuthenticated || !user) {
      toast.error("Please login to write reviews", {
        duration: 4000,
        icon: "🔒",
      });
      router.push("/login");
      return;
    }

    if (!validateReviewForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsSubmittingReview(true);

    try {
      // Get customer name from user data (user is guaranteed to exist after auth check)
      if (!user) {
        throw new Error("User data not available");
      }

      const customerName =
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`.trim()
          : user.firstName ||
            user.lastName ||
            user.email?.split("@")[0] ||
            "Customer";

      const response = await reviewApi.createReview({
        productId: productMain?.id,
        customerId: user.id,
        rating: reviewFormData.rating,
        comment: reviewFormData.content.trim(),
        customerName: customerName,
        customerEmail: user.email,
        images: [], // No images as per requirements
      });

      const data = response.data;

      if (data.success) {
        toast.success(
          data.message ||
            "Review submitted successfully! It will be visible after approval.",
        );
        handleCancelReviewForm();
        fetchProductReviews();
      } else {
        throw new Error(data.message || "Failed to submit review");
      }
    } catch (error: any) {
      console.error("Review submission error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit review. Please try again later.";
      toast.error(errorMessage);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleOpenSizeGuide = () => {
    setOpenSizeGuide(true);
  };

  const handleCloseSizeGuide = () => {
    setOpenSizeGuide(false);
  };

  const handleSwiper = (swiper: SwiperCore) => {
    // Do something with the thumbsSwiper instance
    setThumbsSwiper(swiper);
  };

  const openZoomViewer = (index: number) => {
    setPhotoIndex(index);
    setOpenPopupImg(true);
  };

  const getZoomIndexFromSwiper = (swiper: SwiperCore) => {
    if (typeof swiper.clickedIndex === "number" && swiper.clickedIndex >= 0) {
      return swiper.clickedIndex;
    }

    return typeof swiper.activeIndex === "number" ? swiper.activeIndex : 0;
  };

  const handleActiveColor = (item: string) => {
    setActiveColor(item);
  };

  const handleActiveSize = (item: string) => {
    setActiveSize(item);
  };

  const handleIncreaseQuantity = () => {
    if (isOutOfStock) return;
    if (quantityPurchase >= productMain.quantity) {
      toast.error(`Only ${productMain.quantity} items available in stock.`);
      return;
    }
    const newQuantity = quantityPurchase + 1;
    setQuantityPurchase(newQuantity);
    // Don't update cart here, just local state. User must click "Add to Cart" or "Update" if already in cart?
    // Actually, this handler is usually for the input field BEFORE adding to cart.
    // However, if the logic intends to update the cart immediately (if item is in cart), we need to check.
    // Based on UI context (Sale page), these buttons usually just change the quantity to be added.
    // The previous code called updateCart, which implies it might be updating real-time?
    // But updateCart(product.id...) would fail anyway.
    // Let's assume this is just for the local state "quantityPurchase" which is used by handleAddToCart.
    // REMOVING updateCart call from here as it likely shouldn't update the cart until "Add to Cart" is clicked.
    // PROCEEDING to just update state.
  };

  const handleDecreaseQuantity = () => {
    if (quantityPurchase > 1) {
      const newQuantity = quantityPurchase - 1;
      setQuantityPurchase(newQuantity);
      // REMOVING updateCart call as described above.
    }
  };

  const handleAddToCart = () => {
    const selectedSizeForCart =
      activeSize || productMain.variants?.[0]?.name || "";

    // Generate cartId
    const cartId = `${productMain.id}-${selectedSizeForCart}`;

    const existingItem = cartState.cartArray.find(
      (item) => item.cartId === cartId,
    );

    // Find variant
    const variant = productMain.variants?.find(
      (v) => v.name === selectedSizeForCart || v.weight === selectedSizeForCart,
    );

    const productWithDetails = {
      ...productMain,
      price: getCurrentPrice(),
      mrpPrice: getCurrentMRP(),
      selectedSize: selectedSizeForCart,
      gstPercentage: variant?.gstPercentage ?? null,
      variantId: variant?.id, // Added variantId
    };

    if (!existingItem) {
      // Add new item to cart
      addToCart(productWithDetails);
      // If quantity > 1, update it immediately (since addToCart defaults to 1)
      if (quantityPurchase > 1) {
        updateCart(cartId, quantityPurchase, selectedSizeForCart);
      }
    } else {
      // Add to existing quantity
      const newQuantity = existingItem.quantity + quantityPurchase;
      updateCart(cartId, newQuantity, selectedSizeForCart);
    }
    openModalCart();
  };

  const handleActiveTab = (tab: string) => {
    setActiveTab(tab);
  };

  const toggleAccordion = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Buy It Now click handler - adds to cart and redirects to checkout
  const handleBuyItNow = async () => {
    // Prevent multiple clicks
    if (isBuyingNow) return;

    setIsBuyingNow(true);

    try {
      // Validate product selection
      if (!productMain) {
        console.error("Product not found");
        return;
      }

      if (productSizes && productSizes.length > 0 && !activeSize) {
        toast.error("Please select a Volume before proceeding to checkout.");
        return;
      }

      // Check product availability
      if (isOutOfStock) {
        toast.error("This product is currently out of stock.");
        return;
      }

      // Find variant
      const selectedSizeForCart =
        activeSize || productMain.variants?.[0]?.name || "";
      const variant = productMain.variants?.find(
        (v) =>
          v.name === selectedSizeForCart || v.weight === selectedSizeForCart,
      );

      const desiredQuantity = Math.max(1, quantityPurchase);

      const productToAdd = {
        ...productMain,
        price: getCurrentPrice(),
        mrpPrice: getCurrentMRP(),
        selectedSize: selectedSizeForCart,
        gstPercentage: variant?.gstPercentage ?? null,
        quantityPurchase: desiredQuantity,
        variantId: variant?.id, // Added variantId
      };

      // Generate cartId
      const cartId = `${productMain.id}-${selectedSizeForCart}`;

      // Check existence
      const existingItem = cartState.cartArray.find(
        (item) => item.cartId === cartId,
      );

      if (!existingItem) {
        addToCart(productToAdd);
        if (desiredQuantity > 1) {
          updateCart(cartId, desiredQuantity, selectedSizeForCart);
        }
      } else {
        const newQuantity = existingItem.quantity + desiredQuantity;
        updateCart(cartId, newQuantity, selectedSizeForCart);
      }

      // Small delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Navigate to checkout page
      router.push("/checkout");
    } catch (error) {
      console.error("Error during buy it now process:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsBuyingNow(false);
    }
  };

  const accordionCardClass =
    "accordion-item overflow-hidden rounded-2xl border border-outline/70 bg-white/95 shadow-sm";
  const accordionHeaderClass =
    "accordion-header group flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-surface/80 sm:px-5 sm:py-5";
  const accordionTitleClass = "text-sm font-semibold text-black sm:text-lg";
  const accordionIconClass =
    "flex h-9 w-9 items-center justify-center rounded-full border border-outline/60 bg-surface text-primary transition-all duration-300";
  const accordionPanelClass =
    "accordion-content overflow-hidden transition-all duration-500 ease-in-out";

  return (
    <LazyMotion features={domAnimation}>
      {/* Inject shake style */}
      <style>{shakeStyle}</style>
      <div className="product-detail sale bg-white/80 relative text-[14px] sm:text-base">
        <div
          className="fixed inset-0 w-full h-[100vh] opacity-10 pointer-events-none"
          style={{
            backgroundImage: "url('/images/abstract/bgshopall.png')",
            backgroundSize: "100vw 100vh",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            zIndex: 0,
          }}
        />
        <div className="featured-product underwear pt-4 pb-10 sm:py-6 md:py-8 lg:py-10">
          <div className="container px-4 sm:px-6 lg:px-8">
            {/* Product Card Container */}
            <div
              ref={productCardRef}
              className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-4 sm:p-5 md:p-6 lg:p-7 mb-5 sm:mb-6 transition-all duration-500"
            >
              <div className="single-product-scroll-layout flex flex-col lg:flex-row gap-5 lg:gap-6">
                <div className="list-img single-product-media w-full lg:w-2/5">
                  <div className="flex justify-center">
                    <div className="relative w-full max-w-md">
                      <Swiper
                        slidesPerView={1}
                        spaceBetween={0}
                        thumbs={{ swiper: thumbsSwiper }}
                        modules={[Thumbs]}
                        onTap={(swiper) => {
                          openZoomViewer(getZoomIndexFromSwiper(swiper));
                        }}
                        onClick={(swiper) => {
                          if (
                            (
                              swiper as SwiperCore & {
                                allowClick?: boolean;
                              }
                            ).allowClick === false
                          ) {
                            return;
                          }
                          openZoomViewer(getZoomIndexFromSwiper(swiper));
                        }}
                        className="mySwiper2 rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
                      >
                        {productImages.map((item) => (
                          <SwiperSlide key={item} className="cursor-pointer">
                            <Image
                              src={getBackendImageUrl(item)}
                              width={1000}
                              height={1000}
                              alt="prd-img"
                              className="w-full aspect-square object-contain hover:scale-105 transition-transform duration-500"
                            />
                          </SwiperSlide>
                        ))}
                      </Swiper>

                      {/* Sale Badge */}
                      {currentDisplayMrp &&
                        currentDisplayPrice &&
                        currentDisplayMrp > currentDisplayPrice && (
                          <div className="absolute top-4 left-4 sm:top-5 sm:left-5 bg-red text-white px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-semibold shadow-lg z-30 numeric-contrast">
                            {percentSale}% OFF
                          </div>
                        )}

                      {/* Zoom Indicator */}
                      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs z-10">
                        Click to zoom
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center mt-3 sm:mt-4">
                    <div className="w-full max-w-md">
                      <Swiper
                        onSwiper={handleSwiper}
                        spaceBetween={6}
                        slidesPerView={4}
                        freeMode={true}
                        watchSlidesProgress={true}
                        modules={[Navigation, Thumbs]}
                        className="mySwiper style-rectangle"
                        breakpoints={{
                          640: {
                            slidesPerView: 5,
                            spaceBetween: 8,
                          },
                        }}
                      >
                        {productImages.map((item) => (
                          <SwiperSlide key={item}>
                            <Image
                              src={getBackendImageUrl(item)}
                              width={200}
                              height={200}
                              alt="prd-img"
                              className="w-full aspect-square object-contain rounded-lg sm:rounded-xl border border-outline hover:border-primary transition-colors cursor-pointer"
                            />
                          </SwiperSlide>
                        ))}
                      </Swiper>
                    </div>
                  </div>
                  {typeof window !== "undefined" &&
                    createPortal(
                      <div className={`popup-img ${openPopupImg ? "open" : ""}`}>
                        <button
                          type="button"
                          aria-label="Close image zoom"
                          className="absolute inset-0 z-[1] cursor-default"
                          onClick={() => setOpenPopupImg(false)}
                        />
                        <span
                          className="close-popup-btn absolute top-4 right-4 z-[3] cursor-pointer"
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setOpenPopupImg(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                              setOpenPopupImg(false);
                          }}
                        >
                          <Icon.X className="text-3xl text-white" />
                        </span>
                        <div className="h-full relative z-[2]">
                          <Swiper
                            initialSlide={photoIndex}
                            spaceBetween={0}
                            slidesPerView={1}
                            modules={[Navigation, Zoom]}
                            navigation={true}
                            zoom={{
                              maxRatio: 5,
                              minRatio: 1,
                            }}
                            loop={false}
                            className="popupSwiper"
                            onSwiper={(swiper) => {
                              popupSwiperRef.current = swiper;
                              swiper.slideTo(photoIndex, 0);
                            }}
                          >
                            {productImages.map((item) => (
                              <SwiperSlide key={item}>
                                <div className="swiper-zoom-container">
                                  <Image
                                    src={getBackendImageUrl(item)}
                                    width={1000}
                                    height={1000}
                                    alt="prd-img"
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              </SwiperSlide>
                            ))}
                          </Swiper>
                        </div>
                      </div>,
                      document.body,
                    )}
                </div>
                <div className="product-infor single-product-info w-full lg:w-1/2 lg:pl-6">
                  <div className="flex justify-between items-start mb-2 sm:mb-3">
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium mb-2">
                        <Icon.Leaf size={10} />
                        <span className="capitalize">
                          {productMain?.categoryData?.name}
                        </span>
                      </div>
                      <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-black mb-2 leading-tight">
                        {productMain.name}
                      </h1>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Rate currentRate={productMain.rate} size={12} />
                          <span className="text-xs text-gray-600 numeric-contrast">
                            {productMain.rate?.toFixed(1) || "0.0"}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          (
                          <span className="numeric-contrast">
                            {productReviews.length}
                          </span>{" "}
                          reviews)
                        </span>
                        {/* <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Icon.CheckCircle
                            size={12}
                            weight="fill"
                            className="text-success"
                          />
                          <span>Verified</span>
                        </div> */}
                      </div>
                    </div>

                    {/* <div
                  className={`add-wishlist-btn w-12 h-12 flex items-center justify-center border border-line cursor-pointer rounded-xl duration-300 hover:bg-black hover:text-white ${
                    wishlistState.wishlistArray.some(
                      (item) => item.id === productMain.id
                    )
                      ? "active"
                      : ""
                  }`}
                  onClick={handleAddToWishlist}
                >
                  {wishlistState.wishlistArray.some(
                    (item) => item.id === productMain.id
                  ) ? (
                    <>
                      <Icon.Heart
                        size={24}
                        weight="fill"
                        className="text-white"
                      />
                    </>
                  ) : (
                    <>
                      <Icon.Heart size={24} />
                    </>
                  )}
                </div>  */}
                  </div>
                  {/* Price Section */}
                  <m.div
                    className="price-block mb-3 sm:mb-4"
                    key={`price-${activeSize}`}
                    initial={{ opacity: 0.7, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="text-lg sm:text-2xl font-bold text-secondary numeric-contrast">
                          ₹{currentDisplayPrice.toFixed(0)}
                        </div>
                        <div className="flex flex-col">
                          {currentDisplayMrp &&
                            currentDisplayMrp > currentDisplayPrice && (
                              <span className="text-lg text-gray-400 line-through decoration-1 numeric-contrast">
                                ₹{currentDisplayMrp.toFixed(0)}
                              </span>
                            )}
                          {percentSale > 0 && (
                            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full numeric-contrast">
                              {percentSale}% OFF
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] sm:text-xs font-medium uppercase tracking-[0.08em] text-gray-500">
                      Incl. GST
                    </div>
                  </m.div>

                  {getCurrentCustomStock() && (
                    <div className="mb-3">
                      <span
                        className="inline-block w-fit text-[14px] sm:text-sm font-semibold px-2.5 py-1 rounded-full numeric-contrast"
                        style={{
                          backgroundColor: "#FFF3E0",
                          color: "#E65100",
                          border: "1px solid #FFCC80",
                        }}
                      >
                        {getCurrentCustomStock()}
                      </span>
                    </div>
                  )}

                  {/* Stock Status */}
                  {isOutOfStock ? (
                    <m.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red/50 border border-red rounded-lg p-3 sm:p-4 mb-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#A3162101] rounded-full">
                          <Icon.XCircle
                            size={20}
                            weight="fill"
                            className="text-[#A31621]"
                          />
                        </div>
                        <div>
                          <span className="block text-sm font-bold text-[#A31621]">
                            Out of Stock
                          </span>
                          <span className="text-xs text-[#A31621]">
                            We're working on restocking!
                          </span>
                        </div>
                      </div>
                    </m.div>
                  ) : (
                    <m.div></m.div>
                  )}

                  {/* Description */}
                  <div className="text-[14px] sm:text-sm text-gray-600 leading-relaxed mb-2.5 sm:mb-3 text-justify">
                    {productMain.description}
                  </div>

                  {ingredientPreviewItems.length > 0 && (
                    <div className="mb-3 sm:mb-4">
                      <p className="text-sm sm:text-lg font-semibold text-black mb-2">
                        Key Ingredients
                      </p>
                      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                        {ingredientPreviewItems.map((ingredient, index) => (
                          <div
                            key={`${ingredient.name ?? "ingredient"}-${index}`}
                            className="flex flex-col items-center text-center"
                          >
                            {ingredient.image ? (
                              <Image
                                src={getBackendImageUrl(ingredient.image)}
                                width={64}
                                height={64}
                                alt={ingredient.name || "Ingredient"}
                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border border-line shadow-sm"
                              />
                            ) : (
                              <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-100 flex items-center justify-center border border-green-200">
                                <Icon.Leaf
                                  size={24}
                                  className="text-green-700"
                                />
                              </span>
                            )}
                            <span className="mt-1.5 text-[11px] sm:text-xs font-medium text-secondary max-w-[88px] sm:max-w-[108px] line-clamp-2">
                              {ingredient.name || "Ingredient"}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex justify-center">
                        <button
                          type="button"
                          onClick={() =>
                            ingredientsSectionRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            })
                          }
                          className="text-xs sm:text-sm font-semibold text-primary underline underline-offset-4 hover:opacity-80 transition-opacity align-baseline"
                        >
                          View More
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Size Selection */}
                  <div className="mb-2.5 sm:mb-3">
                    <div className="mb-2">
                      <span className="text-xs sm:text-sm font-medium text-black">
                        Select Volume
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {hasVariants
                        ? // Display variants with prices
                          productMain.variants!.map((variant) => {
                            const isActive = activeSize === variant.name;
                            const variantDisplayPrice = calculateGstInclusivePrice(
                              variant.price,
                              variant.gstPercentage ?? productMain.gstPercentage,
                            );
                            const variantDisplayMrp = variant.mrpPrice
                              ? calculateGstInclusivePrice(
                                  variant.mrpPrice,
                                  variant.gstPercentage ?? productMain.gstPercentage,
                                )
                              : null;
                            const hasDiscount =
                              variantDisplayMrp !== null &&
                              variantDisplayMrp > variantDisplayPrice;

                            return (
                              <button
                                type="button"
                                className={`flex flex-col items-center justify-center px-3 py-2.5 min-w-[90px] sm:min-w-[100px] border-[1px] rounded-xl transition-all duration-200 ${
                                  isActive
                                    ? "border-primary bg-primary/10 shadow-md"
                                    : "border-black/30 bg-white hover:border-primary/50 hover:shadow-sm"
                                }`}
                                key={variant.id}
                                onClick={() => handleActiveSize(variant.name)}
                              >
                                <span
                                  className={`text-xs font-semibold mb-1 numeric-contrast ${isActive ? "text-primary" : "text-gray"}`}
                                >
                                  {variant.name}
                                </span>
                                <div className="flex flex-col items-center gap-0.5">
                                  <span
                                    className={`text-md font-bold mb-0 numeric-contrast ${isActive ? "text-primary" : "text-gray"}`}
                                  >
                                    ₹
                                    {variantDisplayPrice.toFixed(0)}
                                  </span>
                                  {/* {hasDiscount && variantDisplayMrp && (
                                    <span className="text-[10px] text-gray-400 line-through numeric-contrast">
                                      ₹{variantDisplayMrp.toFixed(0)}
                                    </span>
                                  )} */}
                                </div>
                              </button>
                            );
                          })
                        : hasSizePricing
                          ? // Legacy: New format with prices (from sizes array)
                            (
                              productSizes as Array<{
                                size: string;
                                price: number;
                                mrpPrice?: number;
                              }>
                            ).map((sizeData, index) => {
                              const isActive = activeSize === sizeData.size;
                              const hasDiscount =
                                sizeData.mrpPrice &&
                                sizeData.mrpPrice > sizeData.price;

                              return (
                                <button
                                  type="button"
                                  className={`flex flex-col items-center justify-center px-3 py-2.5 min-w-[90px] sm:min-w-[100px] border-2 rounded-xl transition-all duration-200 ${
                                    isActive
                                      ? "border-primary bg-primary/10 shadow-md"
                                      : "border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm"
                                  }`}
                                  key={sizeData.size}
                                  onClick={() =>
                                    handleActiveSize(sizeData.size)
                                  }
                                >
                                  <span
                                    className={`text-xs font-semibold mb-1 ${isActive ? "text-primary" : "text-gray-700"}`}
                                  >
                                    {sizeData.size}
                                  </span>
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span
                                      className={`text-sm font-bold numeric-contrast ${isActive ? "text-primary" : "text-gray-900"}`}
                                    >
                                      ₹
                                      {calculateGstInclusivePrice(
                                        sizeData.price,
                                        productMain.gstPercentage,
                                      ).toFixed(0)}
                                    </span>
                                    {hasDiscount && (
                                      <span className="text-[10px] text-gray-400 line-through numeric-contrast">
                                        ₹
                                        {calculateGstInclusivePrice(
                                          sizeData.mrpPrice!,
                                          productMain.gstPercentage,
                                        ).toFixed(0)}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })
                          : // Old format without prices (just size names)
                            getSizeNames().map((item) => {
                              const isActive = activeSize === item;
                              return (
                                <div
                                  key={item}
                                  className={`relative group cursor-pointer transition-all duration-300 ${
                                    isActive
                                      ? "border-primary bg-primary/5 text-primary"
                                      : "border-gray bg-white text-gray hover:border-primary hover:text-primary"
                                  } rounded-xl border-2 p-3 flex items-center gap-3 min-w-[100px] justify-center`}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => handleActiveSize(item)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ")
                                      handleActiveSize(item);
                                  }}
                                >
                                  <span
                                    className={`text-sm font-semibold ${isActive ? "text-primary" : "text-gray-700"}`}
                                  >
                                    {item}
                                  </span>
                                </div>
                              );
                            })}
                    </div>
                  </div>
                  {/* Quantity and Add to Cart */}
                  <div className="mb-3 sm:mb-4">
                    <div className="mb-1.5">
                      <span className="text-sm font-semibold text-gray-800">
                        Quantity
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                      {/* Highlighted Quantity Button Block */}
                      <div className="quantity-block flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 w-full sm:w-[140px] h-11 sm:h-12 p-1 shadow-inner">
                        <button
                          type="button"
                          onClick={handleDecreaseQuantity}
                          disabled={quantityPurchase === 1 || isOutOfStock}
                          className={`w-9 h-full flex items-center justify-center rounded-md bg-white shadow-sm border border-gray-200 transition-all z-0 ${
                            quantityPurchase === 1 || isOutOfStock
                              ? "text-gray-400 cursor-not-allowed opacity-60"
                              : "text-black hover:bg-gray-100 hover:border-gray-300"
                          }`}
                        >
                          <Icon.Minus size={16} weight="bold" />
                        </button>

                        <div className="flex-1 text-center font-bold text-black text-base">
                          {quantityPurchase}
                        </div>

                        <button
                          type="button"
                          onClick={handleIncreaseQuantity}
                          disabled={
                            isOutOfStock ||
                            quantityPurchase >= getCurrentStock()
                          }
                          className={`w-9 h-full flex items-center justify-center rounded-md bg-white shadow-sm border border-gray-200 transition-all ${
                            isOutOfStock ||
                            quantityPurchase >= getCurrentStock()
                              ? "text-gray-300 cursor-not-allowed shadow-none"
                              : "text-black hover:bg-gray-100 hover:border-gray-300"
                          }`}
                        >
                          <Icon.Plus size={16} weight="bold" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={isOutOfStock}
                        className={`flex-1 h-11 sm:h-12 py-2.5 sm:py-3px-4 sm:px-6 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                          isOutOfStock
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-primary text-white hover:opacity-90 shadow-md hover:shadow-lg"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Icon.ShoppingCart size={18} weight="bold" />
                          <span>
                            {isOutOfStock ? "Out of Stock" : "Add To Cart"}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Buy It Now Button - Only show if product is in stock */}
                  {!isOutOfStock && (
                    <div className="mb-2.5 sm:mb-3">
                      <button
                        type="button"
                        className={`w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 border-2  ${
                          shakeBuy ? "shake" : ""
                        } ${
                          isBuyingNow
                            ? "opacity-60 cursor-not-allowed bg-gray-300 text-gray-500 border-gray-300"
                            : "bg-white text-black border-black hover:bg-black hover:text-white"
                        }`}
                        onClick={handleBuyItNow}
                        disabled={isBuyingNow}
                        style={{ pointerEvents: isBuyingNow ? "none" : "auto" }}
                      >
                        {isBuyingNow ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm">Processing...</span>
                          </div>
                        ) : (
                          <span className="text-sm sm:text-base">
                            Buy It Now
                          </span>
                        )}
                      </button>
                    </div>
                  )}

                </div>
              </div>
              {/* Scroll Sentinel - detects when product card is scrolled */}
              <div ref={sentinelRef} className="h-1 w-full"></div>
            </div>
          </div>
        </div>

        {/* Ingredients Section - Always Visible */}
        {(() => {
          const keyIngredients = parseKeyIngredients(
            productMain.keyIngredients,
          );

          if (keyIngredients.length === 0) return null;

          return (
            <div
              ref={ingredientsSectionRef}
              className="ingredients-section py-6 sm:py-7 my-0 container mx-auto px-4 sm:px-6 md:px-10 lg:px-14"
            >
              <div className="flex items-center gap-2 mb-4 sm:mb-5">
                <h3 className="text-lg sm:text-2xl md:text-3xl font-bold">
                  Our {productMain.name} Major Ingredients
                </h3>
                <div className="h-px flex-1 bg-line"></div>
              </div>

              <div className="space-y-6">
                {keyIngredients.length > 0 && (
                  <div>
                    <h4 className="heading6 mb-4">Key Ingredients</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4  gap-3 sm:gap-4 md:gap-5">
                      {keyIngredients.map((ingredient, index) => (
                        <div
                          key={ingredient.name ?? String(index)}
                          className="text-center group"
                        >
                          {ingredient.image ? (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mx-auto mb-4 overflow-hidden shadow-sm border border-line group-hover:shadow-md transition-all duration-300">
                              <Image
                                src={getBackendImageUrl(ingredient.image)}
                                width={120}
                                height={120}
                                alt={ingredient.name || "Ingredient"}
                                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-full mx-auto mb-4 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300">
                              <Icon.Leaf
                                size={40}
                                className="text-green-600 transform group-hover:rotate-12 transition-transform duration-300"
                              />
                            </div>
                          )}
                          <h5 className="font-semibold text-[14px] sm:text-base mb-1 group-hover:text-success transition-colors">
                            {ingredient.name || "Ingredient"}
                          </h5>
                          {ingredient.benefits && (
                            <p className="text-[11px] sm:text-sm text-secondary leading-relaxed line-clamp-2">
                              {ingredient.benefits}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Accordion Sections - Show only after product card is scrolled */}
        {showAccordionSections && (
          <div className="accordion-sections md:pb-14 pb-8 animate-fadeInUp">
            <div className="container px-4 sm:px-6 md:px-10 lg:px-14">
              <div className="space-y-3 sm:space-y-4">
                {/* Benefits Section - Only show if benefits data exists */}
                {(() => {
                  const benefits = parseArrayOrString(productMain.benefits);
                  if (benefits.length === 0) return null;

                  return (
                    <div className={accordionCardClass}>
                      <button
                        className={accordionHeaderClass}
                        onClick={() => toggleAccordion("benefits")}
                      >
                        <div>
                          <h3 className={accordionTitleClass}>Benefits</h3>
                        </div>
                        <span
                          className={`${accordionIconClass} ${
                            expandedSections.has("benefits") ? "rotate-180" : ""
                          } ${
                            expandedSections.has("benefits")
                              ? "border-primary bg-primary text-white"
                              : ""
                          }`}
                        >
                          <Icon.CaretDown size={18} />
                        </span>
                      </button>
                      <div
                        className={`${accordionPanelClass} ${
                          expandedSections.has("benefits")
                            ? "max-h-[2000px] opacity-100"
                            : "max-h-0 opacity-0 mt-0"
                        }`}
                      >
                        <div className="border-t border-outline/50 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-secondary/70">
                              Why Choose Our {productMain.name}?
                            </h4>
                            <div className="grid md:grid-cols-2 gap-4">
                              {benefits.map((benefit) => (
                                <div
                                  key={benefit}
                                  className="flex items-start gap-3 rounded-2xl border border-outline/40 bg-surface/80 p-3.5"
                                >
                                  <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                                    <Icon.Check size={14} weight="bold" />
                                  </div>
                                  <p className="text-sm leading-6 text-secondary">
                                    {benefit}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Usage Section - Only show if usage steps data exists */}
                {(() => {
                  const usageSteps = parseArrayOrString(productMain.usageSteps);
                  if (usageSteps.length === 0) return null;

                  return (
                    <div className={accordionCardClass}>
                      <button
                        className={accordionHeaderClass}
                        onClick={() => toggleAccordion("usage")}
                      >
                        <div>
                          <h3 className={accordionTitleClass}>How to Use</h3>
                        </div>
                        <span
                          className={`${accordionIconClass} ${
                            expandedSections.has("usage") ? "rotate-180" : ""
                          } ${
                            expandedSections.has("usage")
                              ? "border-primary bg-primary text-white"
                              : ""
                          }`}
                        >
                          <Icon.CaretDown size={18} />
                        </span>
                      </button>
                      <div
                        className={`${accordionPanelClass} ${
                          expandedSections.has("usage")
                            ? "max-h-[2000px] opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="border-t border-outline/50 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                          <div className="space-y-3">
                            {usageSteps.map((step, index) => (
                              <div
                                key={`${step}-${index}`}
                                className="flex items-start gap-3 rounded-2xl border border-outline/40 bg-white p-3.5"
                              >
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white numeric-contrast">
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm leading-6 text-secondary">
                                    {step}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* FAQs Section - Only show if FAQs data exists */}
                {(() => {
                  const faqs = parseCommonQuestions(
                    productMain.commonQuestions,
                  );
                  if (faqs.length === 0) return null;

                  return (
                    <div className={accordionCardClass}>
                      <button
                        className={accordionHeaderClass}
                        onClick={() => toggleAccordion("faqs")}
                      >
                        <div>
                          <h3 className={accordionTitleClass}>
                            Common Questions
                          </h3>
                        </div>
                        <span
                          className={`${accordionIconClass} ${
                            expandedSections.has("faqs") ? "rotate-180" : ""
                          } ${
                            expandedSections.has("faqs")
                              ? "border-primary bg-primary text-white"
                              : ""
                          }`}
                        >
                          <Icon.CaretDown size={18} />
                        </span>
                      </button>
                      <div
                        className={`${accordionPanelClass} ${
                          expandedSections.has("faqs")
                            ? "max-h-[2000px] opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="border-t border-outline/50 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                          <div className="space-y-3">
                            {faqs.map((faq) => (
                              <div
                                key={faq.question}
                                className="rounded-2xl border border-outline/50 bg-surface/70 p-4"
                              >
                                <h5 className="mb-2 text-sm font-semibold text-black sm:text-base">
                                  {faq.question}
                                </h5>
                                <p className="text-sm leading-6 text-secondary">
                                  {faq.answer}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Other Information Section */}
                <div className={accordionCardClass}>
                  <button
                    className={accordionHeaderClass}
                    onClick={() => toggleAccordion("other-info")}
                  >
                    <div>
                      <h3 className={accordionTitleClass}>Other Information</h3>
                    </div>
                    <span
                      className={`${accordionIconClass} ${
                        expandedSections.has("other-info") ? "rotate-180" : ""
                      } ${
                        expandedSections.has("other-info")
                          ? "border-primary bg-primary text-white"
                          : ""
                      }`}
                    >
                      <Icon.CaretDown size={18} />
                    </span>
                  </button>
                  <div
                    className={`${accordionPanelClass} ${
                      expandedSections.has("other-info")
                        ? "max-h-[2000px] opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="border-t border-outline/50 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-outline/50">
                          <Icon.Recycle size={20} className="text-primary" />

                          <p className="text-secondary text-sm sm:text-base font-medium">
                            Eco-Friendly Packaging
                          </p>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-outline/50">
                          <Icon.Leaf size={20} className="text-primary" />
                          <p className="text-secondary text-sm sm:text-base font-medium">
                            100% Recyclable
                          </p>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-outline/50">
                          <Icon.Leaf size={20} className="text-primary" />
                          <p className="text-secondary text-sm sm:text-base font-medium">
                            Vegan & Natural
                          </p>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-outline/50">
                          <Icon.Heart size={20} className="text-primary" />
                          <p className="text-secondary text-sm sm:text-base font-medium">
                            Cruelty Free
                          </p>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-outline/50">
                          <Icon.Certificate
                            size={20}
                            className="text-primary"
                          />
                          <p className="text-secondary text-sm sm:text-base font-medium">
                            Natural Ingredients
                          </p>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-outline/50">
                          <Icon.Leaf size={20} className="text-primary" />
                          <p className="text-secondary text-sm sm:text-base font-medium">
                            Premium quality ingredients
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legal Metrology Section */}
                <div className={accordionCardClass}>
                  <button
                    className={accordionHeaderClass}
                    onClick={() => toggleAccordion("legal")}
                  >
                    <div>
                      <h3 className={accordionTitleClass}>Legal Metrology</h3>
                    </div>
                    <span
                      className={`${accordionIconClass} ${
                        expandedSections.has("legal") ? "rotate-180" : ""
                      } ${
                        expandedSections.has("legal")
                          ? "border-primary bg-primary text-white"
                          : ""
                      }`}
                    >
                      <Icon.CaretDown size={18} />
                    </span>
                  </button>
                  <div
                    className={`${accordionPanelClass} ${
                      expandedSections.has("legal")
                        ? "max-h-[2000px] opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="border-t border-outline/50 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* Product Details Panel */}
                        <div className="overflow-hidden rounded-2xl border-2 border-black bg-white">
                          <div className="flex items-center gap-2 border-b-2 border-black bg-surface/60 px-4 py-3 sm:px-5">
                            <Icon.Info size={18} className="text-primary" />
                            <h4 className="font-bold text-black uppercase tracking-wider text-[14px] m-0">
                              Product Details
                            </h4>
                          </div>
                          <div className="divide-y divide-outline/30">
                            <div className="grid grid-cols-1 sm:grid-cols-3 py-3 sm:py-4 px-4 sm:px-6 hover:bg-gray-50/30 transition-colors">
                              <span className="text-secondary text-xs font-medium mb-1 sm:mb-0">
                                Net Quantity :
                              </span>
                              <span className="font-semibold text-black text-xs sm:col-span-2">
                                {(() => {
                                  const sizeNames = getSizeNames();
                                  return sizeNames[0] || "100ml";
                                })()}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 py-3 sm:py-4 px-4 sm:px-6 hover:bg-gray-50/30 transition-colors">
                              <span className="text-secondary text-xs font-medium mb-1 sm:mb-0">
                                Commodity : 
                              </span>
                              <span className="font-semibold text-black text-xs sm:col-span-2 capitalize">
                                {productMain.category || "Cosmetic"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Shelf Life Panel */}
                        <div className="overflow-hidden rounded-2xl border-2 border-black bg-white">
                          <div className="flex items-center gap-2 border-b-2 border-black bg-surface/60 px-4 py-3 sm:px-5">
                            <Icon.CalendarBlank
                              size={18}
                              className="text-primary"
                            />
                            <h4 className="font-bold text-black uppercase tracking-wider text-[14px] m-0">
                              Shelf Life
                            </h4>
                          </div>
                          <div className="divide-y divide-outline/30">
                            <div className="grid grid-cols-1 sm:grid-cols-3 py-3 sm:py-4 px-4 sm:px-6 hover:bg-gray-50/30 transition-colors">
                              <span className="text-secondary text-xs font-medium mb-1 sm:mb-0">
                                Use Before :
                              </span>
                              <span className="font-semibold text-black text-xs sm:col-span-2">
                               24 months from the date of manufacture
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 py-3 sm:py-4 px-4 sm:px-6 hover:bg-gray-50/30 transition-colors items-center">
                              <span className="text-secondary text-xs font-medium mb-1 sm:mb-0">
                                Period After Opening (PAO) :
                              </span>
                              <span className="font-semibold text-black text-xs sm:col-span-2 flex items-center gap-2">
                                <span>6M</span>
                                <span className="text-xs text-secondary font-normal">
                                 (Use within 6 months after opening)
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Brand Ownership Panel */}
                        <div className="overflow-hidden rounded-2xl border-2 border-black bg-white">
                          <div className="flex items-center gap-2 border-b-2 border-black bg-surface/60 px-4 py-3 sm:px-5">
                            <Icon.Storefront
                              size={18}
                              className="text-primary"
                            />
                            <h4 className="font-bold text-black uppercase tracking-wider text-[14px] m-0">
                              Brand Ownership
                            </h4>
                          </div>
                          <div className="divide-y divide-outline/30">
                            <div className="grid grid-cols-1 sm:grid-cols-3 py-3 sm:py-4 px-4 sm:px-6 hover:bg-gray-50/30 transition-colors">
                              <span className="text-secondary text-xs font-medium mb-1 sm:mb-0">
                                Marketed by :
                              </span>
                              <span className="font-semibold text-black text-xs sm:col-span-2">
                                Naveenam Naturals
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 py-3 sm:py-4 px-4 sm:px-6 hover:bg-gray-50/30 transition-colors">
                              <span className="text-secondary text-xs font-medium mb-1 sm:mb-0">
                                Address :
                              </span>
                              <span className="font-medium text-black text-xs sm:col-span-2 leading-relaxed">
                                No 17 Sylvan Lodge Colony, Kelly&apos;s Road,
                                Kilpauk, Chennai - 600010
                              </span>
                            </div>
<div className="grid grid-cols-1 sm:grid-cols-3 py-3 sm:py-4 px-4 sm:px-6 hover:bg-gray-50/30 transition-colors">
                              <span className="text-secondary text-xs font-medium mb-1 sm:mb-0">
                               Country of Origin :
                              </span>
                              <span className="font-medium text-black text-xs sm:col-span-2 leading-relaxed">
                                 India
                              </span>
                            </div>
                            
                          </div>
                        </div>

                        {/* Manufacturing Panel */}
                        <div className="overflow-hidden rounded-2xl border-2 border-black bg-white">
                          <div className="flex items-center gap-2 border-b-2 border-black bg-surface/60 px-4 py-3 sm:px-5">
                            <Icon.Factory size={18} className="text-primary" />
                            <h4 className="font-bold text-black uppercase tracking-wider text-[14px] m-0">
                              Manufacturing Information
                            </h4>
                          </div>
                          <div className="divide-y divide-outline/30">
                            <div className="grid grid-cols-1 sm:grid-cols-3 py-3 sm:py-4 px-4 sm:px-6 hover:bg-gray-50/30 transition-colors">
                              <span className="text-secondary text-xs font-medium mb-1 sm:mb-0">
                                Manufactured by :
                              </span>
                              <span className="font-semibold text-black text-xs sm:col-span-2">
                                Clarion Cosmetics
                                <span className="block text-xs text-secondary mt-1 font-normal">
                                  (A division of Nikita containers Pvt Ltd)
                                </span>
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 py-3 sm:py-4 px-4 sm:px-6 hover:bg-gray-50/30 transition-colors">
                              <span className="text-secondary text-xs font-medium mb-1 sm:mb-0">
                                License Number :
                              </span>
                              <span className="font-semibold text-black text-xs sm:col-span-2">
                                C-1204
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 py-3 sm:py-4 px-4 sm:px-6 hover:bg-gray-50/30 transition-colors">
                              <span className="text-secondary text-xs font-medium mb-1 sm:mb-0">
                                Manufacturing Address :
                              </span>
                              <span className="font-medium text-black text-xs sm:col-span-2 leading-relaxed">
                                F-7, SIPCOT Industrial Park, Irungattukottai –
                                602105
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Enhanced Review Section */}
        <div className="review-block md:py-14 py-8 bg-white/40">
          <div className="container">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 sm:px-6 py-5 sm:py-6 border-b border-gray-100 text-center bg-white">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">
                  Real People Real Stories
                </h2>
                <p className="mt-1.5 text-sm text-gray-500">
                  Genuine customer ratings and feedback
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3">
                {/* Left Column - Rating Summary */}
                <div className="lg:col-span-1 p-5 sm:p-6 lg:border-r border-gray-100">
                  {/* Overall Rating */}
                  <div className="text-center mb-6">
                    <div className="text-4xl sm:text-5xl font-bold text-black mb-1 numeric-contrast">
                      {reviewStats.averageRating.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-500 mb-3">out of 5</div>
                    <div className="flex justify-center gap-0.5 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Icon.Star
                          key={i}
                          size={18}
                          weight="fill"
                          className={
                            i < Math.floor(reviewStats.averageRating)
                              ? "text-amber-500"
                              : "text-gray-300"
                          }
                        />
                      ))}
                    </div>
                    <div className="text-xs text-gray-400">
                      Based on{" "}
                      <span className="numeric-contrast">
                        {reviewStats.totalReviews}
                      </span>{" "}
                      {reviewStats.totalReviews === 1 ? "review" : "reviews"}
                    </div>
                  </div>

                  {/* Rating Breakdown */}
                  <div className="space-y-2.5 mb-6">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count =
                        reviewStats.ratingBreakdown[
                          String(
                            stars,
                          ) as keyof typeof reviewStats.ratingBreakdown
                        ];
                      const percentage =
                        reviewStats.totalReviews > 0
                          ? (count / reviewStats.totalReviews) * 100
                          : 0;
                      return (
                        <div key={stars} className="flex items-center gap-2.5">
                          <div className="flex items-center gap-1 w-9 shrink-0">
                            <span className="text-sm font-medium text-gray-700 numeric-contrast">
                              {stars}
                            </span>
                            <Icon.Star
                              size={12}
                              weight="fill"
                              className="text-amber-500"
                            />
                          </div>
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 w-6 text-right shrink-0 numeric-contrast">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Write Review Button */}
                  <button
                    onClick={
                      isAuthenticated
                        ? handleShowReviewForm
                        : () => {
                            toast.error("Please login to write reviews", {
                              duration: 4000,
                              icon: "🔒",
                            });
                            router.push("/login");
                          }
                    }
                    className="w-full bg-black text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-800 transition-colors text-sm"
                  >
                    Write a Review
                  </button>
                </div>

                {/* Right Column - Reviews List */}
                <div
                  className="lg:col-span-2 flex flex-col"
                  id="reviews-section"
                >
                  {/* Sort Bar */}
                  <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-gray-100">
                    <span className="text-sm text-gray-500">
                      <span className="numeric-contrast">
                        {sortedReviews.length}
                      </span>{" "}
                      {sortedReviews.length === 1 ? "review" : "reviews"}
                    </span>
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={handleSortChange}
                        className="pl-3 pr-7 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 appearance-none text-sm text-gray-700 cursor-pointer"
                      >
                        <option value="highest">Highest Rating</option>
                        <option value="lowest">Lowest Rating</option>
                        <option value="newest">Most Recent</option>
                        <option value="oldest">Oldest</option>
                      </select>
                      <Icon.CaretDown
                        size={12}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Reviews */}
                  {reviewsLoading ? (
                    <div className="flex-1 flex items-center justify-center p-10">
                      <p className="text-sm text-gray-400">
                        Loading reviews...
                      </p>
                    </div>
                  ) : sortedReviews.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-10">
                      <div className="text-center">
                        <Icon.Star
                          size={32}
                          weight="regular"
                          className="text-gray-200 mx-auto mb-3"
                        />
                        <p className="text-sm text-gray-400">
                          No reviews yet. Be the first to review!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`divide-y divide-gray-50 ${
                        isReviewListScrollable
                          ? "max-h-[420px] overflow-y-auto"
                          : ""
                      }`}
                    >
                      {sortedReviews.map((review, index) => (
                        <div
                          key={review.id}
                          data-review-item={index === 0 ? "first" : undefined}
                          className="px-5 sm:px-6 py-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Image
                                src={review.avatar ?? "/images/avatar/face.png"}
                                width={32}
                                height={32}
                                alt={review.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 text-sm">
                                    {review.name}
                                  </span>
                                  {review.verified && (
                                    <span className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-medium rounded-full">
                                      Verified
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Icon.Star
                                      key={star}
                                      size={12}
                                      weight={
                                        star <=
                                        Math.round(Number(review.rating))
                                          ? "fill"
                                          : "regular"
                                      }
                                      className={
                                        star <=
                                        Math.round(Number(review.rating))
                                          ? "text-amber-500"
                                          : "text-gray-300"
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 shrink-0">
                              {new Date(review.date).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                },
                              )}
                            </span>
                          </div>
                          <p className="text-gray-700 leading-relaxed text-sm ml-11">
                            {review.text}
                          </p>
                          {review.adminReply && (
                            <div className="ml-11 mt-2 flex items-start gap-2">
                              <Icon.ArrowBendDownRightIcon
                                size={14}
                                className="mt-0.5 shrink-0 text-green-700"
                                weight="bold"
                              />
                              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-800">
                                <span className="mr-1 font-semibold text-green-700">
                                  Admin reply:
                                </span>
                                {review.adminReply}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Review Form */}
            {showReviewForm && (
              <div
                id="review-form"
                className="mt-6 sm:mt-8 bg-gray-50 rounded-2xl p-5 sm:p-6 border border-gray-200"
              >
                <h3 className="text-xl sm:text-2xl font-semibold text-black mb-5">
                  Write a review
                </h3>
                <form
                  onSubmit={handleReviewSubmit}
                  className="space-y-5"
                  noValidate
                >
                  {/* Rating Section */}
                  <div>
                    <label
                      htmlFor="review-rating"
                      className="block text-sm font-medium text-gray-700 mb-3"
                    >
                      Rating <span className="text-red-500">*</span>
                    </label>
                    <div
                      className="flex items-center gap-2"
                      role="radiogroup"
                      aria-label="Rating"
                      onMouseLeave={() => setHoveredRating(0)}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleReviewFormChange("rating", star)}
                          onMouseEnter={() => setHoveredRating(star)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleReviewFormChange("rating", star);
                            }
                          }}
                          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                          className="focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2 rounded transition-transform hover:scale-110 active:scale-95"
                        >
                          {star <= (hoveredRating || reviewFormData.rating) ? (
                            <Icon.Star
                              size={32}
                              weight="fill"
                              className="text-amber-500"
                            />
                          ) : (
                            <Icon.Star
                              size={32}
                              weight="regular"
                              className="text-gray-400"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {reviewFormData.rating > 0
                        ? `Selected rating: ${reviewFormData.rating}/5`
                        : "Select 1 to 5 stars"}
                    </p>
                    {reviewFormData.rating > 0 && (
                      <p className="text-xs text-gray-500">
                        <span className="numeric-contrast">
                          {selectedRatingReviewCount}
                        </span>{" "}
                        reviews with{" "}
                        <span className="numeric-contrast">
                          {reviewFormData.rating}
                        </span>{" "}
                        star rating
                      </p>
                    )}
                    {reviewFormErrors.rating && (
                      <p className="mt-1 text-sm text-red-500" role="alert">
                        {reviewFormErrors.rating}
                      </p>
                    )}
                  </div>

                  {/* Review Content */}
                  <div>
                    <label
                      htmlFor="review-content"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Review content <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="review-content"
                      value={reviewFormData.content}
                      onChange={(e) =>
                        handleReviewFormChange("content", e.target.value)
                      }
                      className={`w-full border px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-success focus:border-transparent text-sm sm:text-base resize-y min-h-[120px] transition-colors ${
                        reviewFormErrors.content
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="Start writing here..."
                      rows={6}
                      maxLength={300}
                      aria-invalid={!!reviewFormErrors.content}
                      aria-describedby={
                        reviewFormErrors.content ? "content-error" : undefined
                      }
                    />
                    <div className="flex justify-between items-center mt-1">
                      {reviewFormErrors.content ? (
                        <p
                          id="content-error"
                          className="text-sm text-red-500"
                          role="alert"
                        >
                          {reviewFormErrors.content}
                        </p>
                      ) : (
                        <span className="text-sm text-gray-400">
                          {reviewFormData.content.length}/300 characters
                        </span>
                      )}
                    </div>
                  </div>

                  {/* User Info Display (Read-only) */}
                  {user && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Reviewing as:</span>{" "}
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.firstName || user.lastName || user.email}
                      </p>
                    </div>
                  )}

                  {/* Privacy Information */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      How we use your data: We&apos;ll only contact you about
                      the review you left, and only if necessary. By submitting
                      your review, you agree to{" "}
                      <button
                        type="button"
                        className="text-success hover:underline font-medium"
                      >
                        Naveenam Naturals terms, privacy and content policies
                      </button>
                      .
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCancelReviewForm}
                      className="flex-1 px-6 py-3 border-2 border-primary text-primary rounded-lg font-medium hover:bg-primary hover:text-white transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isSubmittingReview}
                    >
                      Cancel review
                    </button>
                    <button
                      type="submit"
                      disabled={
                        isSubmittingReview || reviewFormData.rating === 0
                      }
                      className={`flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-secondary transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${shakeBuy ? "shake" : ""}`}
                    >
                      {isSubmittingReview ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Submitting...</span>
                        </>
                      ) : (
                        "Submit Review"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Related Product Section */}
        {relatedProducts.length > 0 && (
          <div className="related-product md:py-10 py-6">
            <div className="container">
              <div className="heading3 text-center">
                Customers who also bought
              </div>
              <div className="list-product hide-product-sold flex flex-nowrap overflow-x-auto overflow-y-hidden gap-3 sm:gap-4 md:gap-5 md:mt-6 mt-4 pb-4">
                {relatedProducts
                  .slice(0, 8)
                  .map((item, index) => (
                    <div
                      key={`sale-related-${item.id}`}
                      className="flex-shrink-0 w-[200px] sm:w-[220px] md:w-[240px]"
                    >
                      <ProductCard
                        product={item}
                        index={index}
                        onAddToCart={handleAddRelatedProductToCart}
                        onViewDetails={handleViewDetails}
                        getCategoryColor={getCategoryColor}
                      />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </LazyMotion>
  );
};

export default Sale;
