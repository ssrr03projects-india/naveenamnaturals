"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import * as Icon from "@phosphor-icons/react/dist/ssr";

interface TestimonialVideo {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  videoUrl: string;
  thumbnail: string;
  testimonialText?: string;
  hashtag?: string;
  productImage?: string;
}

interface VideoTestimonialCarouselProps {
  testimonials: TestimonialVideo[];
  className?: string;
}

const CARD_HEIGHT = 430;
const CARD_WIDTH = 230;
const CARD_GAP = 16;
const CARD_TOTAL_HEIGHT = 620;
const SLIDES_TO_SHOW = 6; // Show 6 slides before looping

function getInfiniteSlides<T>(slides: T[], duplicate: number = 1) {
  if (slides.length === 0) return [];
  const before = slides.slice(-duplicate);
  const after = slides.slice(0, duplicate);
  return [...before, ...slides, ...after];
}

const VideoTestimonialCarousel: React.FC<VideoTestimonialCarouselProps> = ({
  testimonials,
  className = "",
}) => {
  const hasEnough = testimonials.length > SLIDES_TO_SHOW;
  const duplicateCount = hasEnough ? SLIDES_TO_SHOW : testimonials.length;
  const slides = getInfiniteSlides(testimonials, duplicateCount);
  const realSlidesCount = testimonials.length;
  const [currentIndex, setCurrentIndex] = useState(duplicateCount);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const transitionDuration = 500; // ms

  const realIndex =
    (((currentIndex - duplicateCount + realSlidesCount) % realSlidesCount) +
      realSlidesCount) %
    realSlidesCount;

  const goto = useCallback((i: number, userInitiated: boolean = true) => {
    setCurrentIndex(i);
    setIsTransitioning(true);
    if (userInitiated) setIsAutoScrolling(false);
  }, []);

  const nextSlide = useCallback(() => {
    // If we're about to show the last SLIDES_TO_SHOW slides, jump to the start after transition
    if (currentIndex - duplicateCount + SLIDES_TO_SHOW >= realSlidesCount) {
      goto(currentIndex + 1);
      setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(duplicateCount);
      }, transitionDuration);
    } else {
      goto(currentIndex + 1);
    }
    setIsAutoScrolling(false);
  }, [goto, currentIndex, realSlidesCount]);

  const prevSlide = useCallback(() => {
    // If we're about to show the first slide, jump to the last 6 after transition
    if (currentIndex <= duplicateCount) {
      goto(currentIndex - 1);
      setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(realSlidesCount + duplicateCount - SLIDES_TO_SHOW);
      }, transitionDuration);
    } else {
      goto(currentIndex - 1);
    }
    setIsAutoScrolling(false);
  }, [goto, currentIndex, realSlidesCount]);

  // Autoscroll functionality
  useEffect(() => {
    if (!isAutoScrolling || testimonials.length <= SLIDES_TO_SHOW) return;
    const interval = setInterval(() => {
      if (currentIndex - duplicateCount + SLIDES_TO_SHOW >= realSlidesCount) {
        // On last "window", scroll and then reset to first window after transition
        setCurrentIndex(currentIndex + 1);
        setIsTransitioning(true);
        setTimeout(() => {
          setIsTransitioning(false);
          setCurrentIndex(duplicateCount);
        }, transitionDuration);
      } else {
        setCurrentIndex((prev) => prev + 1);
        setIsTransitioning(true);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [
    isAutoScrolling,
    currentIndex,
    testimonials.length,
    duplicateCount,
    realSlidesCount,
  ]);

  // Resume autoscroll after 10 seconds
  useEffect(() => {
    if (!isAutoScrolling) {
      const timeout = setTimeout(() => setIsAutoScrolling(true), 10000);
      return () => clearTimeout(timeout);
    }
  }, [isAutoScrolling]);

  // Edge case: if user lands on end buffer, jump to real start window; vice versa.
  useEffect(() => {
    if (!slides.length) return;
    if (currentIndex < duplicateCount) {
      setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(realSlidesCount + duplicateCount - SLIDES_TO_SHOW);
      }, transitionDuration);
    } else if (currentIndex >= realSlidesCount + duplicateCount) {
      setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(duplicateCount);
      }, transitionDuration);
    }
    // eslint-disable-next-line
  }, [currentIndex, duplicateCount, realSlidesCount]);

  const gotoDot = (dotIndex: number) => {
    goto(dotIndex + duplicateCount);
  };

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nextSlide, prevSlide]);

  function getPlayableVideoUrl(url: string): string | undefined {
    if (url.includes("youtube.com/shorts/")) {
      const id = url.split("shorts/")[1]?.split("?")[0];
      if (!id) return undefined;
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&rel=0&fs=1`;
    }
    if (url.includes("youtube.com/watch") || url.includes("youtu.be/")) {
      let id = "";
      if (url.includes("youtube.com/watch")) {
        try {
          const params = new URL(url).searchParams;
          id = params.get("v") ?? "";
        } catch {
          id = "";
        }
      } else if (url.includes("youtu.be/")) {
        id = url.split("youtu.be/")[1]?.split("?")[0] ?? "";
      }
      if (!id) return undefined;
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&rel=0&fs=1`;
    }
    if (url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".ogg")) {
      return url;
    }
    return undefined;
  }

  // Only show SLIDES_TO_SHOW cards in the view
  return (
    <div className={`relative ${className}`}>
      <h2 className="heading3 font-bold mb-10 text-center">
        Our Products Showcase
      </h2>
      <div className="w-full overflow-hidden">
        <div
          className="relative flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${
              currentIndex * (CARD_WIDTH + CARD_GAP)
            }px)`,
            width: `${slides.length * (CARD_WIDTH + CARD_GAP)}px`,
            transitionProperty: isTransitioning ? "transform" : "none",
          }}
        >
          {slides.map((testimonial, index) => {
            const isActive =
              index >= currentIndex && index < currentIndex + SLIDES_TO_SHOW;
            const playableUrl = getPlayableVideoUrl(testimonial.videoUrl);
            return (
              <div
                key={`${testimonial.id}-slide-${index}`}
                className={`flex-shrink-0 mr-4 last:mr-0`}
                style={{
                  width: `${CARD_WIDTH}px`,
                  height: `${CARD_TOTAL_HEIGHT}px`,
                  display: "flex",
                  flexDirection: "column",
                }}
                aria-hidden={!isActive}
              >
                <div
                  className="rounded-[16px] bg-surface shadow flex flex-col h-full"
                  style={{
                    overflow: "visible",
                    height: "100%",
                  }}
                >
                  <div
                    className="relative"
                    style={{
                      width: "100%",
                      height: `${CARD_HEIGHT}px`,
                      borderRadius: "16px 16px 0 0",
                      overflow: "hidden",
                      background: "var(--surface)",
                      flex: "0 0 auto",
                    }}
                  >
                    {playableUrl &&
                    playableUrl.includes("youtube.com/embed/") ? (
                      <iframe
                        src={playableUrl}
                        title={testimonial.title}
                        allow="autoplay; loop; encrypted-media"
                        allowFullScreen
                        style={{
                          border: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "16px 16px 0 0",
                        }}
                      ></iframe>
                    ) : playableUrl &&
                      (playableUrl.endsWith(".mp4") ||
                        playableUrl.endsWith(".webm") ||
                        playableUrl.endsWith(".ogg")) ? (
                      <video
                        src={playableUrl}
                        poster={testimonial.thumbnail}
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "16px 16px 0 0",
                        }}
                      />
                    ) : (
                      <>
                        <img
                          src={testimonial.thumbnail}
                          alt={testimonial.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: "16px 16px 0 0",
                            display: "block",
                          }}
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none" />
                        <a
                          href={testimonial.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center z-10"
                          tabIndex={-1}
                          aria-label="Watch testimonial video"
                          style={{ pointerEvents: "auto" }}
                        >
                          <span className="w-14 h-14 bg-surface/90 rounded-full flex items-center justify-center hover:bg-surface transition-colors">
                            <Icon.Play size={26} className="text-primary ml-1" />
                          </span>
                        </a>
                      </>
                    )}

                    {testimonial.testimonialText && (
                      <div
                        className={`absolute top-3 left-3 right-3 flex items-center justify-center`}
                        style={{ zIndex: 20 }}
                      >
                        <div
                          className="bg-accent px-3 py-1 rounded font-semibold text-white text-sm shadow flex items-center gap-1"
                          style={{
                            backgroundColor: "var(--accent)",
                            fontSize: "15px",
                          }}
                        >
                          {testimonial.testimonialText}
                        </div>
                      </div>
                    )}
                  </div>
                  <div
                    className="relative flex items-center justify-center"
                    style={{ marginTop: "-24px" }}
                  >
                    <div
                      className="bg-surface px-4 py-2 rounded-full font-semibold text-secondary text-base shadow"
                      style={{
                        fontSize: "17px",
                        position: "relative",
                        zIndex: 30,
                        border: "2px solid var(--surface)",
                        minWidth: "70%",
                        textAlign: "center",
                      }}
                    >
                      {testimonial.title}
                    </div>
                  </div>
                  <div className="flex flex-col items-center px-4 pt-4 pb-5 justify-between flex-1 w-full">
                    {testimonial.productImage && (
                      <img
                        src={testimonial.productImage}
                        alt={testimonial.title + " product"}
                        className="w-12 h-12 rounded-full object-cover -mt-6 border-2 border-surface shadow"
                        style={{ background: "var(--surface)" }}
                      />
                    )}
                    <div className="flex items-center gap-2 w-full justify-center mt-2 mb-2">
                      <span className="text-[21px] font-bold text-secondary">
                        ₹{testimonial.price}
                      </span>
                      {testimonial.originalPrice && (
                        <span className="text-[17px] text-secondary2 line-through">
                          ₹{testimonial.originalPrice}
                        </span>
                      )}
                    </div>
                    <div className="flex-1" />
                    <Link
                      href={`/product/${testimonial.id}`}
                      className="w-full"
                      tabIndex={isActive ? 0 : -1}
                    >
                      <button
                        className="w-full bg-primary text-white font-medium rounded-lg py-2 text-[20px] shadow hover:bg-secondary transition-colors"
                        style={{
                          minHeight: "40px",
                          marginTop: "3px",
                        }}
                      >
                        View This
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {testimonials.length > SLIDES_TO_SHOW && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-surface/90 text-primary rounded-full flex items-center justify-center hover:bg-surface transition-colors shadow-lg z-10"
            aria-label="Previous testimonial"
            tabIndex={0}
          >
            <Icon.CaretLeft size={20} />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-surface/90 text-primary rounded-full flex items-center justify-center hover:bg-surface transition-colors shadow-lg z-10"
            aria-label="Next testimonial"
            tabIndex={0}
          >
            <Icon.CaretRight size={20} />
          </button>
        </>
      )}
      <div className="flex justify-center mt-5 gap-2">
        {testimonials.map((_, dotIndex) => (
          <button
            key={dotIndex}
            onClick={() => gotoDot(dotIndex)}
            className={`w-3 h-3 rounded-full transition-colors ${
              realIndex === dotIndex ? "bg-accent" : "bg-secondary2"
            }`}
            aria-label={`View testimonial ${dotIndex + 1}`}
            tabIndex={0}
          />
        ))}
      </div>
    </div>
  );
};

export default VideoTestimonialCarousel;
