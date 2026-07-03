import { API_BASE_URL, getAuthHeaders } from "./api";

const ORDERS_BASE = `${API_BASE_URL}/api/orders`;

export interface GstBreakdownItem {
  itemId?: number | null;
  productId?: number | null;
  productName: string;
  quantity: number;
  basePrice: number;
  baseAmount: number;
  gstRate: number;
  allocatedDiscount: number;
  discountedUnitPrice: number;
  taxableAmount: number;
  gstAmount: number;
  lineTotal: number;
}

export interface GstBreakdownGroup {
  gstRate: number;
  gstAmount: number;
}

export interface GstBreakdown {
  couponApplied: boolean;
  couponDiscount: number;
  subtotalBase: number;
  subtotalAfterDiscount: number;
  items: GstBreakdownItem[];
  groupedByRate: GstBreakdownGroup[];
  totalGst: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerId?: number;
  customer?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  email?: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  totalAmount: number;
  subtotal?: number;
  shippingAmount?: number;
  shippingQuotedAmount?: number;
  shippingDiscountAmount?: number;
  taxAmount?: number;
  discountAmount?: number;
  coupon?: {
    id: number;
    code: string;
    name: string;
  };
  couponCode?: string;
  couponDiscount?: number;
  gstBreakdown?: GstBreakdown;
  items?: OrderItem[];
  address?: Address;
  billingAddress?: Address; // Optional fallback - use address as primary
  trackingNumber?: string;
  shippingCarrier?: string;
  shippingProvider?: string;
  shippingShipmentId?: string;
  shippingProviderOrderId?: string;
  shippingCourierName?: string;
  shippingLatestStatus?: string;
  shippingBookingStage?: string;
  paymentId?: string;
  notes?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  packingStatus?: "unpacked" | "packed";
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId?: number;
  product?: {
    id: number;
    name: string;
    slug: string;
    images: string[];
    price: string;
  };
  productName?: string;
  productSku?: string;
  productSnapshot?: {
    name?: string;
    slug?: string;
    price?: number;
    mrpPrice?: number;
    gstPercentage?: number;
    selectedSize?: string;
    variantName?: string;
    images?: string[];
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxAmount?: number;
  discountAmount?: number;
}

export interface Address {
  name: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  pincode?: string; // Alternative to postalCode from different address formats
  country: string;
  phone?: string;
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  packingStatus?: string;
  excludeCancelledRefunded?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface OrdersResponse {
  success: boolean;
  data: {
    orders: Order[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export interface OrderResponse {
  success: boolean;
  data: Order;
}

export async function fetchOrders(
  filters: OrderFilters = {},
  token?: string | null,
): Promise<OrdersResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.append("page", filters.page.toString());
  if (filters.limit) params.append("limit", filters.limit.toString());
  if (filters.search) params.append("search", filters.search);
  if (filters.status) params.append("status", filters.status);
  if (filters.paymentStatus)
    params.append("paymentStatus", filters.paymentStatus);
  if (filters.packingStatus)
    params.append("packingStatus", filters.packingStatus);
  if (filters.excludeCancelledRefunded)
    params.append("excludeCancelledRefunded", "true");
  if (filters.startDate) params.append("startDate", filters.startDate);
  if (filters.endDate) params.append("endDate", filters.endDate);

  const url = `${ORDERS_BASE}?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchOrder(
  id: string,
  token?: string | null,
): Promise<OrderResponse> {
  const response = await fetch(`${ORDERS_BASE}/${id}`, {
    method: "GET",
    headers: getAuthHeaders(token),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch order: ${response.statusText}`);
  }

  return response.json();
}

export async function updateOrderStatus(
  id: string,
  status: string,
  token?: string | null,
): Promise<{ success: boolean; data: Order }> {
  const response = await fetch(`${ORDERS_BASE}/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update order status: ${response.statusText}`);
  }

  return response.json();
}

export async function updateOrderPaymentStatus(
  id: string,
  paymentStatus: string,
  token?: string | null,
): Promise<{ success: boolean; data: Order }> {
  const response = await fetch(`${ORDERS_BASE}/${id}/payment-status`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ paymentStatus }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update payment status: ${response.statusText}`);
  }

  return response.json();
}

export async function cancelOrder(
  id: string,
  reason: string,
  token?: string | null,
): Promise<{ success: boolean; data: Order }> {
  const response = await fetch(`${ORDERS_BASE}/${id}/cancel`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    throw new Error(`Failed to cancel order: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteOrder(
  id: string,
  token?: string | null,
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${ORDERS_BASE}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete order: ${response.statusText}`);
  }

  return response.json();
}

export async function updatePackingStatus(
  id: string,
  packingStatus: "packed" | "unpacked",
  token?: string | null,
): Promise<{
  success: boolean;
  data: Order;
  shipment?: {
    awbNumber?: string;
    courierName?: string;
    shipmentId?: string;
  };
  bookingTriggered?: boolean;
  bookingSuccess?: boolean;
  manualRetryRequired?: boolean;
  bookingMessage?: string | null;
}> {
  const response = await fetch(`${ORDERS_BASE}/${id}/packing-status`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ packingStatus }),
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const errorData = await response.json();
      message = errorData.message || errorData.error || message;
    } catch {
      // ignore parse issues
    }
    throw new Error(`Failed to update packing status: ${message}`);
  }

  return response.json();
}

export async function exportOrdersToPDF(
  filters: OrderFilters = {},
  token?: string | null,
): Promise<Blob> {
  const params = new URLSearchParams();
  if (filters.page) params.append("page", filters.page.toString());
  if (filters.limit) params.append("limit", filters.limit.toString());
  if (filters.search) params.append("search", filters.search);
  if (filters.status) params.append("status", filters.status);
  if (filters.paymentStatus)
    params.append("paymentStatus", filters.paymentStatus);
  if (filters.startDate) params.append("startDate", filters.startDate);
  if (filters.endDate) params.append("endDate", filters.endDate);

  const response = await fetch(`${API_BASE_URL}/api/export/pdf`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(token),
      "Content-Type": "application/json",
    },
    // Send filters as body since backend expects POST body
    body: JSON.stringify(filters),
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        errorMessage = errorBody.message;
      }
    } catch {
      // Ignore parse failures and keep HTTP status text.
    }
    throw new Error(`Failed to export PDF: ${errorMessage}`);
  }

  return response.blob();
}
