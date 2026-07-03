import { ProductType } from "@/type/ProductType";

/**
 * Helper functions for handling product pricing with size variants
 */

const parseFiniteNumber = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return null;
};

const getProductLevelGstRate = (product: ProductType): number => {
    const productGst = parseFiniteNumber(product.gstPercentage);
    if (productGst !== null && productGst > 0) {
        return productGst;
    }

    if (product.variants && Array.isArray(product.variants)) {
        for (const variant of product.variants) {
            const variantGst = parseFiniteNumber(variant.gstPercentage);
            if (variantGst !== null && variantGst > 0) {
                return variantGst;
            }
        }
    }

    return 0;
};

export function calculateGstInclusivePrice(price: unknown, gstPercentage?: unknown): number {
    const basePrice = parseFiniteNumber(price);
    if (basePrice === null || basePrice <= 0) {
        return 0;
    }

    const gstRate = parseFiniteNumber(gstPercentage) ?? 0;
    if (gstRate <= 0) {
        return basePrice;
    }

    return basePrice + (basePrice * gstRate) / 100;
}

export function getProductBasePriceRange(product: ProductType): { min: number; max: number } | null {
    // 1. Try to get price from variants (NEW Schema)
    if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        const prices = product.variants
            .map(v => parseFiniteNumber(v.price) ?? 0)
            .filter(p => !isNaN(p) && p > 0);

        if (prices.length > 0) {
            return {
                min: Math.min(...prices),
                max: Math.max(...prices),
            };
        }
    }

    // 2. Try to get price from sizes (LEGACY Schema - Array of objects)
    if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
        const firstSize = product.sizes[0];
        if (typeof firstSize === 'object' && firstSize !== null && 'price' in firstSize) {
            const prices: number[] = [];
            for (const size of product.sizes) {
                if (typeof size === 'object' && 'price' in size) {
                    const price = parseFiniteNumber(size.price) ?? 0;
                    if (!isNaN(price) && price > 0) {
                        prices.push(price);
                    }
                }
            }
            if (prices.length > 0) {
                return {
                    min: Math.min(...prices),
                    max: Math.max(...prices),
                };
            }
        }
    }

    if (product.price && product.price > 0) {
        return {
            min: product.price,
            max: product.price,
        };
    }

    return null;
}

/**
 * Get price range from product variants or sizes
 * @param product Product with variants/size pricing
 * @returns Object with min and max prices, or null if no valid prices
 */
export function getProductPriceRange(product: ProductType): { min: number; max: number } | null {
    const productLevelGstRate = getProductLevelGstRate(product);

    // 1. Try to get price from variants (NEW Schema)
    if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        const prices = product.variants
            .map(v => calculateGstInclusivePrice(v.price, v.gstPercentage))
            .filter(p => !isNaN(p) && p > 0);

        if (prices.length > 0) {
            return {
                min: Math.min(...prices),
                max: Math.max(...prices),
            };
        }
    }

    // 2. Try to get price from sizes (LEGACY Schema - Array of objects)
    // Note: normalizeProduct converts sizes to string[], so this might not work if normalization happened
    // unless the raw product data still has object sizes, but typescript types say string | object[]
    if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
        // Check if the first item is an object with price
        const firstSize = product.sizes[0];
        if (typeof firstSize === 'object' && firstSize !== null && 'price' in firstSize) {
            const prices: number[] = [];
            for (const size of product.sizes) {
                if (typeof size === 'object' && 'price' in size) {
                    const price = calculateGstInclusivePrice(size.price, productLevelGstRate);
                    if (!isNaN(price) && price > 0) {
                        prices.push(price);
                    }
                }
            }
            if (prices.length > 0) {
                return {
                    min: Math.min(...prices),
                    max: Math.max(...prices),
                };
            }
        }
    }

    // 3. Fallback to product level price
    // normalizeProduct puts minPrice into product.price
    if (product.price && product.price > 0) {
        const displayPrice = calculateGstInclusivePrice(product.price, productLevelGstRate);
        return {
            min: displayPrice,
            max: displayPrice
        };
    }

    return null;
}

