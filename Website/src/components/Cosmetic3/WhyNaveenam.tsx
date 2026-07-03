"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Drop,
  Info,
  ShieldCheck,
  ShoppingCart,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";

const educationalContent = [
  {
    id: 0,
    icon: Sparkle,
    title: "Specialized Products",
    tagline: "Handcrafted with science & ayurveda",
    description:
      "Each product is handcrafted with a blend of science and ayurvedic ingredients like actives, extracts, herbs and exotic oils where we want you to see the difference.",
    details: [
      "We prioritize on natural and plant based choices, sustainability and eco-friendly practices making a wonderful option for your Hair and Skincare.",
      "Led by our qualified and innovative R&D team, every formulation is crafted to deliver visible results.",
    ],
    image: "/images/abstract/leaf.jpg",
  },
  {
    id: 1,
    icon: ShieldCheck,
    title: "No Harsh Chemicals",
    tagline: "Because your skin deserves only the best",
    description:
      "Every product is designed to suit all skin types. Each product is free from sulphate, parabens, silicones, formalin, phthalates, ammonia.",
    details: [
      "These chemicals tend to give more lather, silky feel, extend shelf life and more. But for many, they tend to give skin irritations, skin and scalp damage, hormone disruption, dermatitis and extreme skin conditions.",
      "Why no silicones in Naveenam's products? Silicones are synthetic ingredients used in skincare products to enhance texture, provide a smooth feel, and lock in moisture but their benefits and safety does not extend longer. They may make hair lose their natural shine and strength leading to thinning and hairfall slowly.",
    ],
    image: "/images/abstract/leaf.jpg",
  },
  {
    id: 2,
    icon: Drop,
    title: "Safe & Skin-Friendly Surfactants",
    tagline: "Conscious formulation choices",
    description:
      "In Skin and Hair care industry we have many surfactants to provide cleansing, lathering and conditioning like shampoo, face wash, body wash etc. Choosing consciously the safe and non-irritant one matters while formulating for the loved users.",
    details: [
      "At Naveenam Naturals we use only mild, safe and skin friendly surfactants that cleanse effectively without stripping your skin's natural protective barrier.",
      "Not all foam means the same — we prioritize gentle, plant-based cleansers over harsh chemicals that create excessive lather.",
    ],
    image: "/images/abstract/leaf.jpg",
  },
];

type EducationalContentItem = (typeof educationalContent)[number];

type TabNavigationProps = {
  activeTab: number;
  items: EducationalContentItem[];
  onTabChange: (index: number) => void;
};

type ContentDisplayProps = {
  activeTab: number;
  items: EducationalContentItem[];
};

type BottomCTAProps = {
  onOurStoryClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
};

const BackgroundDecor = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-64 opacity-5">
      <Image
        src="/images/abstract/wave.svg"
        alt=""
        fill
        className="object-cover object-top"
        sizes="100vw"
      />
    </div>

    <div className="absolute bottom-0 left-0 w-full h-full opacity-10">
      <Image
        src="/images/abstract/abstract01.svg"
        alt=""
        fill
        className="object-contain object-bottom scale-x-[-1] rotate-60"
        sizes="100vw"
      />
    </div>

    <div
      className="absolute top-1/3 left-1/4 w-96 h-96 opacity-20"
      style={{
        background:
          "radial-gradient(circle, color-mix(in srgb, var(--accent) 15%, transparent) 0%, transparent 60%)",
      }}
    />
  </div>
);

const SectionHeader = () => (
  <div className="text-center mb-12 sm:mb-16">
    <h2 className="text-lg sm:text-2xl md:text-4xl font-bold text-black tracking-tight mb-6">
      Why should I choose Naveenam Naturals products?
    </h2>
    <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-success to-transparent mx-auto mb-6" />
    <p className="text-xs sm:text-lg text-black max-w-2xl mx-auto font-normal">
      Understanding the science behind natural beauty and why our formulations
      make a difference
    </p>
  </div>
);

const StorySection = () => (
  <div className="max-w-6xl mx-auto mb-16 sm:mb-20 px-4">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
      <div className="order-2 lg:order-1">
        <h3 className="text-lg sm:text-2xl md:text-3xl font-bold text-black mb-6">
          Your Glow Is Your Happiness
        </h3>
        <div className="space-y-4 text-gray-700 text-xs sm:text-lg leading-relaxed font-normal text-justify">
          <p>
            Does your inner confidence lie on the fact of healthy being and
            glow? Of course, Yes. Led by a qualified and innovative R&D team,
            we are committed to deliver the best experience for every soul.
          </p>
          <p>
            Our staunch belief is that beauty doesn&apos;t symbolize colour,
            appeal, or limelight gleams.{" "}
            <span className="font-bold text-success">
              YOUR GLOW is YOUR HAPPINESS.
            </span>{" "}
            We value that your lovely skin is precious and deserves to be
            pampered with safe and healthy ingredients to bring out the inner
            radiance.
          </p>
          <p>
            We will be more eager to have you onboard of our journey in
            educating our loved ones the importance of incorporating natural,
            plant based and healthy ingredients in all walks of our life.
          </p>
        </div>
      </div>

      <div className="order-1 lg:order-2">
        <div className="relative w-full aspect-[16/10] sm:aspect-[4/3] lg:aspect-square max-w-xs sm:max-w-md lg:max-w-lg mx-auto drop-shadow-lg">
          <Image
            src="/images/family.png"
            alt="Happy Indian family enjoying natural wellness"
            fill
            priority
            fetchPriority="high"
            className="object-cover rounded-2xl"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </div>
    </div>
  </div>
);

