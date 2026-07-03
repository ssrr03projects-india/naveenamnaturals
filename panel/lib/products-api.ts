import { API_BASE_URL, getAuthHeaders } from "./api";

const PRODUCTS_BASE = `${API_BASE_URL}/api/products`;

export interface ProductVariant {
  id: number;
  productId: number;
  name: string;
  sku: string;
  price: number;
  mrpPrice: number | null;
  gstPercentage?: number | null;
  stock: number;
  customStock?: string | null;
  sold: number;
  weight: string | null;
  length?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  // Variant-based fields
  totalStock?: number;
  totalSold?: number;
  priceRange?: string;
  variants?: ProductVariant[];
  // Other fields
  categoryId: number | null;
  length?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  category: string | null;
  categoryData?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  type: string | null;
  tag: string | null;
  images: string[];
  isActive: boolean;
  rate: number;
  // Legacy/optional fields
  sizes?: string[];
  keyIngredients?: string[];
  benefits?: string[];
  usageSteps?: string[];
  lowStockThreshold?: number;
  trackQuantity?: boolean;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  type?: string;
  tag?: string;
  isActive?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  minPrice?: number;
  maxPrice?: number;
}

export interface ProductsResponse {
  success: boolean;
  data: {
    products: Product[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export interface ProductResponse {
  success: boolean;
  data: Product;
}

export interface ProductStats {
  success: boolean;
  data: {
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    lowStockProducts: number;
  };
}

// Helper function to parse images field
function parseImages(images: string | string[] | null | undefined): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images;
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Helper function to transform product data
function transformProduct(product: unknown): Product {
  const p = product as Product;
  return {
    ...p,
    images: parseImages(p.images),
    category: p.category || p.categoryData?.name || null,
  };
}

export async function fetchProducts(
  filters: ProductFilters = {},
  token?: string | null
): Promise<ProductsResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.append("page", filters.page.toString());
  if (filters.limit) params.append("limit", filters.limit.toString());
  if (filters.search) params.append("search", filters.search);
  if (filters.category) params.append("category", filters.category);
  if (filters.type) params.append("type", filters.type);
  if (filters.tag) params.append("tag", filters.tag);
  if (filters.isActive !== undefined) params.append("isActive", filters.isActive);
  if (filters.sortBy) params.append("sortBy", filters.sortBy);
  if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);
  if (filters.minPrice) params.append("minPrice", filters.minPrice.toString());
  if (filters.maxPrice) params.append("maxPrice", filters.maxPrice.toString());

  const url = `${PRODUCTS_BASE}?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.statusText}`);
  }

  const data = await response.json();

  // Transform products to ensure images are arrays
  if (data.success && data.data && data.data.products) {
    data.data.products = data.data.products.map(transformProduct);
  }

  return data;
}

export async function fetchProduct(
  id: string,
  token?: string | null
): Promise<ProductResponse> {
  const response = await fetch(`${PRODUCTS_BASE}/${id}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch product: ${response.statusText}`);
  }

  const data = await response.json();

  // Transform product to ensure images is an array
  if (data.success && data.data) {
    data.data = transformProduct(data.data);
  }

  return data;
}

export async function createProduct(
  productData: FormData,
  token?: string | null
): Promise<{ success: boolean; message: string; data: Product }> {
  const headers: HeadersInit = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  // Don't set Content-Type for FormData, browser will set it with boundary

  const response = await fetch(PRODUCTS_BASE, {
    method: "POST",
    headers,
    body: productData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to create product: ${response.statusText}`);
  }

  return response.json();
}

export async function updateProduct(
  id: string,
  productData: FormData,
  token?: string | null
): Promise<{ success: boolean; message: string }> {
  const headers: HeadersInit = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  // Don't set Content-Type for FormData, browser will set it with boundary

  const response = await fetch(`${PRODUCTS_BASE}/${id}`, {
    method: "PUT",
    headers,
    body: productData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to update product: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteProduct(
  id: string,
  token?: string | null
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${PRODUCTS_BASE}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to delete product: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchProductStats(
  token?: string | null
): Promise<ProductStats> {
  const response = await fetch(`${PRODUCTS_BASE}/stats`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch product stats: ${response.statusText}`);
  }

  return response.json();
}
