const DEFAULT_FALLBACK_WEIGHT_KG = 0.5;
const DEFAULT_DIMENSION_UNIT = "cm";
const DEFAULT_PACKAGING_WEIGHT_KG = 0.1;
const PER_UNIT_PACKAGING_WEIGHT_KG = 0.03;
const MAX_PACKAGING_WEIGHT_KG = 0.4;
const DEFAULT_FALLBACK_DIMENSIONS_CM = {
  length: 10,
  width: 10,
  height: 10,
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toKg = (value, unit) => {
  if (!Number.isFinite(value) || value <= 0) return null;

  switch (unit) {
    case "kg":
      return value;
    case "g":
      return value / 1000;
    case "mg":
      return value / 1000000;
    case "l":
      return value; // Assume water-equivalent density for liquid variants.
    case "ml":
      return value / 1000;
    default:
      return null;
  }
};

const normalizeUnit = (rawUnit = "") => {
  const unit = String(rawUnit).trim().toLowerCase();
  if (
    ["kg", "kgs", "kilogram", "kilograms"].includes(unit)
  ) {
    return "kg";
  }
  if (
    ["g", "gm", "gms", "gram", "grams"].includes(unit)
  ) {
    return "g";
  }
  if (["mg", "milligram", "milligrams"].includes(unit)) {
    return "mg";
  }
  if (
    ["l", "lt", "ltr", "liter", "liters", "litre", "litres"].includes(unit)
  ) {
    return "l";
  }
  if (
    ["ml", "milliliter", "milliliters", "millilitre", "millilitres"].includes(
      unit,
    )
  ) {
    return "ml";
  }
  return "";
};

const parseWeightToKg = (rawValue, { defaultUnit = null } = {}) => {
  if (rawValue === null || rawValue === undefined) return null;

  if (typeof rawValue === "number") {
    if (!Number.isFinite(rawValue) || rawValue <= 0) return null;
    const normalizedDefaultUnit = normalizeUnit(defaultUnit || "");
    if (normalizedDefaultUnit) {
      return toKg(rawValue, normalizedDefaultUnit);
    }
    return rawValue;
  }

  const text = String(rawValue).trim().toLowerCase().replace(/,/g, "");
  if (!text) return null;

  const unitPattern =
    "(kg|kgs?|kilograms?|g|gm|gms|grams?|mg|milligrams?|ml|millilit(?:er|re)s?|l|lt|ltr|lit(?:er|re)s?)";

  const quantityFirstRegex = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*(?:x|\\*)\\s*(\\d+(?:\\.\\d+)?)\\s*${unitPattern}\\b`,
    "i",
  );
  const unitFirstRegex = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*${unitPattern}\\s*(?:x|\\*)\\s*(\\d+(?:\\.\\d+)?)\\b`,
    "i",
  );
  const simpleRegex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unitPattern}\\b`, "i");

  const quantityFirstMatch = text.match(quantityFirstRegex);
  if (quantityFirstMatch) {
    const packCount = Number(quantityFirstMatch[1]);
    const perUnitValue = Number(quantityFirstMatch[2]);
    const unit = normalizeUnit(quantityFirstMatch[3]);
    return toKg(packCount * perUnitValue, unit);
  }

  const unitFirstMatch = text.match(unitFirstRegex);
  if (unitFirstMatch) {
    const perUnitValue = Number(unitFirstMatch[1]);
    const unit = normalizeUnit(unitFirstMatch[2]);
    const packCount = Number(unitFirstMatch[3]);
    return toKg(packCount * perUnitValue, unit);
  }

  const simpleMatch = text.match(simpleRegex);
  if (simpleMatch) {
    const value = Number(simpleMatch[1]);
    const unit = normalizeUnit(simpleMatch[2]);
    return toKg(value, unit);
  }

  const numericValue = toFiniteNumber(text);
  if (numericValue && numericValue > 0) {
    const normalizedDefaultUnit = normalizeUnit(defaultUnit || "");
    if (normalizedDefaultUnit) {
      return toKg(numericValue, normalizedDefaultUnit);
    }
    return numericValue;
  }

  return null;
};

const parseProductSnapshot = (snapshot) => {
  if (!snapshot) return {};
  if (typeof snapshot === "string") {
    try {
      return JSON.parse(snapshot);
    } catch {
      return {};
    }
  }
  return snapshot;
};

const calculatePackagingBufferKg = (itemCount = 0) => {
  const normalizedCount = Math.max(0, Number(itemCount) || 0);
  if (normalizedCount <= 0) return DEFAULT_PACKAGING_WEIGHT_KG;

  return Math.min(
    MAX_PACKAGING_WEIGHT_KG,
    Number(
      (
        DEFAULT_PACKAGING_WEIGHT_KG +
        normalizedCount * PER_UNIT_PACKAGING_WEIGHT_KG
      ).toFixed(3),
    ),
  );
};

const resolveItemWeightValue = (item) => {
  const snapshot = parseProductSnapshot(item?.productSnapshot);
  const candidates = [
    item?.variant?.weight,
    item?.variant?.name,
    snapshot?.selectedSize,
    snapshot?.variantName,
  ];
  return candidates.find((value) => value !== null && value !== undefined && `${value}`.trim());
};

const normalizeDimensions = (source) => {
  if (!source || typeof source !== "object") return null;

  const length = toFiniteNumber(source.length);
  const width = toFiniteNumber(source.width);
  const height = toFiniteNumber(source.height);

  if (
    Number.isFinite(length) &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    length > 0 &&
    width > 0 &&
    height > 0
  ) {
    return { length, width, height };
  }

  return null;
};

const resolveItemDimensions = (item) => {
  const snapshot = parseProductSnapshot(item?.productSnapshot);
  const candidates = [item?.variant, snapshot, item?.product];

  for (const candidate of candidates) {
    const dimensions = normalizeDimensions(candidate);
    if (dimensions) return dimensions;
  }

  return null;
};

const formatWeightForPayload = (weightKg) => {
  const normalized = Number.isFinite(weightKg) && weightKg > 0 ? weightKg : DEFAULT_FALLBACK_WEIGHT_KG;
  return normalized.toFixed(3).replace(/\.?0+$/, "");
};

const formatDimensionForPayload = (value, fallback) => {
  const normalized =
    Number.isFinite(value) && value > 0 ? Number(value) : Number(fallback);
  return normalized.toFixed(1).replace(/\.0$/, "");
};

const calculateShipmentWeightFromOrderItems = (
  items = [],
  { fallbackWeightKg = DEFAULT_FALLBACK_WEIGHT_KG } = {},
) => {
  const orderItems = Array.isArray(items) ? items : [];
  let totalWeightKg = 0;
  let weightedItems = 0;
  let totalQuantity = 0;

  for (const item of orderItems) {
    const quantity = Math.max(0, Number(item?.quantity) || 0);
    if (quantity <= 0) continue;
    totalQuantity += quantity;

    const rawWeightValue = resolveItemWeightValue(item);
    const perUnitWeightKg = parseWeightToKg(rawWeightValue, {
      defaultUnit: "g",
    });

    if (Number.isFinite(perUnitWeightKg) && perUnitWeightKg > 0) {
      totalWeightKg += perUnitWeightKg * quantity;
      weightedItems += 1;
    }
  }

  const packagingBufferKg = calculatePackagingBufferKg(totalQuantity);

  if (weightedItems === 0 || totalWeightKg <= 0) {
    return {
      weightKg: Math.max(
        fallbackWeightKg,
        Number((fallbackWeightKg + packagingBufferKg).toFixed(3)),
      ),
      rawWeightKg: fallbackWeightKg,
      packagingBufferKg,
      weightedItems: 0,
      totalQuantity,
      usedFallback: true,
    };
  }

  return {
    rawWeightKg: Number(totalWeightKg.toFixed(3)),
    packagingBufferKg,
    weightKg: Number((totalWeightKg + packagingBufferKg).toFixed(3)),
    weightedItems,
    totalQuantity,
    usedFallback: false,
  };
};

const calculateShipmentDimensionsFromOrderItems = (
  items = [],
  { fallbackWeightKg = DEFAULT_FALLBACK_WEIGHT_KG } = {},
) => {
  const orderItems = Array.isArray(items) ? items : [];
  let totalVolume = 0;
  let maxLength = 0;
  let maxWidth = 0;
  let maxHeight = 0;
  let totalQuantity = 0;
  let measuredItems = 0;

  for (const item of orderItems) {
    const quantity = Math.max(0, Number(item?.quantity) || 0);
    if (quantity <= 0) continue;
    totalQuantity += quantity;

    const unitDimensions = resolveItemDimensions(item);
    if (!unitDimensions) continue;

    measuredItems += 1;
    const unitVolume =
      unitDimensions.length * unitDimensions.width * unitDimensions.height;
    totalVolume += unitVolume * quantity;
    maxLength = Math.max(maxLength, unitDimensions.length);
    maxWidth = Math.max(maxWidth, unitDimensions.width);
    maxHeight = Math.max(maxHeight, unitDimensions.height);
  }

  if (measuredItems === 0 || totalVolume <= 0) {
    return {
      ...DEFAULT_FALLBACK_DIMENSIONS_CM,
      dimensionUnit: DEFAULT_DIMENSION_UNIT,
      measuredItems: 0,
      usedFallback: true,
    };
  }

  const growthFactor = Math.max(0, totalQuantity - 1);
  const length = Math.max(
    maxLength,
    Number((maxLength + Math.min(8, growthFactor * 1.5)).toFixed(1)),
  );
  const width = Math.max(
    maxWidth,
    Number((maxWidth + Math.min(8, growthFactor * 1.2)).toFixed(1)),
  );
  const height = Math.max(
    maxHeight,
    Number((totalVolume / Math.max(length * width, 1)).toFixed(1)),
  );

  return {
    length,
    width,
    height: Number((height * 1.1).toFixed(1)),
    dimensionUnit: DEFAULT_DIMENSION_UNIT,
    measuredItems,
    usedFallback: false,
  };
};

module.exports = {
  DEFAULT_DIMENSION_UNIT,
  DEFAULT_FALLBACK_DIMENSIONS_CM,
  DEFAULT_FALLBACK_WEIGHT_KG,
  parseWeightToKg,
  formatWeightForPayload,
  formatDimensionForPayload,
  calculateShipmentWeightFromOrderItems,
  calculateShipmentDimensionsFromOrderItems,
};
