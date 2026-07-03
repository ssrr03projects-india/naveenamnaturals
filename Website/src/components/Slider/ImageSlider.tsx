"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css/bundle";
import "swiper/css/effect-fade";

interface SliderItem {
  id: string;
  image: string;
  alt: string;
  redirectUrl: string;
}

interface ImageSliderProps {
  slides: SliderItem[];
  height?: string;
  className?: string;
}

const ImageSlider: React.FC<ImageSliderProps> = ({
  slides,
  height = "2xl:h-[800px] xl:h-[700px] lg:h-[600px] md:h-[500px] sm:h-[400px] h-[210px]",
  className = "",
}) => {
  const router = useRouter();

  const handleSlideClick = (redirectUrl: string) => {
    if (redirectUrl) {
      // Check if it's an external URL
      if (
        redirectUrl.startsWith("http://") ||
        redirectUrl.startsWith("https://")
      ) {
        window.open(redirectUrl, "_blank");
      } else {
        // Internal navigation
        router.push(redirectUrl);
      }
    }
  };

  return (
    <>
      <div
        className={`slider-block style-one bg-linear ${height} w-full ${className}`}
      >
        <div className="slider-main h-full w-full">
          <Swiper
            spaceBetween={0}
            slidesPerView={1}
            loop={true}
            pagination={{ clickable: true }}
            modules={[Pagination, Autoplay]}
            className="h-full relative dots-white"
            autoplay={{
              delay: 4000,
            }}
          >
            {slides.map((slide, index) => (
              <SwiperSlide key={slide.id}>
                <div
                  className="slider-item h-full w-full relative cursor-pointer"
                  onClick={() => handleSlideClick(slide.redirectUrl)}
                >
                  <div className="w-full h-full relative">
                    <Image
                      src={slide.image}
                      alt={slide.alt}
                      fill
                      sizes="100vw"
                      priority={index === 0}
                      fetchPriority={index === 0 ? "high" : "auto"}
                      style={{ objectFit: "cover" }}
                      className="select-none"
                    />
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </>
  );
};

export default ImageSlider;
