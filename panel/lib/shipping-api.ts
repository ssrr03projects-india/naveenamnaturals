import { API_BASE_URL, getAuthHeaders } from "./api";

const SHIPPING_BASE = `${API_BASE_URL}/api/shipping`;

export interface ShipmentResponse {
  success: boolean;
  data: unknown;
  message?: string;
  awbNumber?: string;
  providerCancelledOrderIds?: string[];
  notCancelledOrderIds?: string[];
  providerCancelledAwbs?: string[];
  notCancelledAwbs?: string[];
}

export async function createShipment(
  consignmentData: Record<string, unknown>,
  token?: string | null,
): Promise<ShipmentResponse> {
  const response = await fetch(`${SHIPPING_BASE}/create-shipment`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(consignmentData),
  });

  // Handle non-200 responses gracefully
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message ||
        errorData.error ||
        `Failed to create shipment: ${response.statusText}`,
    );
  }

  return response.json();
}

export async function createProviderOrder(
  consignmentData: Record<string, unknown>,
  token?: string | null,
): Promise<ShipmentResponse> {
  const response = await fetch(`${SHIPPING_BASE}/create-provider-order`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(consignmentData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message ||
        errorData.error ||
        `Failed to create Shiprocket order: ${response.statusText}`,
    );
  }

  return response.json();
}

export async function getShippingLabel(
  referenceNumber: string,
  token?: string | null,
): Promise<Blob> {
  const response = await fetch(
    `${SHIPPING_BASE}/label?referenceNumber=${referenceNumber}`,
    {
      method: "GET",
      headers: getAuthHeaders(token),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to get label: ${response.statusText}`);
  }

  return response.blob();
}

export async function cancelShipment(
  orderIds: string[],
  token?: string | null,
): Promise<ShipmentResponse> {
  const response = await fetch(`${SHIPPING_BASE}/cancel`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ orderIds }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message ||
        `Failed to cancel Shiprocket order: ${response.statusText}`,
    );
  }

  return response.json();
}

export async function trackShipment(
  awbNumber: string,
  token?: string | null,
  options?: { sync?: boolean },
): Promise<ShipmentResponse> {
  const searchParams = new URLSearchParams({
    awbNumber,
  });
  if (options?.sync === false) {
    searchParams.set("sync", "false");
  }
  const response = await fetch(
    `${SHIPPING_BASE}/track?${searchParams.toString()}`,
    {
      method: "GET",
      headers: token
        ? getAuthHeaders(token)
        : { "Content-Type": "application/json" },
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to track shipment: ${response.statusText}`,
    );
  }

  return response.json();
}
