import { API_BASE_URL, getAuthHeaders } from "./api";

const CATEGORIES_BASE = `${API_BASE_URL}/api/categories`;

export interface Category {
    id: number;
    name: string;
    slug: string;
    description?: string;
    parentId?: number | null;
    image?: string;
    sortOrder: number;
    isActive: boolean;
    parent?: Category;
    children?: Category[];
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateCategoryData {
    name: string;
    slug: string;
    description?: string;
    parentId?: number | null;
    image?: string;
    sortOrder?: number;
    isActive?: boolean;
}

export interface UpdateCategoryData {
    name?: string;
    slug?: string;
    description?: string;
    parentId?: number | null;
    image?: string;
    sortOrder?: number;
    isActive?: boolean;
}

export interface CategoriesResponse {
    success: boolean;
    message?: string;
    data: Category[];
}

export interface CategoryTreeResponse {
    success: boolean;
    message?: string;
    data: Category[];
}

export interface SingleCategoryResponse {
    success: boolean;
    message?: string;
    data: Category;
}

// Fetch all categories (flat list)
export async function fetchCategories(token?: string | null): Promise<CategoriesResponse> {
    const response = await fetch(CATEGORIES_BASE, {
        method: "GET",
        headers: getAuthHeaders(token),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch categories");
    }

    return response.json();
}

// Fetch category tree (hierarchical)
export async function fetchCategoryTree(token?: string | null): Promise<CategoryTreeResponse> {
    const response = await fetch(`${CATEGORIES_BASE}/tree`, {
        method: "GET",
        headers: getAuthHeaders(token),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch category tree");
    }

    return response.json();
}

// Fetch single category
export async function fetchCategory(id: number | string, token?: string | null): Promise<SingleCategoryResponse> {
    const response = await fetch(`${CATEGORIES_BASE}/${id}`, {
        method: "GET",
        headers: getAuthHeaders(token),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch category");
    }

    return response.json();
}

// Create category
export async function createCategory(data: CreateCategoryData, token?: string | null): Promise<SingleCategoryResponse> {
    const response = await fetch(CATEGORIES_BASE, {
        method: "POST",
        headers: {
            ...getAuthHeaders(token),
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create category");
    }

    return response.json();
}

// Update category
export async function updateCategory(id: number | string, data: UpdateCategoryData, token?: string | null): Promise<SingleCategoryResponse> {
    const response = await fetch(`${CATEGORIES_BASE}/${id}`, {
        method: "PUT",
        headers: {
            ...getAuthHeaders(token),
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update category");
    }

    return response.json();
}

// Delete category
export async function deleteCategory(id: number | string, token?: string | null): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${CATEGORIES_BASE}/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(token),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete category");
    }

    return response.json();
}
