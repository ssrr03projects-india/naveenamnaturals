"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface CommunityStoryItem {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  videoUrl: string;
  thumbnail?: string;
  productImage?: string;
  testimonialText?: string;
}

interface CommunityStoryProps {
  data?: CommunityStoryItem[];
  title?: string;
  subtitle?: string;
  className?: string;
}

const CommunityStory: React.FC<CommunityStoryProps> = ({
  data = [],
  title = "Community Stories",
  subtitle = "Trust - lovely guests",
  className = "",
}) => {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleDetailProduct = (productId: string, productSlug?: string) => {
    // Use slug if available, otherwise fallback to ID
    const slug = productSlug || productId;
    router.push(`/product/${slug}`);
  };

  // Function to convert YouTube Shorts URL to embed format
  const getEmbedUrl = (url: string): string => {
    if (url.includes("youtube.com/shorts/")) {
      const videoId = url.split("shorts/")[1]?.split("?")[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?controls=0&autoplay=1&mute=1&rel=0&loop=1&playlist=${videoId}`;
      }
    }
    if (url.includes("youtube.com/watch")) {
      const videoId = url.split("v=")[1]?.split("&")[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?controls=0&autoplay=1&mute=1&rel=0&loop=1&playlist=${videoId}`;
      }
    }
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?controls=0&autoplay=1&mute=1&rel=0&loop=1&playlist=${videoId}`;
      }
    }
    // If already an embed URL, return as is
    if (url.includes("youtube.com/embed/")) {
      return url;
    }
    return url;
  };

  // Default data if none provided
  const defaultData: CommunityStoryItem[] = [];

  const storiesData = data.length > 0 ? data : defaultData;

  // Create infinite loop by duplicating the data with unique keys
  const infiniteStories = [
    ...storiesData.map((story, index) => ({ ...story, id: `${story.id}-1` })),
    ...storiesData.map((story, index) => ({ ...story, id: `${story.id}-2` })),
    ...storiesData.map((story, index) => ({ ...story, id: `${story.id}-3` })),
  ];

  // Auto-scroll effect
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || isHovered) return;

    const scrollSpeed = 1; // pixels per frame
    let animationId: number;

    const scroll = () => {
      if (scrollContainer) {
        scrollContainer.scrollLeft += scrollSpeed;

        // Reset scroll position when we've scrolled through one complete set
        const maxScroll = scrollContainer.scrollWidth / 3; // Since we have 3 copies
        if (scrollContainer.scrollLeft >= maxScroll) {
          scrollContainer.scrollLeft = 0;
        }
      }
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isHovered]);

  return (
    <div className={`community-story-block ${className}`}>
      <div className="container">
        <div className="heading3 text-center">{title}</div>
        <div className="mt-3 text-center">{subtitle}</div>
        <div className="relative">
          {/* Left fade gradient */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
          {/* Right fade gradient */}
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

          <div
            ref={scrollContainerRef}
            className="list-product flex overflow-x-auto md:gap-[30px] gap-[16px] md:mt-10 mt-6 pb-4 scrollbar-hide"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {infiniteStories.map((story, index) => (
              <div
                key={story.id || index}
                className="product-item block h-full relative aspect-[3/4] md:rounded-2xl rounded-xl overflow-hidden cursor-pointer flex-shrink-0"
                style={{ width: "280px" }}
                onClick={() => handleDetailProduct(story.id)}
              >
                <div className="bg-img w-full h-full">
                  <iframe
                    className="w-full h-full"
                    src={getEmbedUrl(story.videoUrl)}
                    title={`${story.title} video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  ></iframe>
                </div>
                <div className="product-infor flex items-center sm:gap-4 gap-2 absolute sm:left-5 left-3 sm:bottom-5 bottom-3 w-full">
                  <div className="product-img sm:w-[52px] w-10 sm:h-[52px] h-10 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      width={5000}
                      height={5000}
                      src={
                        story.productImage || "/images/product/1000x1000.png"
                      }
                      alt={story.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="product-name w-full">
                    <div className="text-white capitalize">{story.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="product-price text-white">
                        ₹{story.price}
                      </div>
                      {story.originalPrice && (
                        <div className="product-origin-price caption1 text-white">
                          <del>₹{story.originalPrice}.00</del>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {story.testimonialText && (
                  <div className="absolute top-3 left-3 right-3">
                    <div className="bg-primarypx-3 py-1 rounded-full text-white text-sm font-semibold">
                      {story.testimonialText}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityStory;
