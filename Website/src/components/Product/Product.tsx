"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ProductType } from "@/type/ProductType";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/context/CartContext";
import { useModalCartContext } from "@/context/ModalCartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useModalWishlistContext } from "@/context/ModalWishlistContext";
import { useCompare } from "@/context/CompareContext";
import { useModalCompareContext } from "@/context/ModalCompareContext";
import { useModalQuickviewContext } from "@/context/ModalQuickviewContext";
import { useRouter } from "next/navigation";
import Marquee from "react-fast-marquee";
import Rate from "../Other/Rate";
import toast from "react-hot-toast";
import { getBackendImageUrl } from "@/lib/utils";
import {
  formatProductMrpPrice,
  formatProductPrice,
  getProductMaxDiscount,
} from "@/lib/price-utils";

interface ProductProps {
  data: ProductType;
  type: string;
  style: string;
}

const Product: React.FC<ProductProps> = ({ data, type, style }) => {
  const [openQuickShop, setOpenQuickShop] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const { addToCart, updateCart, cartState } = useCart();
  const { openModalCart } = useModalCartContext();
  const { addToWishlist, removeFromWishlist, wishlistState } = useWishlist();
  const { openModalWishlist } = useModalWishlistContext();
  const { addToCompare, removeFromCompare, compareState } = useCompare();
  const { openModalCompare } = useModalCompareContext();
  const { openQuickview } = useModalQuickviewContext();
  const router = useRouter();

  const handleAddToCart = () => {
    if (!cartState.cartArray.find((item) => item.id === data.id)) {
      addToCart({ ...data });
      updateCart(String(data.id), data.quantityPurchase, "");
    } else {
      updateCart(String(data.id), data.quantityPurchase, "");
    }
    openModalCart();
  };

  const handleAddToWishlist = () => {
    // if product existed in wishlit, remove from wishlist and set state to false
    if (wishlistState.wishlistArray.some((item) => item.id === data.id)) {
      removeFromWishlist(String(data.id));
    } else {
      // else, add to wishlist and set state to true
      addToWishlist(data);
    }
    openModalWishlist();
  };

  const handleAddToCompare = () => {
    // if product existed in wishlit, remove from wishlist and set state to false
    if (compareState.compareArray.length < 3) {
      if (compareState.compareArray.some((item) => item.id === data.id)) {
        removeFromCompare(String(data.id));
      } else {
        // else, add to wishlist and set state to true
        addToCompare(data);
      }
    } else {
      toast.error("Compare up to 3 products");
    }

    openModalCompare();
  };

  const handleQuickviewOpen = () => {
    openQuickview(data);
  };

  const handleDetailProduct = (productId: string, productSlug?: string) => {
    // Use slug if available, otherwise fallback to ID
    const slug = productSlug || productId;
    router.push(`/product/${slug}`);
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

  const percentSale = getProductMaxDiscount(data);
  const displayPrice = formatProductPrice(data);
  const displayMrp = formatProductMrpPrice(data);
  let percentSold = Math.floor((data.sold / data.quantity) * 100);

  return (
    <>
      {type === "grid" ? (
        <div className={`product-item grid-type ${style}`}>
          <div
            onClick={() => handleDetailProduct(String(data.id), data.slug)}
            className="product-main cursor-pointer block"
          >
            <div className="product-thumb bg-white relative overflow-hidden rounded-2xl">
              {(data.tag?.toLowerCase() === "new") && (
                <div className="product-tag text-button-uppercase bg-primarypx-3 py-0.5 inline-block rounded-full absolute top-3 left-3 z-[1]">
                  New
                </div>
              )}
              {(data.tag?.toLowerCase() === "sale") && (
                <div className="product-tag text-button-uppercase text-white bg-red px-3 py-0.5 inline-block rounded-full absolute top-3 left-3 z-[1]">
                  Sale
                </div>
              )}
              {style === "style-1" ||
                style === "style-3" ||
                style === "style-4" ? (
                <div className="list-action-right absolute top-3 right-3 max-lg:hidden">
                  {style === "style-4" && (
                    <div
                      className={`add-cart-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative mb-2 ${cartState.cartArray.some((item) => item.id === data.id)
                        ? "active"
                        : ""
                        }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart();
                      }}
                    >
                      <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">
                        Add To Cart
                      </div>
                      <Icon.ShoppingBagOpen size={20} />
                    </div>
                  )}
                  <div
                    className={`add-wishlist-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative ${wishlistState.wishlistArray.some(
                      (item) => item.id === data.id
                    )
                      ? "active"
                      : ""
                      }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToWishlist();
                    }}
                  >
                    <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">
                      Add To Wishlist
                    </div>
                    {wishlistState.wishlistArray.some(
                      (item) => item.id === data.id
                    ) ? (
                      <>
                        <Icon.Heart
                          size={18}
                          weight="fill"
                          className="text-white"
                        />
                      </>
                    ) : (
                      <>
                        <Icon.Heart size={18} />
                      </>
                    )}
                  </div>
                  <div
                    className={`compare-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative mt-2 ${compareState.compareArray.some(
                      (item) => item.id === data.id
                    )
                      ? "active"
                      : ""
                      }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCompare();
                    }}
                  >
                    <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">
                      Compare Product
                    </div>
                    <Icon.Repeat size={18} className="compare-icon" />
                    <Icon.CheckCircle size={20} className="checked-icon" />
                  </div>
                  {style === "style-3" || style === "style-4" ? (
                    <div
                      className={`quick-view-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative mt-2 ${compareState.compareArray.some(
                        (item) => item.id === data.id
                      )
                        ? "active"
                        : ""
                        }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickviewOpen();
                      }}
                    >
                      <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">
                        Quick View
                      </div>
                      <Icon.Eye size={20} />
                    </div>
                  ) : (
                    <></>
                  )}
                </div>
              ) : (
                <></>
              )}
              <div className="product-img w-full h-full aspect-[3/4]">
                {(Array.isArray(data.images) ? data.images : []).map((img, index) => (
                  <Image
                    key={index}
                    src={img}
                    width={500}
                    height={500}
                    priority={true}
                    alt={data.name}
                    className="w-full h-full object-cover duration-700"
                  />
                ))}
              </div>
              {(data.tag?.toLowerCase() === "sale" || data.sale) && (
                <>
                  <Marquee className="banner-sale-auto bg-black absolute bottom-0 left-0 w-full py-1.5">
                    <div
                      className={`caption2 font-semibold uppercase text-white px-2.5 numeric-contrast`}
                    >
                      Hot Sale {percentSale}% OFF
                    </div>
                    <Icon.Lightning weight="fill" className="text-red" />
                    <div
                      className={`caption2 font-semibold uppercase text-white px-2.5 numeric-contrast`}
                    >
                      Hot Sale {percentSale}% OFF
                    </div>
                    <Icon.Lightning weight="fill" className="text-red" />
                    <div
                      className={`caption2 font-semibold uppercase text-white px-2.5 numeric-contrast`}
                    >
                      Hot Sale {percentSale}% OFF
                    </div>
                    <Icon.Lightning weight="fill" className="text-red" />
                    <div
                      className={`caption2 font-semibold uppercase text-white px-2.5 numeric-contrast`}
                    >
                      Hot Sale {percentSale}% OFF
                    </div>
                    <Icon.Lightning weight="fill" className="text-red" />
                    <div
                      className={`caption2 font-semibold uppercase text-white px-2.5 numeric-contrast`}
                    >
                      Hot Sale {percentSale}% OFF
                    </div>
                    <Icon.Lightning weight="fill" className="text-red" />
                  </Marquee>
                </>
              )}
              {style === "style-1" || style === "style-3" ? (
                <div
                  className={`list-action ${style === "style-1" ? "grid grid-cols-2 gap-3" : ""
                    } px-5 absolute w-full bottom-5 max-lg:hidden`}
                >
                  {style === "style-1" && (
                    <div
                      className="quick-view-btn w-full text-button-uppercase py-2 text-center rounded-full duration-300 bg-white hover:bg-black hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickviewOpen();
                      }}
                    >
                      Quick View
                    </div>
                  )}
                  {data.action === "add to cart" ? (
                    <div
                      className="add-cart-btn w-full text-button-uppercase py-2 text-center rounded-full duration-500 bg-white hover:bg-black hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart();
                      }}
                    >
                      Add To Cart
                    </div>
                  ) : (
                    <>
                      <div
                        className="quick-shop-btn text-button-uppercase py-2 text-center rounded-full duration-500 bg-white hover:bg-black hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenQuickShop(!openQuickShop);
                        }}
                      >
                        Quick Shop
                      </div>
                      <div
                        className={`quick-shop-block absolute left-5 right-5 bg-white p-5 rounded-[20px] ${openQuickShop ? "open" : ""
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <div
                          className="button-main w-full text-center rounded-full py-3 mt-4"
                          onClick={() => {
                            handleAddToCart();
                            setOpenQuickShop(false);
                          }}
                        >
                          Add To cart
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <></>
              )}
              {style === "style-2" || style === "style-5" ? (
                <>
                  <div
                    className={`list-action flex items-center justify-center gap-3 px-5 absolute w-full ${style === "style-2" ? "bottom-12" : "bottom-5"
                      } max-lg:hidden`}
                  >
                    {style === "style-2" && (
                      <div
                        className={`add-cart-btn w-9 h-9 flex items-center justify-center rounded-full bg-white duration-300 relative ${compareState.compareArray.some(
                          (item) => item.id === data.id
                        )
                          ? "active"
                          : ""
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart();
                        }}
                      >
                        <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">
                          Add To Cart
                        </div>
                        <Icon.ShoppingBagOpen size={20} />
                      </div>
                    )}
                    <div
                      className={`add-wishlist-btn w-9 h-9 flex items-center justify-center rounded-full bg-white duration-300 relative ${wishlistState.wishlistArray.some(
                        (item) => item.id === data.id
                      )
                        ? "active"
                        : ""
                        }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToWishlist();
                      }}
                    >
                      <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">
                        Add To Wishlist
                      </div>
                      {wishlistState.wishlistArray.some(
                        (item) => item.id === data.id
                      ) ? (
                        <>
                          <Icon.Heart
                            size={18}
                            weight="fill"
                            className="text-white"
                          />
                        </>
                      ) : (
                        <>
                          <Icon.Heart size={18} />
                        </>
                      )}
                    </div>
                    <div
                      className={`compare-btn w-9 h-9 flex items-center justify-center rounded-full bg-white duration-300 relative ${compareState.compareArray.some(
                        (item) => item.id === data.id
                      )
                        ? "active"
                        : ""
                        }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCompare();
                      }}
                    >
                      <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">
                        Compare Product
                      </div>
                      <Icon.Repeat size={18} className="compare-icon" />
                      <Icon.CheckCircle size={20} className="checked-icon" />
                    </div>
                    <div
                      className={`quick-view-btn w-9 h-9 flex items-center justify-center rounded-full bg-white duration-300 relative ${compareState.compareArray.some(
                        (item) => item.id === data.id
                      )
                        ? "active"
                        : ""
                        }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickviewOpen();
                      }}
                    >
                      <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">
                        Quick View
                      </div>
                      <Icon.Eye size={20} />
                    </div>
                    {style === "style-5" && data.action !== "add to cart" && (
                      <div
                        className={`quick-shop-block absolute left-5 right-5 bg-white p-5 rounded-[20px] ${openQuickShop ? "open" : ""
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <div
                          className="button-main w-full text-center rounded-full py-3 mt-4"
                          onClick={() => {
                            handleAddToCart();
                            setOpenQuickShop(false);
                          }}
                        >
                          Add To cart
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <></>
              )}
              <div className="list-action-icon flex items-center justify-center gap-2 absolute w-full bottom-3 z-[1] lg:hidden">
                <div
                  className="quick-view-btn w-9 h-9 flex items-center justify-center rounded-lg duration-300 bg-white hover:bg-black hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickviewOpen();
                  }}
                >
                  <Icon.Eye className="text-lg" />
                </div>
                <div
                  className="add-cart-btn w-9 h-9 flex items-center justify-center rounded-lg duration-300 bg-white hover:bg-black hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart();
                  }}
                >
                  <Icon.ShoppingBagOpen className="text-lg" />
                </div>
              </div>
            </div>
            <div className="product-infor mt-4 lg:mb-7">
              <div className="product-sold sm:pb-4 pb-2">
                <div className="progress bg-line h-1.5 w-full rounded-full overflow-hidden relative">
                  <div
                    className={`progress-sold bg-red absolute left-0 top-0 h-full`}
                    style={{ width: `${percentSold}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between gap-3 gap-y-1 flex-wrap mt-2">
                  <div className="text-button-uppercase">
                    <span className="text-secondary2 max-sm:text-xs">
                      Sold:{" "}
                    </span>
                    <span className="max-sm:text-xs numeric-contrast">{data.sold}</span>
                  </div>
                  <div className="text-button-uppercase">
                    <span className="text-secondary2 max-sm:text-xs">
                      Available:{" "}
                    </span>
                    <span className="max-sm:text-xs numeric-contrast">
                      {data.quantity - data.sold}
                    </span>
                  </div>
                </div>
              </div>
              <div className="product-name text-title duration-300">
                {data.name}
              </div>
              <div className="product-price-block flex items-center gap-2 flex-wrap mt-1 duration-300 relative z-[1]">
                <div className="product-price text-title">{displayPrice}</div>
                {percentSale > 0 && displayMrp && (
                  <>
                    <div className="product-origin-price caption1 text-secondary2">
                      <del>{displayMrp}</del>
                    </div>
                    <div className="product-sale caption1 font-medium bg-primarypx-3 py-0.5 inline-block rounded-full">
                      -{percentSale}%
                    </div>
                  </>
                )}
              </div>

              {style === "style-5" && (
                <>
                  {data.action === "add to cart" ? (
                    <div
                      className="add-cart-btn w-full text-button-uppercase py-2.5 text-center mt-2 rounded-full duration-300 bg-white border border-black hover:bg-black hover:text-white max-lg:hidden"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart();
                      }}
                    >
                      Add To Cart
                    </div>
                  ) : (
                    <div
                      className="quick-shop-btn text-button-uppercase py-2.5 text-center mt-2 rounded-full duration-300 bg-white border border-black hover:bg-black hover:text-white max-lg:hidden"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenQuickShop(!openQuickShop);
                      }}
                    >
                      Quick Shop
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Accordion Sections for Product Details */}
            {type === "grid" &&
              (style === "style-1" ||
                style === "style-3" ||
                style === "style-4") && (
                <div className="accordion-sections mt-6">
                  {/* Benefits Section */}
                  {data.benefits && data.benefits.length > 0 && (
                    <div className="accordion-item border-b border-line py-4">
                      <button
                        className="accordion-header w-full flex items-center justify-between text-left"
                        onClick={() => toggleAccordion("benefits")}
                      >
                        <h4 className="text-sm font-semibold">Benefits</h4>
                        <Icon.CaretDown
                          size={16}
                          className={`transition-transform duration-300 ${expandedSections.has("benefits") ? "rotate-180" : ""
                            }`}
                        />
                      </button>
                      <div
                        className={`accordion-content overflow-hidden transition-all duration-500 ease-in-out ${expandedSections.has("benefits")
                          ? "max-h-[500px] opacity-100 mt-3"
                          : "max-h-0 opacity-0 mt-0"
                          }`}
                      >
                        <div className="space-y-2">
                          {Array.isArray(data.benefits) && data.benefits.slice(0, 3).map((benefit, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-success rounded-full mt-2 flex-shrink-0"></div>
                              <p className="text-xs text-secondary">
                                {benefit}
                              </p>
                            </div>
                          ))}
                          {data.benefits.length > 3 && (
                            <p className="text-xs text-secondary font-medium">
                              +{data.benefits.length - 3} more benefits
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Key Ingredients Section */}
                  {data.keyIngredients && data.keyIngredients.length > 0 && (
                    <div className="accordion-item border-b border-line py-4">
                      <button
                        className="accordion-header w-full flex items-center justify-between text-left"
                        onClick={() => toggleAccordion("ingredients")}
                      >
                        <h4 className="text-sm font-semibold">
                          Key Ingredients
                        </h4>
                        <Icon.CaretDown
                          size={16}
                          className={`transition-transform duration-300 ${expandedSections.has("ingredients")
                            ? "rotate-180"
                            : ""
                            }`}
                        />
                      </button>
                      <div
                        className={`accordion-content overflow-hidden transition-all duration-500 ease-in-out ${expandedSections.has("ingredients")
                          ? "max-h-[500px] opacity-100 mt-3"
                          : "max-h-0 opacity-0 mt-0"
                          }`}
                      >
                        <div className="space-y-2">
                          {Array.isArray(data.keyIngredients) && data.keyIngredients
                            .slice(0, 3)
                            .map((ingredient: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <Icon.Leaf size={14} className="text-success" />
                                <p className="text-xs text-secondary">
                                  {typeof ingredient === 'string' ? ingredient : ingredient.name}
                                </p>
                              </div>
                            ))}
                          {data.keyIngredients.length > 3 && (
                            <p className="text-xs text-secondary font-medium">
                              +{data.keyIngredients.length - 3} more ingredients
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Product Details Section */}
                  <div className="accordion-item py-4">
                    <button
                      className="accordion-header w-full flex items-center justify-between text-left"
                      onClick={() => toggleAccordion("details")}
                    >
                      <h4 className="text-sm font-semibold">Product Details</h4>
                      <Icon.CaretDown
                        size={16}
                        className={`transition-transform duration-300 ${expandedSections.has("details") ? "rotate-180" : ""
                          }`}
                      />
                    </button>
                    <div
                      className={`accordion-content overflow-hidden transition-all duration-500 ease-in-out ${expandedSections.has("details")
                        ? "max-h-[500px] opacity-100 mt-3"
                        : "max-h-0 opacity-0 mt-0"
                        }`}
                    >
                      <div className="space-y-2 text-xs">
                        {data.netWeight && (
                          <div className="flex justify-between">
                            <span className="text-secondary">Net Weight:</span>
                            <span className="font-medium">
                              {data.netWeight}
                            </span>
                          </div>
                        )}
                        {data.pricePerUnit && (
                          <div className="flex justify-between">
                            <span className="text-secondary">
                              Price per unit:
                            </span>
                            <span className="font-medium numeric-contrast">
                              {data.pricePerUnit}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-secondary">Category:</span>
                          <span className="font-medium capitalize">
                            {data.type}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-secondary">Rating:</span>
                          <div className="flex items-center gap-1">
                            <Rate currentRate={data.rate} size={10} />
                            <span className="font-medium numeric-contrast">({data.rate})</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      ) : (
        <>
          {type === "list" ? (
            <>
              <div className="product-item list-type">
                <div className="product-main cursor-pointer flex lg:items-center sm:justify-between gap-7 max-lg:gap-5">
                  <div
                    onClick={() => handleDetailProduct(String(data.id), data.slug)}
                    className="product-thumb bg-white relative overflow-hidden rounded-2xl block max-sm:w-1/2"
                  >
                    {(data.tag?.toLowerCase() === "new" || data.new) && (
                      <div className="product-tag text-button-uppercase bg-primarypx-3 py-0.5 inline-block rounded-full absolute top-3 left-3 z-[1]">
                        New
                      </div>
                    )}
                    {data.sale && (
                      <div className="product-tag text-button-uppercase text-white bg-red px-3 py-0.5 inline-block rounded-full absolute top-3 left-3 z-[1]">
                        Sale
                      </div>
                    )}
                    <div className="product-img w-full aspect-[3/4] rounded-2xl overflow-hidden">
                      {(Array.isArray(data.images) ? data.images : []).map((img, index) => (
                        <Image
                          key={index}
                          src={getBackendImageUrl(img)}
                          width={500}
                          height={500}
                          priority={true}
                          alt={data.name}
                          className="w-full h-full object-cover duration-700"
                        />
                      ))}
                    </div>
                    <div className="list-action px-5 absolute w-full bottom-5 max-lg:hidden">
                      <div
                        className={`quick-shop-block absolute left-5 right-5 bg-white p-5 rounded-[20px] ${openQuickShop ? "open" : ""
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <div
                          className="button-main w-full text-center rounded-full py-3 mt-4"
                          onClick={() => {
                            handleAddToCart();
                            setOpenQuickShop(false);
                          }}
                        >
                          Add To cart
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex sm:items-center gap-7 max-lg:gap-4 max-lg:flex-wrap max-lg:w-full max-sm:flex-col max-sm:w-1/2">
                    <div className="product-infor max-sm:w-full">
                      <div
                        onClick={() => handleDetailProduct(String(data.id), data.slug)}
                        className="product-name heading6 inline-block duration-300"
                      >
                        {data.name}
                      </div>
                      <div className="product-price-block flex items-center gap-2 flex-wrap mt-2 duration-300 relative z-[1]">
                        <div className="product-price text-title">{displayPrice}</div>
                        {displayMrp && (
                          <div className="product-origin-price caption1 text-secondary2">
                            <del>{displayMrp}</del>
                          </div>
                        )}
                        {percentSale > 0 && displayMrp && (
                          <div className="product-sale caption1 font-medium bg-primarypx-3 py-0.5 inline-block rounded-full">
                            -{percentSale}%
                          </div>
                        )}
                      </div>
                      <div className="text-secondary desc mt-5 max-sm:hidden">
                        {data.description}
                      </div>
                    </div>
                    <div className="action w-fit flex flex-col items-center justify-center">
                      <div
                        className="quick-shop-btn button-main whitespace-nowrap py-2 px-9 max-lg:px-5 rounded-full bg-white text-black border border-black hover:bg-black hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenQuickShop(!openQuickShop);
                        }}
                      >
                        Quick Shop
                      </div>
                      <div className="list-action-right flex items-center justify-center gap-3 mt-4">
                        <div
                          className={`add-wishlist-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative ${wishlistState.wishlistArray.some(
                            (item) => item.id === data.id
                          )
                            ? "active"
                            : ""
                            }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToWishlist();
                          }}
                        >
                          <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">
                            Add To Wishlist
                          </div>
                          {wishlistState.wishlistArray.some(
                            (item) => item.id === data.id
                          ) ? (
                            <>
                              <Icon.Heart
                                size={18}
                                weight="fill"
                                className="text-white"
                              />
                            </>
                          ) : (
                            <>
                              <Icon.Heart size={18} />
                            </>
                          )}
                        </div>
                        <div
                          className={`compare-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative ${compareState.compareArray.some(
                            (item) => item.id === data.id
                          )
                            ? "active"
                            : ""
                            }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCompare();
                          }}
                        >
                          <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">
                            Compare Product
                          </div>
                          <Icon.ArrowsCounterClockwise
                            size={18}
                            className="compare-icon"
                          />
                          <Icon.CheckCircle
                            size={20}
                            className="checked-icon"
                          />
                        </div>
                        <div
                          className="quick-view-btn-list w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickviewOpen();
                          }}
                        >
                          <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">
                            Quick View
                          </div>
                          <Icon.Eye size={18} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <></>
          )}
        </>
      )}

      {type === "marketplace" ? (
        <div
          className="product-item style-marketplace p-4 border border-line rounded-2xl"
          onClick={() => handleDetailProduct(String(data.id))}
        >
          <div className="bg-img relative w-full">
            <Image
              className="w-full aspect-square"
              width={5000}
              height={5000}
              src={
                Array.isArray(data.images) && data.images.length > 0
                  ? getBackendImageUrl(data.images[0])
                  : "/images/product/default.png"
              }
              alt="img"
            />
            <div className="list-action flex flex-col gap-1 absolute top-0 right-0">
              <span
                className={`add-wishlist-btn w-8 h-8 bg-white flex items-center justify-center rounded-full box-shadow-sm duration-300 ${wishlistState.wishlistArray.some(
                  (item) => item.id === data.id
                )
                  ? "active"
                  : ""
                  }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToWishlist();
                }}
              >
                {wishlistState.wishlistArray.some(
                  (item) => item.id === data.id
                ) ? (
                  <>
                    <Icon.Heart
                      size={18}
                      weight="fill"
                      className="text-white"
                    />
                  </>
                ) : (
                  <>
                    <Icon.Heart size={18} />
                  </>
                )}
              </span>
              <span
                className={`compare-btn w-8 h-8 bg-white flex items-center justify-center rounded-full box-shadow-sm duration-300 ${compareState.compareArray.some((item) => item.id === data.id)
                  ? "active"
                  : ""
                  }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCompare();
                }}
              >
                <Icon.Repeat size={18} className="compare-icon" />
                <Icon.CheckCircle size={20} className="checked-icon" />
              </span>
              <span
                className="quick-view-btn w-8 h-8 bg-white flex items-center justify-center rounded-full box-shadow-sm duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickviewOpen();
                }}
              >
                <Icon.Eye />
              </span>
              <span
                className="add-cart-btn w-8 h-8 bg-white flex items-center justify-center rounded-full box-shadow-sm duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart();
                }}
              >
                <Icon.ShoppingBagOpen />
              </span>
            </div>
          </div>
          <div className="product-infor mt-4">
            <span className="text-title">{data.name}</span>
            <div className="flex gap-0.5 mt-1">
              <Rate currentRate={data.rate} size={16} />
            </div>
            <span className="text-title inline-block mt-1 numeric-contrast">
              {displayPrice}
            </span>
          </div>
        </div>
      ) : (
        <></>
      )}
    </>
  );
};

export default Product;
