"use client";

import React, { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuCosmeticThree from "@/components/Header/Menu/MenuCosmeticThree";
import ImageSlider from "@/components/Slider/ImageSlider";
import WhyNaveenam from "@/components/Cosmetic3/WhyNaveenam";
import { homepageApi } from "@/lib/api";
import { getBackendAssetUrl } from "@/lib/media";

// Below the fold components are lazy loaded with SSR disabled to speed up initial server response
const ProductShowcase = dynamic(
  () => import("@/components/Cosmetic3/ProductShowcase"),
  {
    ssr: false,
    loading: () => <div className="h-96 animate-pulse bg-surface/20" />,
  },
);
const BannerTop = dynamic(() => import("@/components/Cosmetic3/BannerTop"), {
  ssr: false,
});
const IngredientGrid = dynamic(
  () => import("@/components/Cosmetic3/IngredientGrid"),
);
const Testimonial = dynamic(
  () => import("@/components/Cosmetic3/Testimonial"),
  {
    ssr: false,
  },
);
const Benefit = dynamic(() => import("@/components/Cosmetic3/Benefit"), {
  ssr: false,
});
const Newsletter = dynamic(() => import("@/components/Cosmetic3/Newsletter"), {
  ssr: false,
});
const Footer = dynamic(() => import("@/components/Footer/Footer"), {
  ssr: false,
});

export default function Home() {
  const [imageSliderData, setImageSliderData] = useState<
    { id: string; image: string; alt: string; redirectUrl: string }[]
  >([]);

  useEffect(() => {
    let isMounted = true;

    const fetchSliders = async () => {
      try {
        const response = await homepageApi.getSliders();
        const sliders = response?.data?.data ?? [];
        if (Array.isArray(sliders) && sliders.length > 0 && isMounted) {
          const mapped = sliders.map((slider: any, index: number) => ({
            id: String(slider.id ?? index + 1),
            image: getBackendAssetUrl(slider.image),
            alt:
              slider.title || slider.caption || `Homepage slide ${index + 1}`,
            redirectUrl: slider.link || "/product",
          }));
          setImageSliderData(mapped);
        } else if (isMounted) {
          setImageSliderData([]);
        }
      } catch (error) {
        console.error("Failed to load homepage sliders", error);
        if (isMounted) {
          setImageSliderData([]);
        }
      }
    };

    fetchSliders();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-white/70 text-[15px] sm:text-base">
      <TopNavOne
        props="style-one bg-primary"
        slogan="Welcome to Naveenam Naturals Store"
      />
      <div id="header" className="relative w-full">
        <MenuCosmeticThree />
        {/* <SliderCosmeticThree /> */}
        {imageSliderData.length > 0 && (
          <ImageSlider
            slides={imageSliderData}
            height="2xl:h-[800px] xl:h-[667px] lg:h-[533px] md:h-[400px] sm:h-[333px] h-[210px]"
            className=""
          />
        )}
        <BannerTop
          props="bg-white lg:py-16 md:py-12 py-6"
          textColor="text-primary"
          bgLine="bg-black"
        />
      </div>
      <WhyNaveenam />
      <ProductShowcase />
      <IngredientGrid />
      <Testimonial />
      {/* <Benefit props="md:py-20 py-10" /> */}
      <Newsletter />
      <Footer />
    </div>
  );
}
