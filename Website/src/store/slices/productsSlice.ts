import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { productApi } from "@/lib/api";
import { ProductType } from "@/type/ProductType";
import { normalizeProduct, normalizeProducts } from "@/lib/product-normalizer";

interface ProductsState {
  allProducts: ProductType[];
  filteredProducts: ProductType[];
  currentProduct: ProductType | null;
  bestSellers: ProductType[];
  stats: unknown;
  loading: boolean;
  error: string | null;
  lastFetchTime: number | null;
}

const initialState: ProductsState = {
  allProducts: [],
  filteredProducts: [],
  currentProduct: null,
  bestSellers: [],
  stats: null,
  loading: false,
  error: null,
  lastFetchTime: null,
};

const DEFAULT_PRODUCTS_LIMIT = 100;
const MAX_PRODUCTS_LIMIT = 1000;

// Request deduplication map
const pendingRequests = new Map<string, Promise<ProductType[]>>();

// Async thunks
export const fetchAllActiveProducts = createAsyncThunk(
  "products/fetchAllActive",
  async (
    params: { limit?: number; forceRefresh?: boolean } | undefined = undefined,
    { rejectWithValue, getState },
  ) => {
    try {
      // Check cache first
      const state = getState() as { products: ProductsState };
      const limit = params?.limit || 50;
      const forceRefresh = params?.forceRefresh === true;

      if (
        !forceRefresh &&
        state.products.allProducts.length >= limit &&
        state.products.lastFetchTime &&
        Date.now() - state.products.lastFetchTime < 10 * 60 * 1000 // 10 minutes cache
      ) {
        return state.products.allProducts;
      }

      // Check for pending request
      const requestKey = `fetchAllActiveProducts_${limit}`;
      if (pendingRequests.has(requestKey)) {
        return await pendingRequests.get(requestKey)!;
      }

      // Create new request
      const requestPromise = (async () => {
        try {
          const response = await productApi.getProducts({ isActive: true, limit });
          let products: any[] = [];
          if (Array.isArray(response.data)) {
            products = response.data;
          } else if (response.data.success && response.data.data) {
            // Handle paginated response
            if (response.data.data.products) {
              products = response.data.data.products;
            } else if (Array.isArray(response.data.data)) {
              products = response.data.data;
            }
          } else {
            throw new Error(response.data.message || "Failed to fetch products");
          }
          return normalizeProducts(products);
        } finally {
          pendingRequests.delete(requestKey);
        }
      })();

      pendingRequests.set(requestKey, requestPromise);
      return await requestPromise;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch products");
    }
  }
);

export const fetchProducts = createAsyncThunk(
  "products/fetchProducts",
  async (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      type?: string;
      tag?: string;
      isActive?: boolean;
      sortBy?: string;
      sortOrder?: "ASC" | "DESC";
      minPrice?: number;
      maxPrice?: number;
      forceRefresh?: boolean;
    } | undefined = undefined,
    { rejectWithValue, getState }
  ) => {
    try {
      // Check if we can use cached allProducts for simple queries
      const state = getState() as { products: ProductsState };
      const forceRefresh = params?.forceRefresh === true;
      const hasSearch = params?.search && params.search.trim().length > 0;
      const hasFilters =
        (params?.category && params.category.trim().length > 0) ||
        (params?.type && params.type.trim().length > 0) ||
        (params?.tag && params.tag.trim().length > 0) ||
        params?.minPrice !== undefined ||
        params?.maxPrice !== undefined;
      const isSimpleActiveQuery =
        params?.isActive === true &&
        !hasSearch &&
        !hasFilters &&
        !params?.page &&
        !params?.sortBy;

      // Use cached data if available and query is simple
      if (
        !forceRefresh &&
        isSimpleActiveQuery &&
        state.products.allProducts.length >= (params?.limit || DEFAULT_PRODUCTS_LIMIT) &&
        state.products.lastFetchTime &&
        Date.now() - state.products.lastFetchTime < 10 * 60 * 1000 // 10 minutes cache
      ) {
        const limit = params?.limit || DEFAULT_PRODUCTS_LIMIT;
        return state.products.allProducts.slice(0, limit);
      }

      // Check for pending request with same params
      const requestKey = `fetchProducts_${JSON.stringify(params)}`;
      if (pendingRequests.has(requestKey)) {
        return await pendingRequests.get(requestKey)!;
      }

      // Create new request
      const requestPromise = (async () => {
        try {
          const { forceRefresh: _forceRefresh, ...apiParams } = params || {};

          // Limit pagination for better performance
          const optimizedParams = {
            ...apiParams,
            limit: apiParams?.limit
              ? Math.min(apiParams.limit, MAX_PRODUCTS_LIMIT)
              : DEFAULT_PRODUCTS_LIMIT,
          };
          const response = await productApi.getProducts(optimizedParams);
          let products: any[] = [];
          if (Array.isArray(response.data)) {
            products = response.data;
          } else if (response.data.success && response.data.data) {
            // Handle paginated response
            if (response.data.data.products) {
              products = response.data.data.products;
            } else if (Array.isArray(response.data.data)) {
              products = response.data.data;
            }
          } else {
            throw new Error(response.data.message || "Failed to fetch products");
          }
          return normalizeProducts(products);
        } finally {
          pendingRequests.delete(requestKey);
        }
      })();

      pendingRequests.set(requestKey, requestPromise);
      const response = await requestPromise;
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch products");
    }
  }
);

export const fetchProduct = createAsyncThunk(
  "products/fetchProduct",
  async (idOrSlug: string | number, { rejectWithValue }) => {
    try {
      const response = await productApi.getProduct(idOrSlug);
      if (response.data.success) {
        return normalizeProduct(response.data.data);
      }
      throw new Error(response.data.message || "Failed to fetch product");
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch product");
    }
  }
);

export const fetchBestSellers = createAsyncThunk(
  "products/fetchBestSellers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await productApi.getBestSellers();
      if (response.data.success) {
        const products = Array.isArray(response.data.data) ? response.data.data : [];
        return normalizeProducts(products);
      }
      throw new Error(response.data.message || "Failed to fetch best sellers");
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch best sellers");
    }
  }
);

export const fetchProductStats = createAsyncThunk(
  "products/fetchProductStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await productApi.getProductStats();
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "Failed to fetch product stats");
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch product stats");
    }
  }
);

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all active products
    builder
      .addCase(fetchAllActiveProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllActiveProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.allProducts = action.payload;
        state.lastFetchTime = Date.now();
      })
      .addCase(fetchAllActiveProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch products with filters
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.filteredProducts = Array.isArray(action.payload) ? action.payload : [];
        // Also update allProducts if it's a simple active query
        const params = action.meta.arg;
        if (params?.isActive && !params?.search && !params?.category && !params?.type && !params?.tag) {
          state.allProducts = Array.isArray(action.payload) ? action.payload : [];
          state.lastFetchTime = Date.now();
        }
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch single product
    builder
      .addCase(fetchProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch best sellers
    builder
      .addCase(fetchBestSellers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBestSellers.fulfilled, (state, action) => {
        state.loading = false;
        state.bestSellers = action.payload;
      })
      .addCase(fetchBestSellers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch product stats
    builder
      .addCase(fetchProductStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchProductStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentProduct, clearError } = productsSlice.actions;
export default productsSlice.reducer;
