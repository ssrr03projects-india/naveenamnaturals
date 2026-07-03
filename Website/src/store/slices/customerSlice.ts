import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { customerApi } from "@/lib/api";
import toast from "react-hot-toast";

// Request deduplication map
const pendingCustomerRequests = new Map<string, Promise<any>>();

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: any[];
  address?: any;
  trackingNumber?: string | null;
  shippingCarrier?: string | null;
  shippingProvider?: string | null;
  shippingShipmentId?: string | null;
  shippingProviderOrderId?: string | null;
  shippingCourierName?: string | null;
  shippingLatestStatus?: string | null;
}

interface OrderStats {
  totalOrders: number;
  awaitingPickup: number;
  cancelledOrders: number;
  deliveredOrders: number;
}

interface CustomerState {
  profile: any | null;
  orders: Order[];
  currentOrder: Order | null;
  orderStats: OrderStats | null;
  loading: boolean;
  error: string | null;
}

const initialState: CustomerState = {
  profile: null,
  orders: [],
  currentOrder: null,
  orderStats: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchCustomerProfile = createAsyncThunk(
  "customer/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await customerApi.getProfile();
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "Failed to fetch profile");
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch profile");
    }
  }
);

export const updateCustomerProfile = createAsyncThunk(
  "customer/updateProfile",
  async (data: Parameters<typeof customerApi.updateProfile>[0], { rejectWithValue }) => {
    try {
      const response = await customerApi.updateProfile(data);
      if (response.data.success) {
        toast.success("Profile updated successfully!");
        return response.data.data;
      }
      throw new Error(response.data.message || "Failed to update profile");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
      return rejectWithValue(error.message || "Failed to update profile");
    }
  }
);

export const fetchCustomerOrders = createAsyncThunk(
  "customer/fetchOrders",
  async (
    params: {
      page?: number;
      limit?: number;
      status?: string;
    } = {},
    { rejectWithValue }
  ) => {
    try {
      // Check for pending request
      const requestKey = `fetchCustomerOrders_${JSON.stringify(params)}`;
      if (pendingCustomerRequests.has(requestKey)) {
        return await pendingCustomerRequests.get(requestKey)!;
      }

      // Create new request
      const requestPromise = (async () => {
        try {
          const response = await customerApi.getOrders(params);
          if (response.data.success) {
            return response.data.data;
          }
          throw new Error(response.data.message || "Failed to fetch orders");
        } finally {
          pendingCustomerRequests.delete(requestKey);
        }
      })();

      pendingCustomerRequests.set(requestKey, requestPromise);
      return await requestPromise;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch orders");
    }
  }
);

export const fetchCustomerOrder = createAsyncThunk(
  "customer/fetchOrder",
  async (orderId: string | number, { rejectWithValue }) => {
    try {
      const response = await customerApi.getOrder(orderId);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "Failed to fetch order");
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch order");
    }
  }
);

export const fetchOrderStats = createAsyncThunk(
  "customer/fetchOrderStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await customerApi.getOrderStats();
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "Failed to fetch order stats");
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch order stats");
    }
  }
);

const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    clearProfile: (state) => {
      state.profile = null;
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch profile
    builder
      .addCase(fetchCustomerProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchCustomerProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update profile
    builder
      .addCase(updateCustomerProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCustomerProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(updateCustomerProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch orders
    builder
      .addCase(fetchCustomerOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerOrders.fulfilled, (state, action) => {
        state.loading = false;
        // Handle both response formats: { orders: [...] } or [...]
        if (Array.isArray(action.payload)) {
          state.orders = action.payload;
        } else if (action.payload?.orders && Array.isArray(action.payload.orders)) {
          state.orders = action.payload.orders;
        } else {
          state.orders = [];
        }
      })
      .addCase(fetchCustomerOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch single order
    builder
      .addCase(fetchCustomerOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload;
      })
      .addCase(fetchCustomerOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch order stats
    builder
      .addCase(fetchOrderStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderStats.fulfilled, (state, action) => {
        state.loading = false;
        state.orderStats = action.payload;
      })
      .addCase(fetchOrderStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearProfile, clearCurrentOrder, clearError } = customerSlice.actions;
export default customerSlice.reducer;
