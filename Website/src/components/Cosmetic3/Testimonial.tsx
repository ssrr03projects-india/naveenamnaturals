"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import "@/styles/layout/testimonial.scss";
import { reviewApi } from "@/lib/api";

interface TestimonialItem {
  id: number;
  name: string;
  handle: string;
  avatar: string;
  text: string;
  image?: string;
}

function repeatArray<T>(arr: T[], minLen: number): T[] {
  const res: T[] = [];
  while (res.length < minLen) {
    res.push(...arr);
  }
  return res;
}

const Testimonial: React.FC = () => {
  const MIN_REVIEWS_TO_SHOW = 10;
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [canShowSection, setCanShowSection] = useState(false);

  // Responsive Card Width and CardsToShow
  const [containerWidth, setContainerWidth] = useState(0);
  const [cardWidth, setCardWidth] = useState(360);
  const [cardSpacing, setCardSpacing] = useState(24);
  const [cardsToShow, setCardsToShow] = useState(1.2);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const response = await reviewApi.getReviews({
          status: "approved",
          page: 1,
          limit: 50,
        });
        const data = response.data;
        const list = data?.data?.reviews ?? data?.reviews ?? [];
        const totalApprovedReviews = Number(
          data?.data?.pagination?.totalItems ??
            data?.pagination?.totalItems ??
            (Array.isArray(list) ? list.length : 0),
        );

        if (Array.isArray(list) && totalApprovedReviews >= MIN_REVIEWS_TO_SHOW) {
          const mapped: TestimonialItem[] = list.map((r: any) => ({
            id: r.id,
            name: r.customerName || "Customer",
            handle: r.customerEmail ? `@${r.customerEmail.split("@")[0]}` : "@customer",
            avatar: "/images/avatar/face.png",
            text: r.comment || "",
          }));
          setTestimonials(mapped);
          setCanShowSection(true);
        } else {
          setTestimonials([]);
          setCanShowSection(false);
        }
      } catch (err) {
        console.error("Testimonial: failed to fetch reviews", err);
        setTestimonials([]);
        setCanShowSection(false);
      } finally {
        setLoading(false);
      }
    };
    fetchTestimonials();
  }, []);

  useEffect(() => {
    function updateResponsive() {
      if (!containerRef.current) return;
      const width = containerRef.current.offsetWidth;
      setContainerWidth(width);

      // Mobile (≤ 640px): show 1 card, reduce gaps
      if (width < 640) {
        setCardWidth(Math.round(width * 0.88));
        setCardSpacing(14);
        setCardsToShow(1);
      } else if (width < 1024) {
        setCardWidth(320);
        setCardSpacing(18);
        setCardsToShow(1.15);
      } else if (width < 1400) {
        setCardWidth(340);
        setCardSpacing(22);
        setCardsToShow(2.1);
      } else {
        setCardWidth(360);
        setCardSpacing(24);
        setCardsToShow(3.1);
      }
    }
    updateResponsive();
    window.addEventListener("resize", updateResponsive);
    return () => window.removeEventListener("resize", updateResponsive);
  }, []);

  useEffect(() => {
    if (containerWidth) {
      setScrollPos(0);
    }
  }, [containerWidth, cardWidth, cardSpacing, cardsToShow]);

  // Slides for infinite scroll effect (use testimonials from API)
  const sourceList = testimonials;
  const repeatSlidesCount = 3 * Math.ceil(cardsToShow);
  const minSlides = sourceList.length ? repeatSlidesCount * sourceList.length : 0;
  const slides = repeatArray(sourceList, minSlides);

  // For moving
  const [scrollPos, setScrollPos] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  // Autoscroll unless user interacts
  useEffect(() => {
    if (isUserInteracting) return;
    const timer = setInterval(() => {
      smoothScrollBy(cardWidth + cardSpacing);
    }, 4000);
    return () => clearInterval(timer);
  }, [
    isUserInteracting,
    scrollPos,
    cardsToShow,
    slides,
    cardWidth,
    cardSpacing,
  ]);

  // For infinite effect: when we're near end, jump to start, and vice versa
  useEffect(() => {
    if (!listRef.current || sourceList.length === 0) return;
    const totalWidth = slides.length * (cardWidth + cardSpacing);
    const singleListWidth = sourceList.length * (cardWidth + cardSpacing);
    // If scrolled past end
    if (scrollPos > totalWidth - singleListWidth * 1.5) {
      setTimeout(() => {
        setScrollPos(singleListWidth * 0.5);
      }, 400);
    }
    // If scrolled before start
    if (scrollPos < singleListWidth * 0.5) {
      setTimeout(() => {
        setScrollPos(totalWidth - singleListWidth * 1.5);
      }, 400);
    }
  }, [scrollPos, slides.length, cardWidth, cardSpacing]);

  // Smooth scroll util
  function smoothScrollBy(px: number) {
    setScrollPos((prev) => prev + px);
  }
  function smoothScrollTo(px: number) {
    setScrollPos(px);
  }

  // Drag/swipe logic
  const dragState = useRef<{ x: number; scroll: number; dragging: boolean }>({
    x: 0,
    scroll: 0,
    dragging: false,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    dragState.current.x = e.clientX;
    dragState.current.scroll = scrollPos;
    dragState.current.dragging = true;
    setIsUserInteracting(true);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragState.current.dragging) return;
    const dx = dragState.current.x - e.clientX;
    setScrollPos(dragState.current.scroll + dx);
  };
  const onPointerUp = () => {
    dragState.current.dragging = false;
    setTimeout(() => setIsUserInteracting(false), 3000);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  // Touch events for mobile swipe
  const onTouchStart = (e: React.TouchEvent) => {
    dragState.current.x = e.touches[0].clientX;
    dragState.current.scroll = scrollPos;
    dragState.current.dragging = true;
    setIsUserInteracting(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragState.current.dragging) return;
    const dx = dragState.current.x - e.touches[0].clientX;
    setScrollPos(dragState.current.scroll + dx);
  };
  const onTouchEnd = () => {
    dragState.current.dragging = false;
    setTimeout(() => setIsUserInteracting(false), 3000);
  };

  // Dot navigation
  const goto = (idx: number) => {
    if (!containerWidth || !slides.length || sourceList.length === 0) return;
    const singleListWidth = sourceList.length * (cardWidth + cardSpacing);
    const px =
      singleListWidth * Math.floor(slides.length / (2 * sourceList.length)) +
      idx * (cardWidth + cardSpacing);
    smoothScrollTo(px);
    setIsUserInteracting(true);
    setTimeout(() => setIsUserInteracting(false), 2500);
  };

  // Find the nearest original card
  const n = sourceList.length || 1;
  const currentCenterIdx =
    Math.round(
      (scrollPos + containerWidth / 2 - cardWidth / 2) /
      (cardWidth + cardSpacing)
    ) % n;
  const displayDotIdx =
    currentCenterIdx < 0 ? currentCenterIdx + n : currentCenterIdx;

  if (loading || !canShowSection || sourceList.length < MIN_REVIEWS_TO_SHOW) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="w-full relative flex flex-col justify-center bg-background overflow-hidden py-10 md:py-14 px-2 md:px-3"
      style={{
        minHeight: 320,
      }}
    >
      {/* Testimonials Heading */}
      <div className="w-full flex flex-col items-center mb-3 md:mb-6 px-2 md:px-0">
        <h2 className="heading3 text-center font-bold text-secondary">
          Our Customers Real Stories
        </h2>
        <div className="h-[2px] w-12 bg-primary mt-2 rounded" />
      </div>
      <div
        className="relative w-full h-auto max-w-full px-2 md:px-6 select-none"
        style={{ overflow: "hidden" }}
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-16 bg-gradient-to-r from-background to-transparent z-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-16 bg-gradient-to-l from-background to-transparent z-20" />
        <div
          ref={listRef}
          className="flex items-center"
          style={{
            gap: `${cardSpacing}px`,
            transform: `translateX(${-scrollPos}px)`,
            transition: dragState.current.dragging
              ? "none"
              : "transform 0.5s cubic-bezier(.6,.2,.21,1)",
            cursor: dragState.current.dragging ? "grabbing" : "grab",
          }}
          onPointerDown={onPointerDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {slides.map((t, idx) => (
            <div
              key={String(idx) + String(t.id)}
              style={{
                minWidth: cardWidth,
                maxWidth: cardWidth,
                width: cardWidth,
                flex: "0 0 auto",
                userSelect: "none",
                opacity: 1,
                pointerEvents: dragState.current.dragging ? "none" : "auto",
                transition: "width 0.4s",
              }}
            >
              <div
                className="relative flex flex-col bg-surface rounded-3xl shadow-lg border border-line/40 overflow-hidden h-full"
                style={{
                  minHeight: 260,
                }}
              >
                <div className="flex items-center gap-1 px-7 pt-6">
                  <Icon.Star size={16} weight="fill" className="text-primary" />
                  <Icon.Star size={16} weight="fill" className="text-primary" />
                  <Icon.Star size={16} weight="fill" className="text-primary" />
                  <Icon.Star size={16} weight="fill" className="text-primary" />
                  <Icon.Star size={16} weight="fill" className="text-primary" />
                </div>
                <div className="px-7 pt-3 text-[1.02rem] italic leading-relaxed text-secondary line-clamp-6 flex-1">
                  “{t.text || "Great results with a gentle feel and noticeable glow."}”
                </div>
                <div className="px-7 pb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-background border border-line/40 flex items-center justify-center text-secondary font-bold">
                    {t.name?.[0]?.toUpperCase() || "N"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-secondary truncate">{t.name}</div>
                    <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-background text-secondary">
                      <Icon.CheckCircle size={12} weight="fill" className="text-primary" />
                      Verified Buyer
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Prev button */}
        <button
          className="hidden sm:block absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-surface/80 hover:bg-primary/90 text-primary hover:text-background p-2 rounded-full shadow border border-line/40 focus:outline-none focus:ring transition"
          style={{}}
          aria-label="Previous testimonials"
          onClick={() => {
            smoothScrollBy(-(cardWidth + cardSpacing));
            setIsUserInteracting(true);
            setTimeout(() => setIsUserInteracting(false), 2500);
          }}
        >
          <Icon.CaretLeft size={32} />
        </button>
        {/* Next button */}
        <button
          className="hidden sm:block absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-surface/80 hover:bg-primary/90 text-primary hover:text-background p-2 rounded-full shadow border border-line/40 focus:outline-none focus:ring transition"
          aria-label="Next testimonials"
          onClick={() => {
            smoothScrollBy(cardWidth + cardSpacing);
            setIsUserInteracting(true);
            setTimeout(() => setIsUserInteracting(false), 2500);
          }}
        >
          <Icon.CaretRight size={32} />
        </button>
      </div>
    </div>
  );
};

export default Testimonial;
