"use client";

import React, { useState } from "react";
import Product from "../Product/Product";
import { ProductType } from "@/type/ProductType";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css/bundle";

interface Props {
  data: Array<ProductType>;
  start: number;
  limit: number;
  title: string;
}

const BestSellers: React.FC<Props> = ({ data, start, limit, title }) => {
  return (
    <>
      <div className="tab-features-block md:pt-20 pt-10 bg-white pb-20">
        <div className="container">
          <div className="heading3 text-center">{title}</div>
          <div className="list-product hide-product-sold section-swiper-navigation style-outline style-center style-small-border md:mt-10 mt-6">
            <Swiper
              spaceBetween={12}
              slidesPerView={2}
              navigation
              loop={true}
              modules={[Navigation, Autoplay]}
              breakpoints={{
                576: {
                  slidesPerView: 2,
                  spaceBetween: 12,
                },
                768: {
                  slidesPerView: 3,
                  spaceBetween: 20,
                },
                992: {
                  slidesPerView: 4,
                  spaceBetween: 20,
                },
                1200: {
                  slidesPerView: 4,
                  spaceBetween: 30,
                },
              }}
              className="h-full"
            >
              {data.slice(start, limit).map((prd) => (
                <SwiperSlide key={prd.id}>
                  <div className="bg-surface border border-secondary/10 rounded-xl shadow-md h-full w-full p-4">
                    <Product data={prd} type="grid" style="style-three" />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </>
  );
};

export default BestSellers;
