import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ProductType, VariantType } from "@/type/ProductType";
import { getProductMinBasePrice, getSizePrice } from "@/lib/price-utils";
import { getMaxStock } from "@/lib/stock-utils";

const CART_STORAGE_KEY = "nn_cart";

export interface CartItem extends ProductType {
  cartId: string; // Unique ID for cart item (id + size)
  quantity: number;
  stock?: number; // Original product stock saved during add
  price: number; // Selected size's price (updated from product data)
  mrpPrice?: number | null; // Selected size's MRP (updated from product data)
  selectedSize: string;
  lastUpdated: number; // Timestamp of last product data sync
}

interface CartState {
  items: CartItem[];
  isInitialized: boolean;
}

const normalizeSelectedSize = (value?: string | null): string => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
};

const normalizeSizeComparisonKey = (value?: string | null): string =>
  normalizeSelectedSize(value).toLowerCase();

const resolveVariantForCart = (
  product: ProductType,
  selectedSize: string,
): VariantType | undefined => {
  const variants = product.variants;
  if (!Array.isArray(variants) || variants.length === 0) {
    return undefined;
  }

  if (product.variantId !== undefined && product.variantId !== null) {
    const byId = variants.find(
      (variant) => String(variant.id) === String(product.variantId),
    );
    if (byId) return byId;
  }

  const selectedKey = normalizeSizeComparisonKey(selectedSize);
  if (selectedKey) {
    const bySize = variants.find((variant) => {
      const nameKey = normalizeSizeComparisonKey(variant.name);
      const weightKey = normalizeSizeComparisonKey(variant.weight);
      return nameKey === selectedKey || (weightKey && weightKey === selectedKey);
    });
    if (bySize) return bySize;
    return undefined;
  }

  return variants[0];
};

const resolveCartSelection = (product: ProductType) => {
  const selectedSize = normalizeSelectedSize(product.selectedSize);
  const matchedVariant = resolveVariantForCart(product, selectedSize);
  const pricingSize =
    selectedSize ||
    normalizeSelectedSize(matchedVariant?.name) ||
    normalizeSelectedSize(matchedVariant?.weight);

  return {
    selectedSize,
    pricingSize,
    variantId: matchedVariant?.id ?? product.variantId,
    cartId: `${product.id}-${selectedSize}`,
  };
};

const findExistingCartItemIndex = (
  items: CartItem[],
  product: ProductType,
  selectedSize: string,
  variantId?: string | number,
): number => {
  const cartId = `${product.id}-${selectedSize}`;
  let index = items.findIndex((item) => item.cartId === cartId);
  if (index >= 0) return index;

  const productId = String(product.id);

  if (variantId !== undefined && variantId !== null) {
    index = items.findIndex(
      (item) =>
        String(item.id) === productId &&
        item.variantId !== undefined &&
        item.variantId !== null &&
        String(item.variantId) === String(variantId),
    );
    if (index >= 0) return index;
  }

  const selectedKey = normalizeSizeComparisonKey(selectedSize);
  if (selectedKey) {
    index = items.findIndex(
      (item) =>
        String(item.id) === productId &&
        normalizeSizeComparisonKey(item.selectedSize) === selectedKey,
    );
    if (index >= 0) return index;
  }

  // Backward compatibility: merge legacy entries where selectedSize was saved as empty.
  if (selectedKey && variantId !== undefined && variantId !== null) {
    index = items.findIndex(
      (item) =>
        String(item.id) === productId &&
        !normalizeSelectedSize(item.selectedSize) &&
        (item.variantId === undefined || item.variantId === null),
    );
    if (index >= 0) return index;
  }

  return -1;
};

// Load cart from localStorage
const loadCartFromStorage = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    const normalizedItems: CartItem[] = parsed.map((item) => {
      const selectedSize = normalizeSelectedSize(item.selectedSize);
      const normalizedCartId = `${item.id}-${selectedSize}`;
      return {
        ...item,
        quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
        selectedSize,
        gstPercentage:
          item.gstPercentage !== undefined && item.gstPercentage !== null
            ? Number(item.gstPercentage)
            : null,
        cartId: normalizedCartId,
        lastUpdated: item.lastUpdated || Date.now(),
      };
    });

    const mergedByCartId = new Map<string, CartItem>();
    normalizedItems.forEach((item) => {
      const mergeKey =
        item.variantId !== undefined && item.variantId !== null
          ? `${item.id}-variant-${item.variantId}`
          : item.cartId;
      const existing = mergedByCartId.get(mergeKey);
      if (!existing) {
        mergedByCartId.set(mergeKey, item);
        return;
      }
      const mergedSelectedSize = existing.selectedSize || item.selectedSize;

      mergedByCartId.set(mergeKey, {
        ...existing,
        ...item,
        quantity: existing.quantity + item.quantity,
        selectedSize: mergedSelectedSize,
        cartId: `${existing.id}-${mergedSelectedSize}`,
        variantId: existing.variantId ?? item.variantId,
        lastUpdated: Math.max(existing.lastUpdated, item.lastUpdated),
      });
    });

    return Array.from(mergedByCartId.values());
  } catch {
    return [];
  }
};

