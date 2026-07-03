import { configureStore, createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import productsReducer from "./slices/productsSlice";
import customerReducer from "./slices/customerSlice";
import cartReducer from "./slices/cartSlice";
import { syncCartWithProducts, syncCartItem } from "./slices/cartSlice";
import { fetchAllActiveProducts, fetchProducts, fetchProduct } from "./slices/productsSlice";
import type { ProductType } from "@/type/ProductType";
import type { CartItem } from "./slices/cartSlice";

type SyncState = {
  products: { allProducts: ProductType[]; currentProduct: ProductType | null };
  cart: { items: CartItem[]; isInitialized: boolean };
};

// Create listener middleware for cart-product sync
const cartSyncMiddleware = createListenerMiddleware();

// Listen for bulk product updates and sync cart
cartSyncMiddleware.startListening({
  matcher: isAnyOf(
    fetchAllActiveProducts.fulfilled,
    fetchProducts.fulfilled
  ),
  effect: async (action, listenerApi) => {
    const rootState = listenerApi.getState() as SyncState;

    // Only sync if cart is initialized and has items
    if (
      rootState.cart.isInitialized &&
      rootState.products.allProducts.length > 0 &&
      rootState.cart.items.length > 0
    ) {
      listenerApi.dispatch(syncCartWithProducts(rootState.products.allProducts));
    }
  },
});

// Listen for single product updates and sync specific cart item
cartSyncMiddleware.startListening({
  actionCreator: fetchProduct.fulfilled,
  effect: async (action, listenerApi) => {
    const rootState = listenerApi.getState() as SyncState;

    // Sync the specific product in cart if it exists
    if (
      rootState.cart.isInitialized &&
      rootState.products.currentProduct &&
      rootState.cart.items.length > 0
    ) {
      const product = rootState.products.currentProduct;
      const cartItem = rootState.cart.items.find((item) => item.id === product.id);

      if (cartItem) {
        // Clone product to ensure we pass a plain object to avoid proxy stack overflow issues
        listenerApi.dispatch(syncCartItem({ cartId: cartItem.cartId, product: { ...product } }));
      }
    }
  },
});

export const store = configureStore({
  reducer: {
    products: productsReducer,
    customer: customerReducer,
    cart: cartReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["products/fetchProducts/fulfilled", "customer/fetchOrders/fulfilled"],
      },
    }).prepend(cartSyncMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
