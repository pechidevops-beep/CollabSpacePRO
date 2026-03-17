import { supabase } from "@/lib/supabaseClient";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

if (!apiBaseUrl) {
  throw new Error("Missing VITE_API_BASE_URL");
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.access_token;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();

  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }

  const res = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    let details: unknown;
    try {
      details = await res.json();
    } catch {
      details = await res.text().catch(() => undefined);
    }
    const message =
      typeof details === "object" && details && "message" in details
        ? String((details as { message?: unknown }).message ?? "Request failed")
        : "Request failed";
    throw new ApiError(message, res.status, details);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
