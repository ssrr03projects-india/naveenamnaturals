import { getBackendAssetUrl } from "@/lib/media";
import { ProductType, VariantType } from "@/type/ProductType";

type BackendProduct = Partial<ProductType> & {
  Variants?: unknown;
};

const parseNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const parseJsonField = <T>(field: unknown, defaultValue: T): T => {
  if (field === null || field === undefined) return defaultValue;
  if (typeof field === "string") {
    try {
      return JSON.parse(field) as T;
    } catch {
      return defaultValue;
    }
  }
  return field as T;
};

const normalizeSizes = (product: BackendProduct, variants: VariantType[]): string[] => {
  if (variants.length > 0) {
    return variants.map((variant) => variant.name).filter(Boolean);
  }

  const sizes = product.sizes;
  if (!sizes) return [];

  if (Array.isArray(sizes)) {
    return sizes
      .map((size) =>
        typeof size === "string" ? size : String((size as { size?: string }).size || ""),
      )
      .filter(Boolean);
  }

  if (typeof sizes === "string") {
    try {
      const parsed = JSON.parse(sizes);
      if (Array.isArray(parsed)) {
        return parsed
          .map((size) =>
            typeof size === "string" ? size : String((size as { size?: string }).size || ""),
          )
          .filter(Boolean);
      }
      return [String(parsed)];
    } catch {
      return [sizes];
    }
  }

  return [String(sizes)];
};

const normalizeImages = (imagesField: unknown): string[] => {
  if (!imagesField) return [];

  const parsed = parseJsonField<unknown>(imagesField, imagesField);
  const rawImages = Array.isArray(parsed) ? parsed : [parsed];

  return rawImages
    .map((image) => (typeof image === "string" ? getBackendAssetUrl(image) : null))
    .filter((image): image is string => Boolean(image));
};

export const normalizeProduct = (product: BackendProduct): ProductType => {
  const rawVariants = Array.isArray(product.variants)
    ? product.variants
    : Array.isArray(product.Variants)
      ? product.Variants
      : [];

  const variants: VariantType[] = rawVariants
    .map((variant) => {
      const v = variant as Partial<VariantType> & Record<string, unknown>;
      return {
        id: String(v.id ?? ""),
        productId: String(v.productId ?? product.id ?? ""),
        name: String(v.name ?? ""),
        sku: String(v.sku ?? ""),
        price: parseNumber(v.price),
        mrpPrice: v.mrpPrice !== undefined ? parseNumber(v.mrpPrice) : null,
        gstPercentage:
          v.gstPercentage !== undefined && v.gstPercentage !== null
            ? parseNumber(v.gstPercentage)
            : null,
        stock: parseNumber(v.stock),
        customStock:
          typeof v.customStock === "string" && v.customStock.trim()
            ? v.customStock.trim()
            : null,
        sold: parseNumber(v.sold),
        weight: v.weight ? String(v.weight) : undefined,
        sortOrder: parseNumber(v.sortOrder),
        isActive: v.isActive !== false,
      };
    })
    .filter((variant) => variant.name);

  const variantPrices = variants.map((v) => v.price).filter((price) => price > 0);
  const variantMrpPrices = variants
    .map((v) => (typeof v.mrpPrice === "number" ? v.mrpPrice : 0))
    .filter((price) => price > 0);

  const minPrice =
    variantPrices.length > 0 ? Math.min(...variantPrices) : parseNumber(product.price);
  const maxPrice =
    variantPrices.length > 0 ? Math.max(...variantPrices) : parseNumber(product.price);
  const minMrpPrice =
    variantMrpPrices.length > 0
      ? Math.min(...variantMrpPrices)
      : product.mrpPrice !== undefined
        ? parseNumber(product.mrpPrice)
        : null;

  const totalStock =
    variants.length > 0
      ? variants.reduce((sum, variant) => sum + variant.stock, 0)
      : parseNumber(product.quantity);

  const totalSold =
    variants.length > 0
      ? variants.reduce((sum, variant) => sum + variant.sold, 0)
      : parseNumber(product.sold);

  const saleFromVariants = variants.some(
    (variant) => typeof variant.mrpPrice === "number" && variant.mrpPrice > variant.price,
  );
  const images = normalizeImages(product.images);

  return {
    ...product,
    id: String(product.id ?? ""),
    name: String(product.name ?? ""),
    slug: String(product.slug ?? ""),
    description: String(product.description ?? ""),
    category: String(product.type || product.category || "cosmetic"),
    categoryId:
      typeof product.categoryId === "number"
        ? product.categoryId
        : product.categoryId
          ? parseNumber(product.categoryId, 0)
          : null,
    type: String(product.type || ""),
    price: minPrice,
    originPrice: minMrpPrice || maxPrice || minPrice,
    quantity: totalStock,
    sold: totalSold,
    quantityPurchase: product.quantityPurchase || 1,
    variants,
    sizes: normalizeSizes(product, variants),
    images,
    thumbImage: images,
    keyIngredients: parseJsonField(product.keyIngredients, []),
    benefits: parseJsonField(product.benefits, []),
    usageSteps: parseJsonField(product.usageSteps, []),
    commonQuestions: parseJsonField(product.commonQuestions, []),
    tag: product.tag || (saleFromVariants ? "sale" : ""),
    new: product.tag === "new",
    sale: saleFromVariants || product.tag === "sale",
    rate: parseNumber(product.rate),
    brand: product.brand || "Naveenam Naturals",
    gender: product.gender || "unisex",
    action: "add to cart",
    isActive: product.isActive !== false,
  };
};

export const normalizeProducts = (products: BackendProduct[]): ProductType[] =>
  products.map(normalizeProduct);
