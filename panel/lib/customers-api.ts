import { API_BASE_URL, getAuthHeaders } from "./api";

const CUSTOMERS_BASE = `${API_BASE_URL}/api/customers`;

export interface Customer {
  id: number;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: {
    fullname?: string;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    countryCode?: string;
    stateCode?: string;
    phonenumber?: string;
    email?: string;
  };
  orderCount?: number;
  ordersCount?: number;
  status?: string;
  tag?: string;
  subscribedToNewsletter?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CustomersResponse {
  success: boolean;
  data: {
    customers: Customer[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export interface CustomerResponse {
  success: boolean;
  data: Customer;
}

export interface CreateCustomerData {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  address?: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  tag?: string;
  subscribedToNewsletter?: boolean;
}

export async function fetchCustomers(
  filters: CustomerFilters = {},
  token?: string | null
): Promise<CustomersResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.append("page", filters.page.toString());
  if (filters.limit) params.append("limit", filters.limit.toString());
  if (filters.search) params.append("search", filters.search);

  const url = `${CUSTOMERS_BASE}?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch customers: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchCustomer(
  id: string,
  token?: string | null
): Promise<CustomerResponse> {
  const response = await fetch(`${CUSTOMERS_BASE}/${id}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch customer: ${response.statusText}`);
  }

  return response.json();
}

export async function createCustomer(
  data: CreateCustomerData,
  token?: string | null
): Promise<CustomerResponse> {
  const response = await fetch(CUSTOMERS_BASE, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to create customer: ${response.statusText}`);
  }

  return response.json();
}

export async function updateCustomer(
  id: string,
  data: Partial<CreateCustomerData>,
  token?: string | null
): Promise<CustomerResponse> {
  const response = await fetch(`${CUSTOMERS_BASE}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update customer: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteCustomer(
  id: string,
  token?: string | null
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${CUSTOMERS_BASE}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete customer: ${response.statusText}`);
  }

  return response.json();
}

export async function syncCustomerStats(
  token?: string | null
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${CUSTOMERS_BASE}/sync-stats`, {
    method: "POST",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to sync customer stats: ${response.statusText}`);
  }

  return response.json();
}