const TabNavigation = ({ activeTab, items, onTabChange }: TabNavigationProps) => (
  <div className="relative mb-10 sm:mb-16 hidden lg:block">
    <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 hidden sm:block">
      <div
        className="h-full bg-gradient-to-r from-success to-purple-600 transition-all duration-500"
        style={{ width: `${((activeTab + 1) / items.length) * 100}%` }}
      />
    </div>

    <div className="flex justify-between items-start relative">
      {items.map((item, index) => {
        const IconComponent = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => onTabChange(index)}
            className="flex-1 max-w-xs group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-3 sm:mb-4 w-10 h-10 sm:w-12 sm:h-12">
                <div
                  className={`relative w-full h-full rounded-full flex items-center justify-center transition-all duration-300 ${
                    activeTab === index
                      ? "bg-success text-white shadow-lg scale-110"
                      : "bg-white text-gray-400 border-2 border-gray-200 group-hover:border-success/50 group-hover:scale-105"
                  }`}
                >
                  <IconComponent
                    size={activeTab === index ? 24 : 20}
                    weight={activeTab === index ? "fill" : "regular"}
                  />
                </div>
              </div>

              <div
                className={`text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  activeTab === index
                    ? "text-success"
                    : "text-gray-500 group-hover:text-gray-700"
                }`}
              >
                <span className="hidden sm:block">{item.title.split(".")[0]}</span>
                <span className="sm:hidden">{item.title.split(" ")[0]}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

const ContentDisplay = ({ activeTab, items }: ContentDisplayProps) => (
  <div className="hidden sm:block relative">
    {items.map((content, index) => {
      const IconComponent = content.icon;

      return (
        <div
          key={content.id}
          className={`transition-all duration-700 ${
            activeTab === index
              ? "opacity-100 translate-y-0"
              : "opacity-0 absolute inset-0 pointer-events-none translate-y-4"
          }`}
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200 overflow-hidden shadow-2xl">
            <div className="relative bg-gradient-to-br from-gray-50 to-white p-4 sm:p-10">
              <div className="absolute top-0 right-0 text-[80px] sm:text-[160px] font-black text-gray-100 leading-none select-none">
                {index + 1}
              </div>

              <div className="relative z-10">
                <div className="inline-flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-success to-purple-600 rounded-2xl flex items-center justify-center shadow-xl rotate-3 hover:rotate-0 transition-transform duration-300">
                    <IconComponent size={32} className="text-white" weight="fill" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-success uppercase tracking-wider mb-1">
                      {content.tagline}
                    </div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900">
                      {content.title}
                    </h3>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-2 sm:p-10">
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-100 to-violet-100 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300" />
                <div className="relative bg-white rounded-2xl p-4 sm:p-8 border-2 border-gray-100 hover:border-success/30 transition-all duration-300">
                  <p className="text-gray-800 leading-relaxed text-xs sm:text-lg mb-6 font-medium">
                    {content.description}
                  </p>

                  <div className="space-y-4">
                    {content.details.map((detail, detailIndex) => (
                      <div
                        key={detailIndex}
                        className="relative p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-success/20"
                      >
                        <div className="absolute top-2 right-2 w-8 h-8 bg-success/20 rounded-full blur-md" />
                        <div className="relative flex items-start gap-3">
                          <CheckCircle
                            size={20}
                            className="text-success flex-shrink-0 mt-0.5"
                            weight="fill"
                          />
                          <p className="text-[14px] sm:text-base text-black leading-relaxed font-medium">
                            {detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

const BottomCTA = ({ onOurStoryClick }: BottomCTAProps) => (
  <div className="text-center mt-10 sm:mt-12">
    <div className="inline-flex flex-col sm:flex-row items-center gap-4">
      <Link
        href="/product"
        className="bg-success hover:bg-success/70 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 text-sm sm:text-base"
      >
        <ShoppingCart size={20} weight="bold" />
        Shop Our Products
      </Link>
      <Link
        href="/ourstory"
        className="border-2 border-gray-300 hover:border-purple-400 text-gray-700 hover:text-purple-700 px-8 py-4 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm sm:text-base"
        onClick={onOurStoryClick}
      >
        <Info size={20} weight="bold" />
        Learn More About Us
      </Link>
    </div>
  </div>
);

const WhyNaveenam = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % educationalContent.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleOurStoryClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    router.push("/ourstory");
  };

  return (
    <div className="why-naveenam-section bg-surface py-4 sm:py-20 md:py-24 relative overflow-hidden">
      <BackgroundDecor />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <SectionHeader />
        <StorySection />
        <TabNavigation
          activeTab={activeTab}
          items={educationalContent}
          onTabChange={setActiveTab}
        />
        <ContentDisplay activeTab={activeTab} items={educationalContent} />
        <BottomCTA onOurStoryClick={handleOurStoryClick} />
      </div>
    </div>
  );
};

export default WhyNaveenam;
