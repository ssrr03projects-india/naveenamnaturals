import { API_BASE_URL, getAuthHeaders } from "./api";

const EMAIL_BASE = `${API_BASE_URL}/api/email`;

export type ContactStatus = "new" | "read" | "replied" | "archived";

export interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  status: ContactStatus;
  adminNotes?: string | null;
  repliedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactStats {
  total: number;
  new: number;
  read: number;
  replied: number;
  archived: number;
}

export interface ContactsResponse {
  success: boolean;
  data: ContactSubmission[];
  stats: ContactStats;
}

export async function fetchContacts(
  params: { status?: ContactStatus | "all"; search?: string } = {},
  token?: string | null
): Promise<ContactsResponse> {
  const searchParams = new URLSearchParams();
  if (params.status && params.status !== "all") searchParams.set("status", params.status);
  if (params.search) searchParams.set("search", params.search);

  const url = `${EMAIL_BASE}/contacts${searchParams.toString() ? `?${searchParams}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch contacts: ${response.statusText}`);
  }

  return response.json();
}

export async function updateContactStatus(
  id: number,
  data: { status?: ContactStatus; adminNotes?: string },
  token?: string | null
): Promise<{ success: boolean; message: string; data: ContactSubmission }>{
  const response = await fetch(`${EMAIL_BASE}/contacts/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || `Failed to update contact: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteContact(
  id: number,
  token?: string | null
): Promise<{ success: boolean; message: string }>{
  const response = await fetch(`${EMAIL_BASE}/contacts/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || `Failed to delete contact: ${response.statusText}`);
  }

  return response.json();
}
