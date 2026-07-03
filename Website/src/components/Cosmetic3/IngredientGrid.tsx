"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Ingredient {
  name: string;
  image: string;
  scientificName: string;
  benefits: string[];
  description: string;
  color: string;
  accentColor: string;
  borderColor: string;
  bgPattern: string;
}

const IngredientGrid = () => {
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const ingredients: Ingredient[] = [
    {
      name: "Coconut",
      image: "/images/ingridients/coconut.png",
      scientificName: "Cocos Nucifera",
      benefits: ["Deep Moisturization", "Hair Strength", "Scalp Health", "Natural Shine"],
      description: "Rich in fatty acids and vitamins, coconut deeply nourishes hair and skin, providing intense hydration and natural shine.",
      color: "from-surface via-white to-surface",
      accentColor: "accent",
      borderColor: "border-white",
      bgPattern: "bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--accent)_15%,transparent),transparent_50%)]",
    },
    {
      name: "Almond",
      image: "/images/ingridients/almond.png",
      scientificName: "Prunus Amygdalus Dulcis",
      benefits: ["Vitamin E Rich", "Anti-Aging", "Skin Softening", "UV Protection"],
      description: "Packed with vitamin E and antioxidants, almond oil helps reduce signs of aging while softening and smoothing skin.",
      color: "from-surface via-white to-surface",
      accentColor: "accent",
      borderColor: "border-white",
      bgPattern: "bg-[radial-gradient(circle_at_bottom_left,color-mix(in_srgb,var(--primary)_15%,transparent),transparent_50%)]",
    },
    {
      name: "Seaweed",
      image: "/images/ingridients/seaweed.png",
      scientificName: "Laminaria Digitata",
      benefits: ["Mineral Rich", "Detoxifying", "Skin Firming", "Hydration"],
      description: "Loaded with minerals and nutrients from the ocean, seaweed extract detoxifies and firms skin naturally.",
      color: "from-surface via-white to-surface",
      accentColor: "accent",
      borderColor: "border-white",
      bgPattern: "bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--secondary)_15%,transparent),transparent_50%)]",
    },
    {
      name: "Hibiscus",
      image: "/images/ingridients/hibiscus.png",
      scientificName: "Hibiscus Sabdariffa",
      benefits: ["Natural AHA", "Hair Growth", "Anti-Inflammatory", "Collagen Boost"],
      description: "Known as the 'botox plant', hibiscus contains natural AHAs that gently exfoliate and promote collagen production.",
      color: "from-surface via-white to-surface",
      accentColor: "accent",
      borderColor: "border-white",
      bgPattern: "bg-[radial-gradient(circle_at_bottom_right,color-mix(in_srgb,var(--pink)_15%,transparent),transparent_50%)]",
    },
    {
      name: "Ginger",
      image: "/images/ingridients/ginger.png",
      scientificName: "Zingiber Officinale",
      benefits: ["Circulation Boost", "Anti-Inflammatory", "Antioxidant", "Skin Tone"],
      description: "Stimulates blood circulation and provides powerful antioxidant protection while reducing inflammation.",
      color: "from-surface via-white to-surface",
      accentColor: "accent",
      borderColor: "border-white",
      bgPattern: "bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--yellow)_15%,transparent),transparent_50%)]",
    },
    {
      name: "Cow's Milk",
      image: "/images/ingridients/cowmilk.png",
      scientificName: "Lac Bovis",
      benefits: ["Deep Hydration", "Skin Brightening", "Natural Glow", "Skin Renewal"],
      description: "Rich in lactic acid and proteins, cow's milk gently exfoliates and deeply moisturizes skin for a natural glow.",
      color: "from-surface via-white to-surface",
      accentColor: "accent",
      borderColor: "border-white",
      bgPattern: "bg-[radial-gradient(circle_at_top_center,color-mix(in_srgb,var(--success)_15%,transparent),transparent_50%)]",
    },
  ];

  return (
    <div className="ingredient-grid-section bg-white py-4 md:py-16 relative overflow-hidden">
      {/* Abstract Leaf Background - Preserved */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 right-0 w-full h-full opacity-10"
          style={{
            backgroundImage: "url('/images/abstract/ingredientsbgleaf.svg')",
            backgroundSize: "contain",
            backgroundPosition: "top center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div
          className="absolute bottom-[-1000px] left-0 w-full h-full opacity-10"
          style={{
            backgroundImage: "url('/images/abstract/abstract01.svg')",
            backgroundSize: "contain",
            backgroundPosition: "bottom center",
            backgroundRepeat: "no-repeat",
            transform: "scaleX(-1) rotate(180deg)",
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Compact Header */}
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg md:text-3xl font-bold text-black mb-3 tracking-tight"
          >
            Our Signature Ingredients
          </motion.h2>
          <p className="text-xs md:text-base text-gray-500 font-medium">
            Each ingredient is meticulously selected for its proven efficacy and
            purity, delivering transformative results for your skin and hair
          </p>
        </div>

        {/* Compact 3-Column Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-16">
          {ingredients.map((ingredient, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedIngredient(ingredient)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="group cursor-pointer"
            >
              <div className="bg-surface border border-black/40 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg h-full flex flex-col">
                <div className="relative aspect-square bg-background overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${ingredient.color} opacity-30`} />
                  <Image
                    src={ingredient.image}
                    alt={ingredient.name}
                    fill
                    className="object-contain p-4 group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-3 md:p-5 text-center">
                  <h3 className="text-sm md:text-lg font-bold text-secondary leading-tight">
                    {ingredient.name}
                  </h3>
                  <p className="text-[14px] md:text-sm text-secondaryLegacy italic mb-3">
                    {ingredient.scientificName}
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5 mt-auto">
                    {ingredient.benefits.slice(0, 2).map((benefit, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-background text-[14px] font-bold text-secondary rounded-full">
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Professional Trust Badges with Certificates */}
        <div className="bg-gradient-to-b from-white to-black/20 rounded-2xl p-6 sm:p-8 border border-gray">
          <div className="text-center mb-8">
            <h3 className="text-lg sm:text-3xl font-light text-black mb-2">
              Our <span className="font-bold heading3">Commitment</span> to
              Excellence
            </h3>
            <p className="text-gray text-xs font-light max-w-2xl mx-auto">
              Every product is crafted with the highest standards of quality and
              purity
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {[
              {
                label: "FDA Approved",
                image: "/images/certificates/fdaApproved.png",
              },
              {
                label: "No Harmful Chemicals",
                image: "/images/certificates/noHarmful.png",
              },
              {
                label: "GMP Certified",
                image: "/images/certificates/gmpcertified.png",
              },
              {
                label: "ISO Certified",
                image: "/images/certificates/iso.png",
              },
              {
                label: "Cruelty Free",
                image: "/images/certificates/crueltyFree.png",
              },
              {
                label: "Paraben Free",
                image: "/images/certificates/parabanfree.png",
              },
              {
                label: "Sulfate Free",
                image: "/images/certificates/sulfatefree.png",
              },
              {
                label: "Phthalates Free",
                image: "/images/certificates/phthalates.png",
              },
              {
                label: "Silicon Free",
                image: "/images/certificates/siliconfree.png",
              },
              {
                label: "Recyclable",
                image: "/images/certificates/recycle.png",
              },
            ].map((cert, index) => (
              <div key={index} className="group text-center">
                {/* Certificate Image */}
                <div className="mb-4 flex justify-center">
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-2xl overflow-hidden bg-white border-2 border-gray-200 group-hover:border-purple-400 transition-all duration-300 group-hover:shadow-xl p-3">
                    <Image
                      src={cert.image}
                      alt={cert.label}
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                </div>

                {/* Label */}
                <div className="text-xs sm:text-base font-semibold text-gray-900 px-2">
                  {cert.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modern Compact Modal */}
      <AnimatePresence>
        {selectedIngredient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 pb-24 lg:pb-4"
            onClick={() => setSelectedIngredient(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl max-w-4xl w-full overflow-y-auto max-h-[calc(100vh-6rem)] lg:max-h-[calc(100vh-2rem)] shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedIngredient(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center z-20 shadow-sm border border-gray-100"
              >
                <Icon.X size={16} className="text-gray-900" weight="bold" />
              </button>

              <div className="grid md:grid-cols-5 gap-0">
                <div className={`col-span-2 bg-gradient-to-br ${selectedIngredient.color} p-8 hidden md:flex items-center justify-center relative`}>
                  <div className="relative w-full aspect-square scale-110 drop-shadow-xl">
                    <Image src={selectedIngredient.image} alt={selectedIngredient.name} fill className="object-contain" />
                  </div>
                </div>
                <div className="col-span-3 p-4 md:p-10 flex flex-col">
                  <div className="mb-3 md:mb-6">
                    <div className="flex items-center gap-3 mb-2 md:mb-4">
                      <div className="relative w-12 h-12 md:hidden flex-shrink-0">
                        <Image src={selectedIngredient.image} alt={selectedIngredient.name} fill className="object-contain" />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-success/10 rounded-full mb-1 md:mb-2">
                          <Icon.Leaf size={10} className="text-success" weight="fill" />
                          <span className="text-[10px] md:text-xs font-bold text-success uppercase tracking-wider">Premium Core</span>
                        </div>
                        <h3 className="text-xl md:text-4xl font-bold text-gray-900">{selectedIngredient.name}</h3>
                      </div>
                    </div>
                    <p className="text-xs md:text-base text-gray-400 italic mb-2 md:mb-6">{selectedIngredient.scientificName}</p>
                    <p className="text-gray-600 text-sm md:text-base leading-relaxed">{selectedIngredient.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4 md:mb-8">
                    {selectedIngredient.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 md:p-3 bg-gray-50 rounded-lg">
                        <Icon.CheckCircle size={14} className="text-success flex-shrink-0" weight="fill" />
                        <span className="text-[11px] md:text-sm font-bold text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="/product"
                    onClick={() => setSelectedIngredient(null)}
                    className="w-full bg-success text-white py-3 md:py-4 rounded-xl font-bold hover:bg-success/90 transition-all flex items-center justify-center gap-2 text-sm md:text-base shadow-md shadow-success/20"
                  >
                    <Icon.ShoppingCart size={18} weight="bold" />
                    Shop Collection
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IngredientGrid;
