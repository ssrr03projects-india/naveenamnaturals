import { API_BASE_URL, getAuthHeaders } from "./api";

const HOMEPAGE_BASE = `${API_BASE_URL}/api/home`;

export interface HomeSlider {
  id: number;
  image: string;
  link?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface HomeSlidersResponse {
  success: boolean;
  data: HomeSlider[];
}

export interface HomeSliderResponse {
  success: boolean;
  message?: string;
  data: HomeSlider;
}

export interface CreateSliderData {
  image: File;
  link?: string;
  sortOrder?: number;
}

export interface UpdateSliderData {
  image?: File;
  link?: string;
  sortOrder?: number;
}

export async function fetchSliders(
  token?: string | null
): Promise<HomeSlidersResponse> {
  const response = await fetch(`${HOMEPAGE_BASE}/slider`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sliders: ${response.statusText}`);
  }

  return response.json();
}

export async function createSlider(
  sliderData: CreateSliderData,
  token?: string | null
): Promise<HomeSliderResponse> {
  const formData = new FormData();
  formData.append("image", sliderData.image);
  if (sliderData.link) {
    formData.append("link", sliderData.link);
  }
  if (sliderData.sortOrder !== undefined) {
    formData.append("sortOrder", sliderData.sortOrder.toString());
  }

  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  // Don't set Content-Type for FormData - browser will set it with boundary

  const response = await fetch(`${HOMEPAGE_BASE}/slider`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to create slider: ${response.statusText}`);
  }

  return response.json();
}

export async function updateSlider(
  id: string,
  sliderData: UpdateSliderData,
  token?: string | null
): Promise<HomeSliderResponse> {
  const formData = new FormData();
  if (sliderData.image) {
    formData.append("image", sliderData.image);
  }
  if (sliderData.link !== undefined) {
    formData.append("link", sliderData.link || "");
  }
  if (sliderData.sortOrder !== undefined) {
    formData.append("sortOrder", sliderData.sortOrder.toString());
  }

  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  // Don't set Content-Type for FormData

  const response = await fetch(`${HOMEPAGE_BASE}/slider/${id}`, {
    method: "PUT",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to update slider: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteSlider(
  id: string,
  token?: string | null
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${HOMEPAGE_BASE}/slider/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to delete slider: ${response.statusText}`);
  }

  return response.json();
}

// Helper to get full image URL
export function getImageUrl(imagePath: string): string {
  if (!imagePath) return "";
  if (imagePath.startsWith("http")) return imagePath;
  return `${API_BASE_URL}${imagePath}`;
}