/**
 * Format price display for product listing
 * @param product Product with size pricing
 * @returns Formatted price string (e.g., "₹299" or "₹299 - ₹899")
 */
export function formatProductPrice(product: ProductType): string {
    const priceRange = getProductPriceRange(product);

    if (!priceRange) {
        // Last resort: check if product has a single price field that is valid
        if (product.price && product.price > 0) {
            return `₹${product.price.toFixed(0)}`;
        }
        return "Price not available";
    }

    if (priceRange.min === priceRange.max) {
        return `₹${priceRange.min.toFixed(0)}`;
    }

    return `₹${priceRange.min.toFixed(0)} - ₹${priceRange.max.toFixed(0)}`;
}

export function formatProductBasePrice(product: ProductType): string {
    const priceRange = getProductBasePriceRange(product);

    if (!priceRange) {
        if (product.price && product.price > 0) {
            return `₹${product.price.toFixed(0)}`;
        }
        return "Price not available";
    }

    if (priceRange.min === priceRange.max) {
        return `₹${priceRange.min.toFixed(0)}`;
    }

    return `₹${priceRange.min.toFixed(0)} - ₹${priceRange.max.toFixed(0)}`;
}

export function formatProductMrpPrice(product: ProductType): string | null {
    const mrpRange = getProductMRPRange(product);

    if (!mrpRange) {
        return null;
    }

    if (mrpRange.min === mrpRange.max) {
        return `₹${mrpRange.min.toFixed(0)}`;
    }

    return `₹${mrpRange.min.toFixed(0)} - ₹${mrpRange.max.toFixed(0)}`;
}

/**
 * Get MRP price range from product variants or sizes
 * @param product Product with variants/size pricing
 * @returns Object with min and max MRP prices, or null if no valid MRP prices
 */
export function getProductMRPRange(product: ProductType): { min: number; max: number } | null {
    const productLevelGstRate = getProductLevelGstRate(product);

    // 1. Try variants
    if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        const mrpPrices = product.variants
            .filter(v => v.mrpPrice)
            .map(v => calculateGstInclusivePrice(v.mrpPrice, v.gstPercentage))
            .filter(p => p !== null && !isNaN(p as number) && (p as number) > 0) as number[];

        if (mrpPrices.length > 0) {
            return {
                min: Math.min(...mrpPrices),
                max: Math.max(...mrpPrices),
            };
        }
    }

    // 2. Try sizes
    if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
        const firstSize = product.sizes[0];
        if (typeof firstSize === 'object' && firstSize !== null && 'mrpPrice' in firstSize) {
            const mrpPrices: number[] = [];
            for (const size of product.sizes) {
                if (typeof size === 'object' && 'mrpPrice' in size && size.mrpPrice) {
                    const price = calculateGstInclusivePrice(size.mrpPrice, productLevelGstRate);
                    if (!isNaN(price) && price > 0) {
                        mrpPrices.push(price);
                    }
                }
            }
            if (mrpPrices.length > 0) {
                return {
                    min: Math.min(...mrpPrices),
                    max: Math.max(...mrpPrices),
                };
            }
        }
    }

    // 3. Fallback to product level MRP
    if (product.mrpPrice && product.mrpPrice > 0) {
        const displayMrpPrice = calculateGstInclusivePrice(product.mrpPrice, productLevelGstRate);
        return {
            min: displayMrpPrice,
            max: displayMrpPrice
        };
    }

    if (product.originPrice && product.originPrice > 0) {
        const displayOriginPrice = calculateGstInclusivePrice(product.originPrice, productLevelGstRate);
        return {
            min: displayOriginPrice,
            max: displayOriginPrice
        };
    }

    return null;
}

/**
 * Calculate discount percentage for product
 * @param product Product with variants/size pricing
 * @returns Maximum discount percentage across all variants/sizes
 */
