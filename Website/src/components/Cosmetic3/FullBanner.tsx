import React from "react";

function FullBanner() {
  // You can update this path to your actual image constant
  const BANNER_IMAGE = "/images/banner/banner.png";

  return (
    <div
      className="w-full rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden bg-surface relative 
                 min-h-[150px] sm:min-h-[200px] md:min-h-[250px] lg:min-h-[300px]
                 flex items-center justify-center
                 mx-auto px-2 sm:px-4 md:px-0"
    >
      <img
        src={BANNER_IMAGE}
        alt="Full Banner"
        className="w-full h-auto max-h-full object-cover block bg-transparent"
      />
    </div>
  );
}

export default FullBanner;
