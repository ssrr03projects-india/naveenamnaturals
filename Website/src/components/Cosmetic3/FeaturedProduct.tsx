"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ProductType } from "@/type/ProductType";
import Rate from "../Other/Rate";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/context/CartContext";
import { useModalCartContext } from "@/context/ModalCartContext";
import { getBackendImageUrl } from "@/lib/utils";
import {
  formatProductMrpPrice,
  formatProductPrice,
  getProductMaxDiscount,
} from "@/lib/price-utils";

interface Props {
  data: Array<ProductType>;
}

const FeaturedProduct: React.FC<Props> = ({ data }) => {
  const [activeSize, setActiveSize] = useState<string>("0");
  const { addToCart, updateCart, cartState } = useCart();
  const { openModalCart } = useModalCartContext();

  const handleActiveSize = (item: string) => {
    setActiveSize(item);
  };

  const handleIncreaseQuantity = () => {
    productMain.quantityPurchase += 1;
    updateCart(String(productMain.id), productMain.quantityPurchase + 1, activeSize);
  };

  const handleDecreaseQuantity = () => {
    if (productMain.quantityPurchase > 1) {
      productMain.quantityPurchase -= 1;
      updateCart(String(productMain.id), productMain.quantityPurchase - 1, activeSize);
    }
  };

  const handleAddToCart = () => {
    if (!cartState.cartArray.find((item) => item.id === productMain.id)) {
      addToCart({ ...productMain });
      updateCart(String(productMain.id), productMain.quantityPurchase, activeSize);
    } else {
      updateCart(String(productMain.id), productMain.quantityPurchase, activeSize);
    }
    openModalCart();
  };

  // Truy cập thông tin của sản phẩm đầu tiên trong mảng data
  const productMain = data[0];

  // Safety check to ensure product exists
  if (!productMain) {
    return null;
  }

  // Ensure sizes is always an array
  const productSizes = Array.isArray(productMain.sizes)
    ? productMain.sizes
    : productMain.sizes
      ? [productMain.sizes]
      : ["freesize"];

  const percentSale = getProductMaxDiscount(productMain);
  const displayPrice = formatProductPrice(productMain);
  const displayMrp = formatProductMrpPrice(productMain);

  return (
    <>
      <div className="featured-product cosmetic py-20 bg-white relative">
        {/* Abstract Leaf Background - Main Large */}
        <div
          className="absolute left-[-400px] bottom-[-200px] w-[60vw] h-[60vh] opacity-30 pointer-events-none z-[1]"
          style={{
            backgroundImage: "url('/images/abstract/sololeaf.png')",
            backgroundSize: "contain",
            backgroundPosition: "center bottom",
            backgroundRepeat: "no-repeat",
            transform: "rotate(40deg)",
          }}
        />
        {/* Small Abstract 1 (Top left) */}
        <div
          className={`
            absolute
            left-[4vw] top-[3vw]
            w-[90px] h-[90px]
            md:w-[140px] md:h-[140px]
            lg:w-[200px] lg:h-[200px]
            opacity-20
            pointer-events-none
            z-[2]
          `}
          style={{
            backgroundImage: "url('/images/abstract/sololeaf.png')",
            backgroundSize: "contain",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            transform: "rotate(20deg)",
          }}
        />
        {/* Small Abstract 2 (Top right) */}
        <div
          className={`
            absolute
            right-[-40px] top-[24vw]
            w-[90px] h-[90px]
            md:w-[160px] md:h-[160px]
            lg:w-[200px] lg:h-[200px]
            opacity-20
            pointer-events-none
            z-[2]
          `}
          style={{
            backgroundImage: "url('/images/abstract/sololeaf.png')",
            backgroundSize: "contain",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            transform: "rotate(-25deg)",
          }}
        />
        <div className="container flex lg:items-center justify-between gap-y-6 flex-wrap relative z-10">
          <div className="list-img md:w-1/2 md:pr-4 w-full">
            <Image
              src={getBackendImageUrl(productMain.images?.[1] || productMain.images?.[0])}
              width={1000}
              height={1000}
              alt="prd-img"
              priority={true}
              className="w-full lg:aspect-square object-cover rounded-[20px]"
            />
          </div>
          <div className="product-infor md:w-1/2 w-full lg:pl-16 md:pl-6">
            <div className="caption2 text-secondary font-semibold uppercase">
              {productMain.type}
            </div>
            <div className="heading4 mt-1">{productMain.name}</div>
            <div className="flex items-center mt-3">
              <Rate currentRate={productMain.rate} size={14} />
              <span className="caption1 text-secondary">(1.234 reviews)</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap mt-5 pb-6 border-b border-line">
              <div className="product-price heading5">{displayPrice}</div>
              {displayMrp && <div className="w-px h-4 bg-line"></div>}
              {displayMrp && (
                <div className="product-origin-price font-normal text-secondary2">
                  <del>{displayMrp}</del>
                </div>
              )}
              {percentSale > 0 && displayMrp && (
                <div className="product-sale caption2 font-semibold bg-primarypx-3 py-0.5 inline-block rounded-full">
                  -{percentSale}%
                </div>
              )}
              <div className="desc text-secondary mt-3">
                {productMain.description}
              </div>
            </div>
            <div className="list-action mt-6">
              <div className="choose-size">
                <div className="heading flex items-center justify-between">
                  <div className="text-title">
                    Volume:{" "}
                    <span className="text-title size">{`${activeSize}`}</span>
                  </div>
                </div>
                <div className="list-size flex items-center gap-2 flex-wrap mt-3">
                  {productSizes.map((item, index) => (
                    <div
                      className={`size-item w-[72px] h-12 flex items-center justify-center text-button rounded-lg bg-white border border-line ${activeSize === (typeof item === 'string' ? item : item.size) ? "active" : ""
                        }`}
                      key={index}
                      onClick={() => handleActiveSize(typeof item === 'string' ? item : item.size)}
                    >
                      {typeof item === 'string' ? item : item.size}
                    </div>
                  ))}
                </div>
              </div>
              <div className="choose-quantity flex items-center lg:justify-between gap-5 gap-y-3 mt-5">
                <div className="quantity-block md:p-3 p-2 flex items-center justify-between rounded-lg border border-line w-[140px] flex-shrink-0">
                  <Icon.Minus
                    size={20}
                    onClick={handleDecreaseQuantity}
                    className={`${productMain.quantityPurchase === 1 ? "disabled" : ""
                      } cursor-pointer`}
                  />
                  <div className="body1 font-semibold">
                    {productMain.quantityPurchase}
                  </div>
                  <Icon.Plus
                    size={20}
                    onClick={handleIncreaseQuantity}
                    className="cursor-pointer"
                  />
                </div>
                <div
                  className="button-main w-full text-center bg-white text-black border border-black"
                  onClick={handleAddToCart}
                >
                  Add To Cart
                </div>
              </div>
              <div className="button-block mt-5">
                <div className="button-main w-full text-center">Buy It Now</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FeaturedProduct;