export function getProductMaxDiscount(product: ProductType): number {
    let maxDiscount = 0;

    // 1. Try variants
    if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        for (const variant of product.variants) {
            if (variant.price && variant.mrpPrice) {
                const price = typeof variant.price === 'number' ? variant.price : parseFloat(variant.price as any);
                const mrpPrice = typeof variant.mrpPrice === 'number' ? variant.mrpPrice : parseFloat(variant.mrpPrice as any);

                if (!isNaN(price) && !isNaN(mrpPrice) && mrpPrice > price && mrpPrice > 0) {
                    const discount = Math.floor(100 - (price / mrpPrice) * 100);
                    maxDiscount = Math.max(maxDiscount, discount);
                }
            }
        }
        if (maxDiscount > 0) return maxDiscount;
    }

    // 2. Try sizes
    if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
        const firstSize = product.sizes[0];
        if (typeof firstSize === 'object' && firstSize !== null) {
            for (const size of product.sizes) {
                if (typeof size === 'object' && 'price' in size && 'mrpPrice' in size && size.mrpPrice) {
                    const price = typeof size.price === 'number' ? size.price : parseFloat(size.price as any);
                    const mrpPrice = typeof size.mrpPrice === 'number' ? size.mrpPrice : parseFloat(size.mrpPrice as any);

                    if (!isNaN(price) && !isNaN(mrpPrice) && mrpPrice > price && mrpPrice > 0) {
                        const discount = Math.floor(100 - (price / mrpPrice) * 100);
                        maxDiscount = Math.max(maxDiscount, discount);
                    }
                }
            }
        }
    }

    // 3. Fallback to product level discount
    // If product has discount field already calculated
    if (product.discount && product.discount > 0) {
        return product.discount;
    }

    // Calculate from flat price/MRP
    if (product.price && product.mrpPrice && product.mrpPrice > product.price) {
        return Math.floor(100 - (product.price / product.mrpPrice) * 100);
    }

    return maxDiscount;
}

/**
 * Get minimum price for sorting/filtering
 * @param product Product with size pricing
 * @returns Minimum price or 0 if not available
 */
export function getProductMinPrice(product: ProductType): number {
    const priceRange = getProductPriceRange(product);
    return priceRange ? priceRange.min : 0;
}

export function getProductMinBasePrice(product: ProductType): number {
    const priceRange = getProductBasePriceRange(product);
    return priceRange ? priceRange.min : 0;
}

/**
 * Get price and MRP for a specific size (variant)
 * @param product Product with variants/size pricing
 * @param selectedSize The size name to get price for
 * @returns Object with price and mrpPrice, or null if size not found
 */
export function getSizePrice(
    product: ProductType,
    selectedSize: string
): { price: number; mrpPrice?: number | null; quantity?: number } | null {
    if (!selectedSize) {
        return null;
    }

    // 1. Try variants (match by name)
    if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        const variant = product.variants.find(v => v.name === selectedSize);
        if (variant) {
            const price = typeof variant.price === 'number' ? variant.price : parseFloat(variant.price as any);
            const mrpPrice = variant.mrpPrice
                ? (typeof variant.mrpPrice === 'number' ? variant.mrpPrice : parseFloat(variant.mrpPrice as any))
                : null;

            if (!isNaN(price) && price > 0) {
                return {
                    price,
                    mrpPrice,
                    quantity: variant.stock
                };
            }
        }
    }

    // 2. Try sizes
    if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
        // Check if objects
        const firstSize = product.sizes[0];
        if (typeof firstSize === 'object' && firstSize !== null && 'size' in firstSize) {
            const sizeData = (product.sizes as any[]).find(s => s.size === selectedSize);

            if (sizeData) {
                const price = typeof sizeData.price === 'number' ? sizeData.price : parseFloat(sizeData.price);
                const mrpPrice = sizeData.mrpPrice
                    ? typeof sizeData.mrpPrice === 'number'
                        ? sizeData.mrpPrice
                        : parseFloat(sizeData.mrpPrice)
                    : null;
                const quantity = sizeData.quantity !== undefined ? sizeData.quantity : undefined;

                if (!isNaN(price) && price > 0) {
                    return { price, mrpPrice, quantity };
                }
            }
        }
    }

    return null;
}
