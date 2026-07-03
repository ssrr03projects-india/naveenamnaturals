import React from "react";
import Link from "next/link";
import Image from "next/image";

interface CategoryCardProps {
  image: string;
  title: string;
  url: string;
  bgColor?: string;
  gradient?: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  image,
  title,
  url,
  bgColor,
  gradient,
}) => {
  const backgroundStyle = gradient
    ? { background: gradient }
    : bgColor
    ? { backgroundColor: bgColor }
    : { background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)" };

  return (
    <Link href={url} className="block group mx-1 sm:mx-2 mt-2">
      <div
        className="
          relative rounded-3xl overflow-hidden
          p-5 
          transition-all duration-500 ease-out
          hover:shadow-[0_5px_20px_var(--overlay-50)] 
          hover:scale-[1.02]
          hover:-translate-y-1
          cursor-pointer
          min-h-[60px] sm:min-h-[110px] lg:min-h-[120px]
          w-full sm:w-auto
          flex flex-col sm:flex-row items-center gap-4 sm:gap-5
          before:absolute before:inset-0 before:bg-gradient-to-br before:from-surface/20 before:to-transparent before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100
        "
        style={backgroundStyle}
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-surface/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>

        {/* Icon Container with Enhanced Design */}
        <div className="relative z-10 flex-shrink-0">
          <div className="relative">
            {/* Glow effect behind icon */}
            <div className="absolute inset-0 bg-surface/40 rounded-full blur-xl scale-110 group-hover:scale-125 transition-transform duration-500"></div>

            {/* Icon wrapper */}
            <div className="relative bg-surface rounded-full p-2 shadow-[0_4px_20px_var(--outline)] group-hover:shadow-[0_8px_30px_var(--overlay-50)] transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
              <Image
                src={image}
                alt={title}
                width={112}
                height={112}
                className="
                  w-16 h-16 
                  sm:w-20 sm:h-20 
                  md:w-24 md:h-24 
                  lg:w-28 lg:h-28 
                  object-cover rounded-full
                  transition-transform duration-500
                "
              />
            </div>
          </div>
        </div>

        {/* Title with Better Typography */}
        <div className="relative z-10 flex flex-1 flex-col justify-center items-center sm:items-start w-full">
          <h3
            className="
              text-surface font-bold 
              text-lg md:text-xl lg:text-3xl
              leading-tight max-w-full break-words 
              text-center sm:text-left
              group-hover:scale-105 transition-transform duration-500
              drop-shadow-[0_2px_10px_var(--overlay-60)]
            "
          >
            {title}
          </h3>

          {/* Subtle decorative line */}
          <div className="w-12 h-1 bg-white/50 rounded-full mt-2 group-hover:w-20 transition-all duration-500"></div>
        </div>

        {/* Arrow indicator */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-500 hidden sm:block">
          <svg
            className="w-6 h-6 text-white drop-shadow-lg"
            fill="none"
            strokeWidth="2.5"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
            />
          </svg>
        </div>

        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
      </div>
    </Link>
  );
};

export default CategoryCard;