// Save cart to localStorage
const saveCartToStorage = (items: CartItem[]) => {
  if (typeof window === "undefined") return;
  try {
    // Only save non-sensitive product data
    const safeItems = items.map(
      ({
        cartId,
        id,
        quantity,
        stock,
        selectedSize,
        price,
        mrpPrice,
        gstPercentage,
        lastUpdated,
        variantId,
      }) => ({
        cartId,
        id,
        quantity,
        stock,
        selectedSize,
        price,
        mrpPrice,
        gstPercentage,
        lastUpdated,
        variantId,
      }),
    );
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(safeItems));
  } catch {
    // Ignore storage errors
  }
};

const resolveCartItemGstPercentage = (
  product: ProductType,
  selectedSize: string,
  variantId?: string | number,
  fallback?: number | null,
): number | null => {
  const selectedKey = normalizeSizeComparisonKey(selectedSize);
  const matchedVariant = product.variants?.find((variant) => {
    if (variantId !== undefined && variantId !== null) {
      return String(variant.id) === String(variantId);
    }
    if (!selectedKey) return false;
    return (
      normalizeSizeComparisonKey(variant.name) === selectedKey ||
      normalizeSizeComparisonKey(variant.weight) === selectedKey
    );
  });

  const rawGst = matchedVariant?.gstPercentage ?? fallback;
  if (rawGst === undefined || rawGst === null) return null;
  const parsed = Number(rawGst);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

// Helper to sync cart item with latest product data
const syncCartItemWithProduct = (
  cartItem: CartItem,
  product: ProductType,
): CartItem => {
  // Get current price for selected size - always use latest from product
  const sizePrice = getSizePrice(product, cartItem.selectedSize);

  // Always use the price from product data, never fall back to old cart price
  // This ensures prices update when they change
  let price: number;
  let mrpPrice: number | null | undefined;
  const gstPercentage = resolveCartItemGstPercentage(
    product,
    cartItem.selectedSize,
    cartItem.variantId,
    cartItem.gstPercentage,
  );

  if (sizePrice) {
    price = sizePrice.price;
    mrpPrice = sizePrice.mrpPrice ?? null;
  } else {
    // If size not found, use minimum price as fallback
    price = getProductMinBasePrice(product) || cartItem.price || 0;
    mrpPrice = cartItem.mrpPrice ?? null;
  }

  return {
    ...product, // Update all product fields (name, images, description, etc.)
    cartId: cartItem.cartId,
    stock: product.quantity, // Ensure updated stock is preserved
    quantity: cartItem.quantity,
    selectedSize: cartItem.selectedSize,
    price, // Always updated price from product data
    mrpPrice, // Always updated MRP from product data
    gstPercentage,
    lastUpdated: Date.now(),
  };
};

// Helper to check if product is still available
const isProductAvailable = (
  product: ProductType | null,
  selectedSize: string,
): boolean => {
  if (!product) return false;
  if (!product.isActive) return false;

  // Check stock for selected size
  if (product.trackQuantity) {
    const sizeData = getSizePrice(product, selectedSize);
    if (sizeData && sizeData.quantity !== undefined) {
      return sizeData.quantity > 0;
    }
    return (product.quantity || 0) > 0;
  }

  return true;
};

const initialState: CartState = {
  // Keep SSR and first client render identical; hydrate from storage in initializeCart().
  items: [],
  isInitialized: false,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    initializeCart: (state) => {
      if (!state.isInitialized) {
        state.items = loadCartFromStorage();
        state.isInitialized = true;
      }
    },
    addToCart: (state, action: PayloadAction<ProductType>) => {
      const product = action.payload;
      const { selectedSize, pricingSize, variantId, cartId } =
        resolveCartSelection(product);

      const existingIndex = findExistingCartItemIndex(
        state.items,
        product,
        selectedSize,
        variantId,
      );

      if (existingIndex >= 0) {
        const existingItem = state.items[existingIndex];
        const effectiveSelectedSize =
          normalizeSelectedSize(existingItem.selectedSize) || selectedSize;
        const effectivePricingSize = pricingSize || effectiveSelectedSize;
        const effectiveCartId = `${product.id}-${effectiveSelectedSize}`;

        // Check stock before updating
        const currentQty = existingItem.quantity;
        const maxStock = getMaxStock(product, effectivePricingSize);

        if (currentQty + 1 > maxStock) {
          // Optionally toast here if we had access to it, or just return/clamp
          // For Redux, we just don't update if max reached
          return;
        }

        // Update quantity and sync with latest product data
        const sizePrice = getSizePrice(product, effectivePricingSize);
        state.items[existingIndex] = {
          ...product,
          cartId: effectiveCartId,
          stock: product.quantity, // Save global stock
          quantity: existingItem.quantity + 1,
          selectedSize: effectiveSelectedSize,
          variantId: variantId ?? existingItem.variantId,
          price:
            sizePrice?.price ||
            existingItem.price ||
            getProductMinBasePrice(product),
          mrpPrice: sizePrice?.mrpPrice ?? existingItem.mrpPrice ?? null,
          gstPercentage: resolveCartItemGstPercentage(
            product,
            effectivePricingSize || effectiveSelectedSize,
            variantId ?? existingItem.variantId,
            existingItem.gstPercentage,
          ),
          lastUpdated: Date.now(),
        };
      } else {
        // Check stock before adding new item
        const maxStock = getMaxStock(product, pricingSize || selectedSize);
        if (1 > maxStock) {
          return; // Out of stock
        }

        // Add new item
        const sizePrice = getSizePrice(product, pricingSize || selectedSize);
        state.items.push({
          ...product,
          cartId,
          stock: product.quantity, // Save global stock
          quantity: 1,
          selectedSize,
          variantId,
          price: sizePrice?.price || getProductMinBasePrice(product),
          mrpPrice: sizePrice?.mrpPrice ?? null,
          gstPercentage: resolveCartItemGstPercentage(
            product,
            pricingSize || selectedSize,
            variantId,
            product.gstPercentage,
          ),
          lastUpdated: Date.now(),
        });
      }

      saveCartToStorage(state.items);
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(
        (item) => item.cartId !== action.payload,
      );
      saveCartToStorage(state.items);
    },
    updateCartItem: (
      state,
      action: PayloadAction<{
        cartId: string;
        quantity: number;
        selectedSize?: string;
      }>,
    ) => {
      const { cartId, quantity, selectedSize } = action.payload;
      const normalizedSelectedSize = normalizeSelectedSize(selectedSize);
      const selectedSizeKey = normalizeSizeComparisonKey(normalizedSelectedSize);
      const productIdFromCartKey = String(cartId).split("-")[0];

      const itemIndex = state.items.findIndex((item) => item.cartId === cartId);
      const fallbackIndex =
        itemIndex >= 0
          ? itemIndex
          : state.items.findIndex(
              (item) => {
                if (
                  String(item.id) !== String(cartId) &&
                  String(item.id) !== productIdFromCartKey
                ) {
                  return false;
                }

                if (!selectedSizeKey) {
                  return true;
                }

                if (
                  normalizeSizeComparisonKey(item.selectedSize) ===
                  selectedSizeKey
                ) {
                  return true;
                }

                if (
                  item.variantId !== undefined &&
                  item.variantId !== null &&
                  Array.isArray(item.variants)
                ) {
                  const activeVariant = item.variants.find(
                    (variant) =>
                      String(variant.id) === String(item.variantId),
                  );
                  if (!activeVariant) return false;

                  return (
                    normalizeSizeComparisonKey(activeVariant.name) ===
                      selectedSizeKey ||
                    normalizeSizeComparisonKey(activeVariant.weight) ===
                      selectedSizeKey
                  );
                }

                return false;
              },
            );

      if (fallbackIndex >= 0) {
        const item = state.items[fallbackIndex];
        const product = { ...item };

        // If size changed, update price
        if (
          normalizedSelectedSize &&
          normalizeSizeComparisonKey(normalizedSelectedSize) !==
            normalizeSizeComparisonKey(item.selectedSize)
        ) {
          const maxStock = getMaxStock(product, normalizedSelectedSize);
          if (quantity > maxStock) {
            // Clamp to max stock
            // quantity = maxStock; // Or just return to prevent update?
            // Better to just limit it
            // actually let's just use the requested quantity but cap it if strictly needed,
            // or return if invalid. returning is safer.
            if (quantity > maxStock) return;
          }

          const sizePrice = getSizePrice(product, normalizedSelectedSize);
          const updatedVariant = product.variants?.find((variant) => {
            const variantNameKey = normalizeSizeComparisonKey(variant.name);
            const variantWeightKey = normalizeSizeComparisonKey(variant.weight);
            return (
              variantNameKey === selectedSizeKey ||
              variantWeightKey === selectedSizeKey
            );
          });
          const updatedVariantId = updatedVariant?.id ?? item.variantId;

          state.items[fallbackIndex] = {
            ...product,
            quantity,
            selectedSize: normalizedSelectedSize,
            cartId: `${product.id}-${normalizedSelectedSize}`,
            variantId: updatedVariantId,
            price:
              sizePrice?.price || item.price || getProductMinBasePrice(product),
            mrpPrice: sizePrice?.mrpPrice ?? item.mrpPrice,
            gstPercentage: resolveCartItemGstPercentage(
              product,
              normalizedSelectedSize,
              updatedVariantId,
              item.gstPercentage,
            ),
            lastUpdated: Date.now(),
          };
        } else {
          const maxStock = getMaxStock(item, item.selectedSize);
          if (quantity > maxStock) {
            return; // Exceeds stock
          }
          state.items[fallbackIndex] = {
            ...item,
            quantity,
            lastUpdated: Date.now(),
          };
        }
      }

      saveCartToStorage(state.items);
    },
    clearCart: (state) => {
      state.items = [];
      saveCartToStorage(state.items);
    },
    // Sync cart items with latest product data
    syncCartWithProducts: (state, action: PayloadAction<ProductType[]>) => {
      const products = action.payload;
      const productMap = new Map(products.map((p) => [p.id, p]));

      let hasChanges = false;

      state.items = state.items
        .map((cartItem) => {
          const product = productMap.get(cartItem.id);

          // Remove items for products that no longer exist or are inactive
          if (!product || !isProductAvailable(product, cartItem.selectedSize)) {
            hasChanges = true;
            return null;
          }

          // Sync item with latest product data
          const syncedItem = syncCartItemWithProduct(cartItem, product);

          // Check if price actually changed
          if (
            syncedItem.price !== cartItem.price ||
            syncedItem.mrpPrice !== cartItem.mrpPrice ||
            syncedItem.name !== cartItem.name ||
            JSON.stringify(syncedItem.images) !==
              JSON.stringify(cartItem.images)
          ) {
            hasChanges = true;
          }

          return syncedItem;
        })
        .filter((item): item is CartItem => item !== null);

      // Only save to storage if there were actual changes
      if (hasChanges) {
        saveCartToStorage(state.items);
      }
    },
    // Sync a single cart item with product data
    syncCartItem: (
      state,
      action: PayloadAction<{ cartId: string; product: ProductType }>,
    ) => {
      const { cartId, product } = action.payload;
      const itemIndex = state.items.findIndex((item) => item.cartId === cartId);

      if (itemIndex >= 0) {
        const cartItem = state.items[itemIndex];

        // Check if product is still available
        if (!isProductAvailable(product, cartItem.selectedSize)) {
          // Remove unavailable item
          state.items.splice(itemIndex, 1);
        } else {
          // Sync with latest product data
          const syncedItem = syncCartItemWithProduct(cartItem, product);

          // Check if key properties actually changed to avoid unnecessary state updates (and loops)
          const hasChanges =
            syncedItem.price !== cartItem.price ||
            syncedItem.mrpPrice !== cartItem.mrpPrice ||
            syncedItem.name !== cartItem.name ||
            syncedItem.isActive !== cartItem.isActive ||
            JSON.stringify(syncedItem.images) !==
              JSON.stringify(cartItem.images);

          if (hasChanges) {
            state.items[itemIndex] = syncedItem;
          }
        }
      }

      saveCartToStorage(state.items);
    },
    // Remove unavailable items
    removeUnavailableItems: (state, action: PayloadAction<ProductType[]>) => {
      const products = action.payload;
      const productMap = new Map(products.map((p) => [p.id, p]));

      state.items = state.items.filter((cartItem) => {
        const product = productMap.get(cartItem.id);
        return product && isProductAvailable(product, cartItem.selectedSize);
      });

      saveCartToStorage(state.items);
    },
    // Force sync cart with current product data (manual trigger)
    forceSyncCart: (state, action: PayloadAction<ProductType[]>) => {
      const products = action.payload;
      const productMap = new Map(products.map((p) => [p.id, p]));

      state.items = state.items
        .map((cartItem) => {
          const product = productMap.get(cartItem.id);

          if (!product || !isProductAvailable(product, cartItem.selectedSize)) {
            return null;
          }

          return syncCartItemWithProduct(cartItem, product);
        })
        .filter((item): item is CartItem => item !== null);

      saveCartToStorage(state.items);
    },
  },
});

export const {
  initializeCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  clearCart,
  syncCartWithProducts,
  syncCartItem,
  removeUnavailableItems,
  forceSyncCart,
} = cartSlice.actions;

export default cartSlice.reducer;
