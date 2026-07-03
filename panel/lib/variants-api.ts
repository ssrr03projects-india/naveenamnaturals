import { API_BASE_URL, getAuthHeaders } from "./api";

const VARIANTS_BASE = `${API_BASE_URL}/api/variants`;

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
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateVariantData {
    name: string;
    sku: string;
    price: number;
    mrpPrice?: number | null;
    gstPercentage?: number | null;
    stock?: number;
    customStock?: string | null;
    weight?: string;
    length?: number | string | null;
    width?: number | string | null;
    height?: number | string | null;
    sortOrder?: number;
    isActive?: boolean;
}

export interface VariantsResponse {
    success: boolean;
    data: ProductVariant[];
}

export interface VariantResponse {
    success: boolean;
    data: ProductVariant;
    message?: string;
}

export interface BulkCreateVariantsData {
    variants: CreateVariantData[];
}

// Get all variants for a product
export async function fetchProductVariants(
    productId: number | string,
    token?: string | null
): Promise<VariantsResponse> {
    const response = await fetch(`${VARIANTS_BASE}/product/${productId}`, {
        method: "GET",
        headers: getAuthHeaders(token),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch variants: ${response.statusText}`);
    }

    return response.json();
}

// Create a single variant
export async function createVariant(
    productId: number | string,
    variantData: CreateVariantData,
    token?: string | null
): Promise<VariantResponse> {
    const response = await fetch(`${VARIANTS_BASE}/product/${productId}`, {
        method: "POST",
        headers: {
            ...getAuthHeaders(token),
            "Content-Type": "application/json",
        },
        body: JSON.stringify(variantData),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to create variant: ${response.statusText}`);
    }

    return response.json();
}

// Bulk create variants
export async function bulkCreateVariants(
    productId: number | string,
    variants: CreateVariantData[],
    token?: string | null
): Promise<{ success: boolean; message: string; data: ProductVariant[] }> {
    const response = await fetch(`${VARIANTS_BASE}/product/${productId}/bulk`, {
        method: "POST",
        headers: {
            ...getAuthHeaders(token),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ variants }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to create variants: ${response.statusText}`);
    }

    return response.json();
}

// Update a variant
export async function updateVariant(
    variantId: number | string,
    variantData: Partial<CreateVariantData>,
    token?: string | null
): Promise<VariantResponse> {
    const response = await fetch(`${VARIANTS_BASE}/${variantId}`, {
        method: "PUT",
        headers: {
            ...getAuthHeaders(token),
            "Content-Type": "application/json",
        },
        body: JSON.stringify(variantData),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to update variant: ${response.statusText}`);
    }

    return response.json();
}

// Delete a variant
export async function deleteVariant(
    variantId: number | string,
    token?: string | null
): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${VARIANTS_BASE}/${variantId}`, {
        method: "DELETE",
        headers: getAuthHeaders(token),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to delete variant: ${response.statusText}`);
    }

    return response.json();
}

// Helper function to generate SKU from product slug and variant name
export function generateVariantSKU(productSlug: string, variantName: string): string {
    const cleanSlug = productSlug.toUpperCase().replace(/[^A-Z0-9]/g, '-');
    const cleanName = variantName.toUpperCase().replace(/[^A-Z0-9]/g, '-');
    return `${cleanSlug}-${cleanName}`;
}

// Helper function to validate variant data
export function validateVariantData(variant: CreateVariantData): string | null {
    if (!variant.name || variant.name.trim() === '') {
        return 'Variant name is required';
    }

    if (!variant.sku || variant.sku.trim() === '') {
        return 'SKU is required';
    }

    if (!variant.price || variant.price <= 0) {
        return 'Price must be greater than 0';
    }

    if (variant.mrpPrice && variant.price > variant.mrpPrice) {
        return 'Price cannot be greater than MRP';
    }

    return null;
}
