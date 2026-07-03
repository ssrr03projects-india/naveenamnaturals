import React from "react";
import Image from "next/image";
import Link from "next/link";

const Banner = () => {
  return (
    <>
      <div className="banner-block md:pt-20 pt-10 bg-white relative">
        {/* Abstract Leaf Background - Left */}
        <div
          className="absolute left-0 top-0 w-1/3 h-full opacity-20"
          style={{
            backgroundImage: "url('/images/abstract/leaf.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "left center",
            backgroundRepeat: "no-repeat",
            zIndex: 1,
          }}
        />

        <div className="container relative z-10">
          <div className="list-banner grid md:grid-cols-3 gap-[20px]">
            <Link
              href={"/product"}
              className="banner-item relative bg-surface block rounded-[20px] overflow-hidden duration-500"
            >
              <div className="banner-img w-full">
                <Image
                  src={"/images/banner/21.png"}
                  width={1000}
                  height={800}
                  alt="bg-img"
                  className="w-full duration-500"
                />
              </div>
              <div className="heading4 absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                BODY CARE
              </div>
              <div className="button-main absolute bottom-8 left-1/2 -translate-x-1/2">
                Shop Now
              </div>
            </Link>
            <Link
              href={"/product"}
              className="banner-item relative bg-surface block rounded-[20px] overflow-hidden duration-500"
            >
              <div className="banner-img w-full">
                <Image
                  src={"/images/banner/22.png"}
                  width={1000}
                  height={800}
                  alt="bg-img"
                  className="w-full duration-500"
                />
              </div>
              <div className="heading4 absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                SKIN CARE
              </div>
              <div className="button-main absolute bottom-8 left-1/2 -translate-x-1/2">
                Shop Now
              </div>
            </Link>
            <Link
              href={"/product"}
              className="banner-item relative bg-surface block rounded-[20px] overflow-hidden duration-500"
            >
              <div className="banner-img w-full">
                <Image
                  src={"/images/banner/23.png"}
                  width={1000}
                  height={800}
                  alt="bg-img"
                  className="w-full duration-500"
                />
              </div>
              <div className="heading4 absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                HAIR CARE
              </div>
              <div className="button-main absolute bottom-8 left-1/2 -translate-x-1/2">
                Shop Now
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Banner;
