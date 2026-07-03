"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { productApi } from "@/lib/api";
import { useModalQuickviewContext } from "@/context/ModalQuickviewContext";
import Image from "next/image";
import { getBackendImageUrl } from "@/lib/utils";

interface NewsletterProduct {
  id: string | number;
  slug?: string;
  name: string;
  price: number;
  originPrice?: number;
  images: string[];
}

const ModalNewsletter = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [products, setProducts] = useState<NewsletterProduct[]>([]);
  const router = useRouter();
  const { openQuickview } = useModalQuickviewContext();

  const handleDetailProduct = (productId: string, productSlug?: string) => {
    const slug = productSlug || productId;
    router.push(`/product/${slug}`);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productApi.getProducts({ limit: 5, isActive: true });
        const data = response.data;
        const list = data?.data?.products ?? data?.products ?? (Array.isArray(data?.data) ? data.data : []);
        if (Array.isArray(list) && list.length > 0) {
          const mapped: NewsletterProduct[] = list.slice(0, 5).map((p: any) => {
            const variants = p.variants || [];
            const price = variants.length > 0
              ? Math.min(...variants.map((v: any) => parseFloat(v.price) || 0).filter(Boolean))
              : 0;
            const originPrice = variants.length > 0 && variants[0].mrpPrice
              ? parseFloat(variants[0].mrpPrice)
              : undefined;
            const images = Array.isArray(p.images)
              ? p.images.map((img: string) => getBackendImageUrl(img))
              : [getBackendImageUrl(p.images)];
            return {
              id: p.id,
              slug: p.slug,
              name: p.name || "",
              price: price || 0,
              originPrice: originPrice || price,
              images: images.length ? images : ["/images/product/default.png"],
            };
          });
          setProducts(mapped);
        }
      } catch (err) {
        console.error("ModalNewsletter: failed to fetch products", err);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setOpen(true);
    }, 3000);
  }, []);

  return (
    <div className="modal-newsletter" onClick={() => setOpen(false)}>
      <div className="container h-full flex items-center justify-center w-full">
        <div
          className={`modal-newsletter-main ${open ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="main-content flex rounded-[20px] overflow-hidden w-full">
            <div className="left lg:w-1/2 sm:w-2/5 max-sm:hidden bg-primaryflex flex-col items-center justify-center gap-5 py-14">
              <div className="text-xs font-semibold uppercase text-center">
                Special Offer
              </div>
              <div className="lg:text-[70px] text-4xl lg:leading-[78px] leading-[42px] font-bold uppercase text-center">
                Black
                <br />
                Fridays
              </div>
              <div className="text-button-uppercase text-center">
                New customers save <span className="text-red">30%</span>
                with the code
              </div>
              <div className="text-button-uppercase text-red bg-white py-2 px-4 rounded-lg">
                GET20off
              </div>
              <div className="button-main w-fit bg-black text-white hover:bg-white uppercase">
                Copy coupon code
              </div>
            </div>
            <div className="right lg:w-1/2 sm:w-3/5 w-full bg-white sm:pt-10 sm:pl-10 max-sm:p-6 relative">
              <div
                className="close-newsletter-btn w-10 h-10 flex items-center justify-center border border-line rounded-full absolute right-5 top-5 cursor-pointer"
                onClick={() => setOpen(false)}
              >
                <Icon.X weight="bold" className="text-xl" />
              </div>
              <div className="heading5 pb-5">You May Also Like</div>
              <div className="list flex flex-col gap-5 overflow-x-auto sm:pr-6">
                {products.length === 0 ? (
                  <p className="caption1 text-secondary2">Loading...</p>
                ) : (
                  products.map((item, index) => (
                    <div
                      className="product-item item pb-5 flex items-center justify-between gap-3 border-b border-line"
                      key={item.id ?? index}
                    >
                      <div
                        className="infor flex items-center gap-5 cursor-pointer"
                        onClick={() => handleDetailProduct(String(item.id), item.slug)}
                      >
                        <div className="bg-img flex-shrink-0">
                          <Image
                            width={5000}
                            height={5000}
                            src={item.images?.[0] ?? "/images/product/default.png"}
                            alt={item.name}
                            className="w-[100px] aspect-square flex-shrink-0 rounded-lg"
                          />
                        </div>
                        <div className="">
                          <div className="name text-button">{item.name}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="product-price text-title">
                              ₹{item.price}
                            </div>
                            {item.originPrice != null && item.originPrice > item.price && (
                              <div className="product-origin-price text-title text-secondary2">
                                <del>₹{item.originPrice}</del>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        className="quick-view-btn button-main sm:py-3 py-2 sm:px-5 px-4 bg-black hover:bg-primarytext-white rounded-full whitespace-nowrap"
                        onClick={() => openQuickview(item as any)}
                      >
                        QUICK VIEW
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalNewsletter;
