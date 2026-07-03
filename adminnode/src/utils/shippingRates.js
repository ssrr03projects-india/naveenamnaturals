/**
 * Shipping Rate Card
 * Service: Ecommerce Ground Express - 7D
 *
 * Logic based on provided rate card:
 * 1. Up to 500gm (0.5kg) -> Base Price
 * 2. Additional 500gm (up to 5kg) -> Add price per 500gm slab
 * 3. > 5kg -> Apply base cost for 5kg + Additional Per KG price for weight > 5kg
 */

const RATE_CARD = {
  city: {
    base: 42, // 500gm
    add500: 20, // Additional 500gm
    add1kg: 40, // Additional Per KG > 5kg
  },
  region: {
    base: 55,
    add500: 25,
    add1kg: 45,
  },
  zone: {
    base: 60,
    add500: 30,
    add1kg: 50,
  },
  metro: {
    base: 70,
    add500: 45,
    add1kg: 65,
  },
  roi_a: {
    base: 85,
    add500: 50,
    add1kg: 70,
  },
  roi_b: {
    base: 90,
    add500: 50,
    add1kg: 75,
  },
  spl_dest: {
    base: 95,
    add500: 65,
    add1kg: 80,
  },
};

/**
 * Normalizes zone string from API to match rate card keys
 * @param {string} zoneFromApi
 * @returns {string} normalized key or default 'zone'
 */
const normalizeZone = (zoneFromApi) => {
  if (!zoneFromApi) return "roi_a"; // Default fallback if no zone found

  const z = zoneFromApi.toLowerCase().trim();

  if (z.includes("city")) return "city";
  if (z.includes("region")) return "region";
  if (z.includes("metro")) return "metro";
  if (z.includes("roi-a") || z.includes("roi a") || z === "a") return "roi_a";
  if (z.includes("roi-b") || z.includes("roi b") || z === "b") return "roi_b";
  if (z.includes("spl") || z.includes("special")) return "spl_dest";

  // Default to general 'zone' rates if it matches "zone" or unknown
  return "zone";
};

/**
 * Calculates shipping cost
 * @param {string} type - Zone type (City, Region, etc.)
 * @param {number} weightKg - Weight in KGs
 * @returns {object} { price, breakdown }
 */
const calculateShippingRate = (zoneInput, weightKg = 0.5) => {
  const zoneKey = normalizeZone(zoneInput);
  const rates = RATE_CARD[zoneKey] || RATE_CARD["roi_a"];

  let price = 0;
  let breakdown = "";

  // Ensure minimum weight logic if needed, but usually 0.5 is the step.
  if (weightKg <= 0.5) {
    price = rates.base;
    breakdown = `Base (0.5kg): ₹${rates.base}`;
  } else if (weightKg <= 5.0) {
    // Base first
    price = rates.base;

    // Remaining weight
    const remaining = weightKg - 0.5;
    // Count of 500g slabs (Ceil)
    const slabs = Math.ceil(remaining / 0.5);

    price += slabs * rates.add500;
    breakdown = `Base (0.5kg): ₹${rates.base} + ${slabs} x 500g slab (₹${rates.add500})`;
  } else {
    // Weight > 5kg
    // First 5kg calculation:
    // 0.5 (Base) + 4.5 (9 slabs of 0.5)
    // 5kg Price = Base + 9 * Add500
    const price5kg = rates.base + 9 * rates.add500;

    // Remaining weight > 5kg
    const remaining = weightKg - 5.0;
    // Count of 1kg slabs (Ceil) - "Additional Per KG"
    const slabs = Math.ceil(remaining);

    price = price5kg + slabs * rates.add1kg;
    breakdown = `5kg Price: ₹${price5kg} + ${slabs} x 1kg slab (₹${rates.add1kg})`;
  }

  return {
    zone: zoneKey,
    weight: weightKg,
    price: parseFloat(price.toFixed(2)),
    breakdown,
  };
};

module.exports = {
  calculateShippingRate,
  RATE_CARD,
};
