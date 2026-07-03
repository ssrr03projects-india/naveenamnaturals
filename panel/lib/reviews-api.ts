import { API_BASE_URL, getAuthHeaders } from "./api";

const REVIEWS_BASE = `${API_BASE_URL}/api/reviews`;

export interface Review {
  id: number;
  customerId?: number;
  customerName: string;
  customerEmail: string;
  productId: number;
  productName: string;
  rating: number;
  comment: string;
  images?: string[];
  adminReply?: string;
  status: "pending" | "approved" | "rejected";
  helpfulCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewFilters {
  page?: number;
  limit?: number;
  status?: string;
  productId?: string;
  rating?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface ReviewsResponse {
  success: boolean;
  data: {
    reviews: Review[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export interface ReviewResponse {
  success: boolean;
  data: Review;
}

export interface CreateReviewData {
  customerId?: number;
  customerName: string;
  customerEmail: string;
  productId: number;
  rating: number;
  comment: string;
  images?: string[];
}

export interface UpdateReviewData {
  status?: "pending" | "approved" | "rejected";
  adminReply?: string;
}

export async function fetchReviews(
  filters: ReviewFilters = {},
  token?: string | null
): Promise<ReviewsResponse> {
  const params = new URLSearchParams();
  
  if (filters.page) params.append("page", filters.page.toString());
  if (filters.limit) params.append("limit", filters.limit.toString());
  if (filters.status) params.append("status", filters.status);
  if (filters.productId) params.append("productId", filters.productId);
  if (filters.rating) params.append("rating", filters.rating);
  if (filters.sortBy) params.append("sortBy", filters.sortBy);
  if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

  const url = `${REVIEWS_BASE}?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch reviews: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Parse images field if it's a string
  if (data.success && data.data && data.data.reviews) {
    data.data.reviews = data.data.reviews.map((review: Review) => ({
      ...review,
      images: typeof review.images === 'string' ? JSON.parse(review.images || '[]') : (review.images || []),
    }));
  }

  return data;
}

export async function fetchReview(
  id: string,
  token?: string | null
): Promise<ReviewResponse> {
  const response = await fetch(`${REVIEWS_BASE}/${id}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch review: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Parse images field if it's a string
  if (data.success && data.data) {
    data.data.images = typeof data.data.images === 'string' 
      ? JSON.parse(data.data.images || '[]') 
      : (data.data.images || []);
  }

  return data;
}

export async function createReview(
  reviewData: CreateReviewData,
  token?: string | null
): Promise<{ success: boolean; message: string; data: Review }> {
  const response = await fetch(REVIEWS_BASE, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(reviewData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to create review: ${response.statusText}`);
  }

  return response.json();
}

export async function updateReview(
  id: string,
  reviewData: UpdateReviewData,
  token?: string | null
): Promise<{ success: boolean; message: string }> {
  // Use the approve endpoint for status updates
  const response = await fetch(`${REVIEWS_BASE}/${id}/approve`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(reviewData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to update review: ${response.statusText}`);
  }

  return response.json();
}

export async function approveReview(
  id: string,
  token?: string | null
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${REVIEWS_BASE}/${id}/approve`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status: "approved" }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to approve review: ${response.statusText}`);
  }

  return response.json();
}

export async function rejectReview(
  id: string,
  token?: string | null
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${REVIEWS_BASE}/${id}/approve`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status: "rejected" }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to reject review: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteReview(
  id: string,
  token?: string | null
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${REVIEWS_BASE}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to delete review: ${response.statusText}`);
  }

  return response.json();
}
