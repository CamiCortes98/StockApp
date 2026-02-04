export type ApiError = { message?: string; errors?: any };

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function getToken(): string | null {
  return localStorage.getItem("token");
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem("token");
  else localStorage.setItem("token", token);
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as any),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: ApiError = data || { message: "Error" };
    throw err;
  }
  return data as T;
}

export type User = { id: string; name: string; email: string; role: "admin" | "user" };
export type Product = { _id: string; name: string; brand?: string; notes?: string };
export type Movement = {
  _id: string;
  product: { _id: string; name: string };
  type: "IN" | "OUT";
  quantity: number;
  lot?: string;
  diopters?: string;
  expirationDate?: string | null;
  performedBy: { _id: string; name: string; email: string; role: string };
  note?: string;
  createdAt: string;
};

export type SummaryPosition = {
  productId: string;
  productName: string;
  lot: string;
  diopters: string;
  expirationDate: string | null;
  quantity: number;
  lastMovementAt: string;
};

export async function apiHealth() {
  return request<{ ok: boolean; ts: string }>("/api/health", { method: "GET" });
}

export async function register(name: string, email: string, password: string) {
  return request<{ token: string; user: User }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function login(email: string, password: string) {
  return request<{ token: string; user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function me() {
  return request<{ user: any }>("/api/auth/me", { method: "GET" });
}

export async function listProducts() {
  return request<{ products: Product[] }>("/api/products", { method: "GET" });
}

export async function createProduct(payload: { name: string; brand?: string; notes?: string }) {
  return request<{ product: Product }>("/api/products", { method: "POST", body: JSON.stringify(payload) });
}

export async function deleteProduct(id: string) {
  return request<{ ok: true }>(`/api/products/${id}`, { method: "DELETE" });
}

export async function listMovements(limit = 200) {
  return request<{ movements: Movement[] }>(`/api/movements?limit=${limit}`, { method: "GET" });
}

export async function createMovement(payload: any) {
  return request<{ movement: Movement }>("/api/movements", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateMovement(id: string, payload: any) {
  return request<{ movement: Movement }>(`/api/movements/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteMovement(id: string) {
  return request<{ ok: true }>(`/api/movements/${id}`, { method: "DELETE" });
}

export async function bulkDeleteMovements(ids: string[]) {
  return request<{ deletedCount: number }>(`/api/movements/bulk-delete`, { method: "POST", body: JSON.stringify({ ids }) });
}

export async function getSummary(soonDays = 30) {
  return request<{ totals: any; positions: SummaryPosition[] }>(`/api/summary?soonDays=${soonDays}`, { method: "GET" });
}

export async function listUsers() {
  return request<{ users: any[] }>(`/api/users`, { method: "GET" });
}

export async function createUser(payload: any) {
  return request<{ user: any }>(`/api/users`, { method: "POST", body: JSON.stringify(payload) });
}

export async function deactivateUser(id: string) {
  return request<{ ok: true }>(`/api/users/${id}`, { method: "DELETE" });
}
