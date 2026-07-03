import { API_BASE_URL, getAuthHeaders } from "./api";

const COUPONS_BASE = `${API_BASE_URL}/api/coupons`;

export interface Coupon {
  id: number;
  code: string;
  name: string;
  description?: string;
  type: "percentage" | "fixed";
  value: number;
  minimumAmount?: number | null;
  usageLimit?: number | null;
  usedCount?: number;
  usageLimitPerCustomer?: number | null;
  customerEligibility?: string;
  eligibleCustomers?: number[];
  applicableProducts?: number[];
  startsAt?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CouponFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
}

export interface CouponsResponse {
  success: boolean;
  data: {
    coupons: Coupon[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export interface CouponResponse {
  success: boolean;
  data: Coupon;
}

export interface CreateCouponData {
  code: string;
  name: string;
  description?: string;
  type: "percentage" | "fixed";
  value: number;
  minimumAmount?: number | null;
  usageLimit?: number | null;
  usageLimitPerCustomer?: number | null;
  customerEligibility?: string;
  eligibleCustomers?: number[];
  applicableProducts?: number[];
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
}

export async function fetchCoupons(
  filters: CouponFilters = {},
  token?: string | null,
): Promise<CouponsResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.append("page", filters.page.toString());
  if (filters.limit) params.append("limit", filters.limit.toString());
  if (filters.search) params.append("search", filters.search);
  if (filters.status)
    params.append("isActive", filters.status === "active" ? "true" : "false");
  if (filters.type) params.append("type", filters.type);

  const url = `${COUPONS_BASE}?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch coupons: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchCoupon(
  id: string,
  token?: string | null,
): Promise<CouponResponse> {
  const response = await fetch(`${COUPONS_BASE}/${id}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch coupon: ${response.statusText}`);
  }

  return response.json();
}

export async function createCoupon(
  data: CreateCouponData,
  token?: string | null,
): Promise<CouponResponse> {
  const response = await fetch(COUPONS_BASE, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.message || `Failed to create coupon: ${response.statusText}`,
    );
  }

  return response.json();
}

export async function updateCoupon(
  id: string,
  data: Partial<CreateCouponData>,
  token?: string | null,
): Promise<CouponResponse> {
  const response = await fetch(`${COUPONS_BASE}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update coupon: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteCoupon(
  id: string,
  token?: string | null,
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${COUPONS_BASE}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.message || `Failed to delete coupon: ${response.statusText}`,
    );
  }

  return response.json();
}
