"use client";

import React, { useState } from "react";
import Image from "next/image";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";

interface Ingredient {
  id: string;
  name: string;
  image: string;
  benefits: string[];
  description: string;
  color: string;
  detailedInfo: {
    origin: string;
    extractionMethod: string;
    activeCompounds: string[];
    skinTypes: string[];
    usageTips: string[];
    scientificName: string;
  };
}

interface IngredientShowcaseProps {
  className?: string;
}

const IngredientShowcase: React.FC<IngredientShowcaseProps> = ({
  className = "",
}) => {
  const [expandedIngredients, setExpandedIngredients] = useState<Set<string>>(
    new Set()
  );
  const router = useRouter();

  const toggleExpanded = (ingredientId: string) => {
    const newExpanded = new Set(expandedIngredients);
    if (newExpanded.has(ingredientId)) {
      newExpanded.delete(ingredientId);
    } else {
      newExpanded.add(ingredientId);
    }
    setExpandedIngredients(newExpanded);
  };
  const ingredients: Ingredient[] = [
    {
      id: "ginger",
      name: "Ginger",
      image: "/images/ingridients/ginger.png",
      description: "A powerful root with anti-inflammatory properties",
      color: "var(--accent)",
      benefits: [
        "Reduces inflammation and redness",
        "Improves blood circulation",
        "Fights acne and blemishes",
        "Soothes sensitive skin",
        "Natural antioxidant protection",
      ],
      detailedInfo: {
        origin: "Southeast Asia",
        extractionMethod: "Cold-pressed essential oil extraction",
        activeCompounds: ["Gingerol", "Shogaol", "Zingerone", "Gingerdione"],
        skinTypes: ["Oily", "Acne-prone", "Sensitive", "Mature"],
        usageTips: [
          "Use in small concentrations (0.5-2%)",
          "Best applied in evening routines",
          "Always patch test before use",
          "Avoid contact with eyes",
          "Store in cool, dark place",
        ],
        scientificName: "Zingiber officinale",
      },
    },
    {
      id: "hibiscus",
      name: "Hibiscus",
      image: "/images/ingridients/hibiscus.png",
      description: "A beautiful flower rich in vitamins and antioxidants",
      color: "var(--pink)",
      benefits: [
        "Tightens and firms skin",
        "Reduces fine lines and wrinkles",
        "Natural exfoliating properties",
        "Brightens dull complexion",
        "Rich in vitamin C",
      ],
      detailedInfo: {
        origin: "Tropical regions worldwide",
        extractionMethod: "Water-based extraction from petals",
        activeCompounds: [
          "Anthocyanins",
          "Flavonoids",
          "Vitamin C",
          "Alpha-hydroxy acids",
        ],
        skinTypes: ["All skin types", "Mature", "Dull", "Combination"],
        usageTips: [
          "Safe for daily use",
          "Can be used morning and evening",
          "Works well with vitamin C serums",
          "Gentle enough for sensitive skin",
          "Natural pH balancing properties",
        ],
        scientificName: "Hibiscus rosa-sinensis",
      },
    },
    {
      id: "almond",
      name: "Almond",
      image: "/images/ingridients/almond.png",
      description: "Nutrient-rich nuts for deep skin nourishment",
      color: "var(--yellow)",
      benefits: [
        "Deep moisturizing properties",
        "Rich in vitamin E",
        "Softens and smooths skin",
        "Reduces dark circles",
        "Natural anti-aging benefits",
      ],
      detailedInfo: {
        origin: "Mediterranean region",
        extractionMethod: "Cold-pressed oil extraction",
        activeCompounds: [
          "Vitamin E",
          "Oleic acid",
          "Linoleic acid",
          "Palmitic acid",
        ],
        skinTypes: ["Dry", "Sensitive", "Mature", "All skin types"],
        usageTips: [
          "Excellent as a carrier oil",
          "Can be used alone or mixed with other oils",
          "Apply to damp skin for better absorption",
          "Safe for use around eyes",
          "Store in refrigerator for longer shelf life",
        ],
        scientificName: "Prunus dulcis",
      },
    },
    {
      id: "seaweed",
      name: "Seaweed",
      image: "/images/ingridients/seaweed.png",
      description: "Ocean minerals for detoxifying and purifying skin",
      color: "var(--success)",
      benefits: [
        "Detoxifies and purifies skin",
        "Rich in minerals and vitamins",
        "Reduces puffiness and inflammation",
        "Improves skin elasticity",
        "Natural anti-bacterial properties",
      ],
      detailedInfo: {
        origin: "Cold ocean waters",
        extractionMethod: "Marine biotechnology extraction",
        activeCompounds: ["Alginic acid", "Fucoidan", "Laminarin", "Iodine"],
        skinTypes: ["Oily", "Acne-prone", "Puffy", "All skin types"],
        usageTips: [
          "Best used in masks and treatments",
          "Can be used 2-3 times per week",
          "Rinse thoroughly after use",
          "Avoid if allergic to iodine",
          "Store in airtight container",
        ],
        scientificName: "Laminaria digitata",
      },
    },
    {
      id: "coconut",
      name: "Coconut",
      image: "/images/ingridients/coconut.png",
      description: "Tropical hydration for soft, supple skin",
      color: "var(--secondary)",
      benefits: [
        "Intense hydration and moisture",
        "Natural antimicrobial properties",
        "Softens and conditions skin",
        "Reduces skin irritation",
        "Rich in fatty acids",
      ],
      detailedInfo: {
        origin: "Tropical coastal regions",
        extractionMethod: "Cold-pressed virgin coconut oil",
        activeCompounds: [
          "Lauric acid",
          "Capric acid",
          "Caprylic acid",
          "Vitamin E",
        ],
        skinTypes: ["Dry", "Sensitive", "All skin types"],
        usageTips: [
          "Solid at room temperature, melts on skin",
          "Can be used as makeup remover",
          "Excellent for body moisturizing",
          "Natural SPF properties (low)",
          "Store in cool, dry place",
        ],
        scientificName: "Cocos nucifera",
      },
    },
  ];

  return (
    <div className={`ingredient-showcase py-20 bg-white ${className} `}>
      <div className="container relative">
        <div
          className="absolute left-[-25%] top-[0%] w-[40%] h-[40%] opacity-20 pointer-events-none"
          style={{
            backgroundImage: "url('/Lineart/1.png')",
            backgroundSize: "contain",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            zIndex: 1,
            rotate: "90deg",
          }}
        />

        <div
          className="absolute right-[-25%] top-[-20%] w-[40%] h-[40%] opacity-20 pointer-events-none"
          style={{
            backgroundImage: "url('/Lineart/2.png')",
            backgroundSize: "contain",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            zIndex: 1,
            rotate: "90deg",
          }}
        />

        <div
          className="absolute right-[-25%] top-[20%] w-[40%] h-[40%] opacity-10 pointer-events-none"
          style={{
            backgroundImage: "url('/Lineart/hibiscus.png')",
            backgroundSize: "contain",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            zIndex: 1,
          }}
        />

        <div
          className="absolute left-[-25%] top-[30%] w-[40%] h-[40%] opacity-20 pointer-events-none"
          style={{
            backgroundImage: "url('/Lineart/5.png')",
            backgroundSize: "contain",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            zIndex: 1,
            rotate: "-50deg",
          }}
        />

        <div
          className="absolute right-[-25%] top-[50%] w-[40%] h-[40%] opacity-15 pointer-events-none"
          style={{
            backgroundImage: "url('/Lineart/7.png')",
            backgroundSize: "contain",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            zIndex: 1,
          }}
        />

        {/* Header */}
        <div className="text-center mb-16">
          <div className="text-sub-display text-black mb-4">
            Natural Ingredients
          </div>
          <div className="heading3 text-black mb-6">
            Pure Benefits for Your Skin
          </div>
          <div className="body1 text-secondary max-w-2xl mx-auto">
            Discover the power of nature's finest ingredients, carefully
            selected for their proven benefits in skincare and wellness.
          </div>
        </div>

        {/* All Ingredients - One Below Another */}
        {ingredients.map((ingredient, index) => (
          <div key={ingredient.id} className="mb-20">
            <div
              className={`grid lg:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? "lg:grid-flow-col-dense" : ""
                }`}
            >
              {/* Image Side */}
              <div className={`${index % 2 === 1 ? "lg:col-start-2" : ""}`}>
                <div className="relative overflow-hidden rounded-3xl">
                  {/* Multiple blurred lineart backgrounds for abstract effect */}
                  <div className="absolute inset-0 -z-30 opacity-3">
                    <Image
                      src={`/Lineart/${ingredient.name.toLowerCase()}.png`}
                      alt={`${ingredient.name} lineart background`}
                      width={1000}
                      height={1000}
                      className="w-full h-full object-cover blur-3xl scale-200 rotate-12"
                    />
                  </div>

                  {/* Main ingredient image */}
                  <div className="w-full h-[500px] lg:h-[600px] relative z-10 flex items-center justify-center">
                    <Image
                      src={ingredient.image}
                      alt={ingredient.name}
                      width={600}
                      height={600}
                      className="w-full h-full object-contain drop-shadow-2xl"
                    />
                  </div>

                  {/* Decorative background gradient */}
                  <div
                    className="absolute inset-0 -z-10 opacity-15"
                    style={{
                      background: `radial-gradient(circle at 30% 20%, ${ingredient.color}40 0%, transparent 50%), radial-gradient(circle at 70% 80%, ${ingredient.color}20 0%, transparent 60%)`,
                    }}
                  ></div>

                  {/* Floating abstract elements */}
                  <div
                    className="absolute top-8 right-8 w-40 h-40 rounded-full opacity-8 -z-5"
                    style={{
                      background: `linear-gradient(45deg, ${ingredient.color}30, transparent)`,
                      filter: "blur(20px)",
                    }}
                  ></div>
                  <div
                    className="absolute bottom-8 left-8 w-32 h-32 rounded-full opacity-6 -z-5"
                    style={{
                      background: `linear-gradient(135deg, ${ingredient.color}25, transparent)`,
                      filter: "blur(15px)",
                    }}
                  ></div>
                  <div
                    className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full opacity-5 -z-5"
                    style={{
                      background: `linear-gradient(225deg, ${ingredient.color}20, transparent)`,
                      filter: "blur(10px)",
                    }}
                  ></div>

                  {/* Subtle border gradient */}
                  <div
                    className="absolute inset-0 rounded-3xl opacity-20 -z-1"
                    style={{
                      background: `linear-gradient(135deg, ${ingredient.color}10, transparent, ${ingredient.color}05)`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Content Side */}
              <div className={`${index % 2 === 1 ? "lg:col-start-1" : ""}`}>
                <div className="space-y-8">
                  {/* Ingredient Name */}
                  <div>
                    <div className="heading3 text-black mb-4">
                      {ingredient.name}
                    </div>
                    <div className="body1 text-secondary">
                      {ingredient.description}
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-4">
                    <div className="text-title text-black mb-4">
                      Key Benefits:
                    </div>
                    {ingredient.benefits.map((benefit, benefitIndex) => (
                      <div
                        key={benefitIndex}
                        className="flex items-start gap-4 p-4 rounded-xl bg-surface"
                      >
                        <div
                          className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                          style={{ backgroundColor: ingredient.color }}
                        ></div>
                        <div className="caption1 text-black">{benefit}</div>
                      </div>
                    ))}
                  </div>

                  {/* Accordion Toggle Button */}
                  <div className="pt-6">
                    <button
                      onClick={() => toggleExpanded(ingredient.id)}
                      className="flex items-center justify-between gap-3 p-4 rounded-xl border-2 border-line hover:border-primary/50 transition-all duration-300 w-full group hover:shadow-lg hover:scale-[1.02]"
                      style={{
                        borderColor: expandedIngredients.has(ingredient.id)
                          ? ingredient.color
                          : undefined,
                        backgroundColor: expandedIngredients.has(ingredient.id)
                          ? `${ingredient.color}10`
                          : undefined,
                      }}
                    >
                      <span className="text-title text-black group-hover:text-primary transition-colors duration-300">
                        {expandedIngredients.has(ingredient.id)
                          ? "Hide"
                          : "Show"}{" "}
                        Detailed Information
                      </span>
                      <div className="flex items-center gap-2">
                        <Icon.CaretDown
                          size={20}
                          className={`text-black transition-all duration-500 ease-in-out group-hover:text-primary ${expandedIngredients.has(ingredient.id)
                            ? "rotate-180"
                            : ""
                            }`}
                        />
                      </div>
                    </button>
                  </div>

                  {/* Accordion Content */}
                  <div
                    className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedIngredients.has(ingredient.id)
                      ? "max-h-[2000px] opacity-100 mt-6"
                      : "max-h-0 opacity-0 mt-0"
                      }`}
                  >
                    <div className="space-y-6">
                      {/* Scientific Information */}
                      <div
                        className="p-6 rounded-xl bg-surface transform transition-all duration-300 ease-out"
                        style={{
                          animationDelay: expandedIngredients.has(ingredient.id)
                            ? "0.1s"
                            : "0s",
                          transform: expandedIngredients.has(ingredient.id)
                            ? "translateY(0)"
                            : "translateY(-10px)",
                          opacity: expandedIngredients.has(ingredient.id)
                            ? 1
                            : 0,
                        }}
                      >
                        <div className="text-title text-black mb-4">
                          Scientific Information
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="caption1 text-secondary">
                              Scientific Name:
                            </span>
                            <span className="caption1 text-black font-medium">
                              {ingredient.detailedInfo.scientificName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="caption1 text-secondary">
                              Origin:
                            </span>
                            <span className="caption1 text-black font-medium">
                              {ingredient.detailedInfo.origin}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="caption1 text-secondary">
                              Extraction Method:
                            </span>
                            <span className="caption1 text-black font-medium">
                              {ingredient.detailedInfo.extractionMethod}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Active Compounds */}
                      <div
                        className="p-6 rounded-xl bg-surface transform transition-all duration-300 ease-out"
                        style={{
                          animationDelay: expandedIngredients.has(ingredient.id)
                            ? "0.2s"
                            : "0s",
                          transform: expandedIngredients.has(ingredient.id)
                            ? "translateY(0)"
                            : "translateY(-10px)",
                          opacity: expandedIngredients.has(ingredient.id)
                            ? 1
                            : 0,
                        }}
                      >
                        <div className="text-title text-black mb-4">
                          Active Compounds
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {ingredient.detailedInfo.activeCompounds.map(
                            (compound, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 rounded-full text-caption2 text-black transform transition-all duration-300 ease-out"
                                style={{
                                  backgroundColor: `${ingredient.color}20`,
                                  animationDelay: expandedIngredients.has(
                                    ingredient.id
                                  )
                                    ? `${0.3 + idx * 0.1}s`
                                    : "0s",
                                  transform: expandedIngredients.has(
                                    ingredient.id
                                  )
                                    ? "scale(1)"
                                    : "scale(0.8)",
                                  opacity: expandedIngredients.has(
                                    ingredient.id
                                  )
                                    ? 1
                                    : 0,
                                }}
                              >
                                {compound}
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      {/* Suitable Skin Types */}
                      <div
                        className="p-6 rounded-xl bg-surface transform transition-all duration-300 ease-out"
                        style={{
                          animationDelay: expandedIngredients.has(ingredient.id)
                            ? "0.3s"
                            : "0s",
                          transform: expandedIngredients.has(ingredient.id)
                            ? "translateY(0)"
                            : "translateY(-10px)",
                          opacity: expandedIngredients.has(ingredient.id)
                            ? 1
                            : 0,
                        }}
                      >
                        <div className="text-title text-black mb-4">
                          Suitable For
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {ingredient.detailedInfo.skinTypes.map(
                            (skinType, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 rounded-full text-caption2 text-white transform transition-all duration-300 ease-out"
                                style={{
                                  backgroundColor: ingredient.color,
                                  animationDelay: expandedIngredients.has(
                                    ingredient.id
                                  )
                                    ? `${0.4 + idx * 0.1}s`
                                    : "0s",
                                  transform: expandedIngredients.has(
                                    ingredient.id
                                  )
                                    ? "scale(1)"
                                    : "scale(0.8)",
                                  opacity: expandedIngredients.has(
                                    ingredient.id
                                  )
                                    ? 1
                                    : 0,
                                }}
                              >
                                {skinType}
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      {/* Usage Tips */}
                      <div
                        className="p-6 rounded-xl bg-surface transform transition-all duration-300 ease-out"
                        style={{
                          animationDelay: expandedIngredients.has(ingredient.id)
                            ? "0.4s"
                            : "0s",
                          transform: expandedIngredients.has(ingredient.id)
                            ? "translateY(0)"
                            : "translateY(-10px)",
                          opacity: expandedIngredients.has(ingredient.id)
                            ? 1
                            : 0,
                        }}
                      >
                        <div className="text-title text-black mb-4">
                          Usage Tips
                        </div>
                        <div className="space-y-2">
                          {ingredient.detailedInfo.usageTips.map((tip, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3 transform transition-all duration-300 ease-out"
                              style={{
                                animationDelay: expandedIngredients.has(
                                  ingredient.id
                                )
                                  ? `${0.5 + idx * 0.1}s`
                                  : "0s",
                                transform: expandedIngredients.has(
                                  ingredient.id
                                )
                                  ? "translateX(0)"
                                  : "translateX(-20px)",
                                opacity: expandedIngredients.has(ingredient.id)
                                  ? 1
                                  : 0,
                              }}
                            >
                              <div
                                className="w-2 h-2 rounded-full mt-2 flex-shrink-0 transform transition-all duration-300 ease-out"
                                style={{
                                  backgroundColor: ingredient.color,
                                  animationDelay: expandedIngredients.has(
                                    ingredient.id
                                  )
                                    ? `${0.5 + idx * 0.1}s`
                                    : "0s",
                                  transform: expandedIngredients.has(
                                    ingredient.id
                                  )
                                    ? "scale(1)"
                                    : "scale(0)",
                                }}
                              ></div>
                              <div className="caption1 text-black">{tip}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="heading5 text-black mb-4">
            Experience the Power of Nature
          </div>
          <div className="body1 text-secondary mb-8 max-w-xl mx-auto">
            Our products combine these powerful ingredients to deliver
            exceptional results for your skin.
          </div>
          <button
            className="button-main"
            onClick={() => router.push("/product")}
          >
            Explore All Products
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngredientShowcase;
