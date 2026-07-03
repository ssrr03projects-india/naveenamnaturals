import axios from "axios";

// API client configuration
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Increased timeout for slower connections
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies with requests
});

// Authentication is handled via httpOnly cookies only
// No tokens should be stored in localStorage for security
apiClient.interceptors.request.use(
  (config) => {
    // Cookies are sent automatically with withCredentials: true
    // All authentication is handled via secure httpOnly cookies from the backend
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Unauthorized - authentication is handled via httpOnly cookies
    // We rely on the calling code (components/thunks) or AuthContext to handle the 401 error.
    return Promise.reject(error);
  },
);

// Customer Authentication API functions
export const customerApi = {
  // Login
  login: (credentials: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }) => apiClient.post("/customers/login", credentials),

  // Register
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    address?: {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
      phone?: string;
      email?: string;
    };
    dateOfBirth?: string;
    gender?: "male" | "female" | "other";
  }) => apiClient.post("/customers/register", data),

  // Get customer profile
  getProfile: () => apiClient.get("/customers/profile"),

  // Update customer profile
  updateProfile: (data: {
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: "male" | "female" | "other";
    address?: {
      firstName?: string;
      lastName?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
      phone?: string;
      email?: string;
      company?: string;
    };
  }) => apiClient.put("/customers/profile", data),

  // Get customer orders
  getOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
  }) => apiClient.get("/customers/orders", { params }),

  // Get customer order by ID
  getOrder: (id: string | number) => apiClient.get(`/customers/orders/${id}`),

  // Get customer order statistics
  getOrderStats: () => apiClient.get("/customers/orders/stats"),

  // Logout
  logout: () => apiClient.post("/customers/logout"),

  // Forgot Password - Request reset email
  forgotPassword: (data: { email: string }) =>
    apiClient.post("/customers/forgot-password", data),

  // Reset Password - Set new password with token
  resetPassword: (data: { token: string; email: string; password: string }) =>
    apiClient.post("/customers/reset-password", data),

  // Create order
  createOrder: (data: {
    customerId: number;
    items: Array<{
      productId: number;
      quantity: number;
    }>;
    address: {
      name: string;
      address: string;
      city: string;
      state: string;
      postalCode: string;
      country?: string;
      phone: string;
    };
    paymentMethod: string;
    paymentId?: string;
    couponCode?: string;
    notes?: string;
  }) => apiClient.post("/orders", data),
};

// Product API functions (public endpoints)
export const productApi = {
  // Get all products with filters
  getProducts: (params?: {
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
  }) => apiClient.get("/products", { params }),

  // Get product by ID or slug
  getProduct: (idOrSlug: string | number) =>
    apiClient.get(`/products/${idOrSlug}`),

  // Get best selling products
  getBestSellers: () => apiClient.get("/products/best-sellers"),

  // Get product statistics
  getProductStats: () => apiClient.get("/products/stats"),
};

// Reviews API functions (public endpoints)
export const reviewApi = {
  // Get reviews for a product (public)
  getProductReviews: (
    productId: string | number,
    params?: { page?: number; limit?: number; rating?: string },
  ) => apiClient.get(`/reviews/product/${productId}`, { params }),

  // Get all reviews (e.g. for testimonials - approved only)
  getReviews: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get("/reviews", { params }),

  // Create a review (public)
  createReview: (data: {
    productId: string | number;
    customerId?: string | number;
    rating: number;
    comment: string;
    customerName: string;
    customerEmail: string;
    images?: string[];
  }) => apiClient.post("/reviews", data),
};

// Coupon API functions
export const couponApi = {
  // Validate coupon code
  validateCoupon: (data: {
    code: string;
    orderAmount: number;
    customerId?: number;
    items?: Array<{
      productId: number;
      categoryId?: number;
      price: number;
      quantity?: number;
    }>;
  }) => apiClient.post("/coupons/validate", data),

  // Get available coupons (if you have this endpoint)
  getAvailableCoupons: (params?: {
    customerId?: number;
    orderAmount?: number;
  }) => apiClient.get("/coupons/available", { params }),

  // Get all active coupons (public endpoint)
  getAllActiveCoupons: () => apiClient.get("/coupons/public"),
};

// Category API functions (public endpoints)
export const categoryApi = {
  // Get all categories (tree)
  getCategoryTree: () => apiClient.get("/categories/tree"),

  // Get all categories (flat)
  getAllCategories: () => apiClient.get("/categories"),

  // Get single category by ID or slug
  getCategory: (idOrSlug: string | number) =>
    apiClient.get(`/categories/${idOrSlug}`),
};

// Homepage API functions (public endpoints)
export const homepageApi = {
  // Get homepage sliders
  getSliders: () => apiClient.get("/home/slider"),
};

// Email / Contact API functions
export const emailApi = {
  createContact: (data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }) => apiClient.post("/email/contact", data),
};

// Settings API functions
export const settingsApi = {
  // Get setting by key
  getSettingByKey: (key: string) => apiClient.get(`/settings/keys/${key}`),
};

// Tracking API functions
export const trackingApi = {
  // Get tracking details
  getTracking: (awb: string, options?: { sync?: boolean }) =>
    apiClient.get(
      `/tracking/${awb}${options?.sync === false ? "?sync=false" : ""}`,
    ),
};

export default customerApi;
