import { API_BASE_URL, getAuthHeaders } from "./api";
import { Product } from "./products-api";

export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  bestSellingProducts: BestSellingProduct[];
  recentOrders: RecentOrder[];
  ordersByStatus: { status: string; count: number }[];
  monthlySales: { month: string; orders: number; revenue: number }[];
  dailySales: { date: string; orders: number; revenue: number }[];
  lowStockProducts: Product[];
}

export interface BestSellingProduct {
  productId: number;
  totalSold: number;
  totalRevenue: number;
  product: {
    id: number;
    name: string;
    sku: string;
    price: number;
    images: string | string[];
  };
}

export interface RecentOrder {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
}

export interface DashboardStatsFilters {
  period?: "all" | "7d" | "30d" | "90d" | "custom";
  startDate?: string;
  endDate?: string;
}

export async function fetchDashboardStats(
  filters: DashboardStatsFilters = {},
  token?: string | null
): Promise<DashboardStatsResponse> {
  const params = new URLSearchParams();
  if (filters.period) params.set("period", filters.period);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);

  const query = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/dashboard/stats${query ? `?${query}` : ""}`,
    {
    method: "GET",
    headers: getAuthHeaders(token),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
  }

  return response.json();
}
