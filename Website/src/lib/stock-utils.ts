import { ProductType } from "@/type/ProductType";
import { getSizePrice } from "./price-utils";

/**
 * Get the maximum available stock for a product/variant
 * @param product The product object
 * @param selectedSize The selected size/variant name
 * @returns The maximum quantity available (Infinity if tracking is disabled)
 */
export function getMaxStock(
  product: ProductType,
  selectedSize?: string,
): number {
  // If product doesn't track quantity, allow unlimited (or a high number)
  if (product.trackQuantity === false) {
    return 9999;
  }

  // If a specific size is selected, try to find its specific stock
  if (selectedSize) {
    // Use existing utility to find variant/size data
    // getSizePrice returns { price, mrpPrice, quantity? }
    // We strictly look for 'quantity' (which maps to variant.stock in price-utils)
    const sizeData = getSizePrice(product, selectedSize);

    // If sizeData exists and has a defined quantity (variant stock), use it
    if (sizeData && sizeData.quantity !== undefined) {
      return sizeData.quantity;
    }

    // Fallback: If size data found but no quantity on it?
    // In legacy schema, size objects might not have quantity.
    // In new schema, variants have stock.
    // If we can't find specific stock, fall through to global product stock?
    // It's safer to assume global stock if variant stock isn't explicit,
    // OR return 0 if strict. detailed 'Sale.tsx' logic usually checks product.quantity if no variant.
  }

  // Default to global product quantity
  // This handles:
  // 1. Products without variants
  // 2. Variants that don't track individual stock (fallback)
  // 3. Fallback when selectedSize is not provided
  // Note: In Cart context, `product.quantity` is the cart quantity, so we check `product.stock` first.
  return (product as any).stock !== undefined
    ? (product as any).stock
    : product.quantity || 0;
}
