import { API_BASE_URL, getAuthHeaders } from "./api";

const REPORTS_BASE = `${API_BASE_URL}/api/reports`;

export interface SalesReportFilters {
  period?: string | number;
  startDate?: string;
  endDate?: string;
}

export interface SalesReportResponse {
  success: boolean;
  data: {
    customerSales: Array<{
      id: number;
      name: string;
      email: string;
      phone: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      totalOrders: number;
      totalSpent: number;
      mostOrderedProduct?: string;
    }>;
    totalRevenue: string;
    totalOrders: number;
    totalCustomers: number;
    avgOrderValue: string;
    revenueGrowth: string | number;
    ordersGrowth: string | number;
  };
}

export interface ProductReportResponse {
  success: boolean;
  data: {
    topProducts: Array<{
      id: number;
      name: string;
      quantity: number;
      revenue: number;
    }>;
  };
}

export interface CustomerInsightsResponse {
  success: boolean;
  data: {
    customerAcquisition: Array<{ month: string; newCustomers: number }>;
    topCustomers: Array<{
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      totalOrders: number;
      totalSpent: number;
      lastOrderDate: string;
      orders?: Array<{ paidOrders?: number; totalPaid?: number }>;
    }>;
    customerDemographics: Array<{ state: string; count: number }>;
    customerLifetimeValue: Array<{
      customerSegment: string;
      customerCount: number;
      averageSpent: number;
      averageOrders: number;
    }>;
    repeatCustomerRate: {
      totalCustomers: number;
      repeatCustomers: number;
      repeatRate: number;
    };
  };
}

function buildParams(filters: SalesReportFilters & { limit?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.period) params.set("period", String(filters.period));
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.limit) params.set("limit", String(filters.limit));
  return params;
}

export async function fetchSalesReport(
  filters: SalesReportFilters = {},
  token?: string | null
): Promise<SalesReportResponse> {
  const params = buildParams(filters);
  const url = `${REPORTS_BASE}/sales${params.toString() ? `?${params}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch sales report: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchProductReport(
  filters: SalesReportFilters & { limit?: number } = {},
  token?: string | null
): Promise<ProductReportResponse> {
  const params = buildParams(filters);
  const url = `${REPORTS_BASE}/products${params.toString() ? `?${params}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch product report: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchCustomerInsights(
  filters: { startDate?: string; endDate?: string } = {},
  token?: string | null
): Promise<CustomerInsightsResponse> {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  const url = `${REPORTS_BASE}/customers${params.toString() ? `?${params}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch customer insights: ${response.statusText}`);
  }
  return response.json();
}
