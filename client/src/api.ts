// Shared API helper — used by every page.

// Backend base URL. If you change the run port, change it here only.
export const API = "http://localhost:5190/api";

// Single fetch wrapper: attaches the JWT automatically and unwraps the body.
export async function apiFetch(path: string, method = "GET", body: unknown = null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = localStorage.getItem("token");
  if (token) headers.Authorization = "Bearer " + token;

  const res = await fetch(API + path, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const m = (data as { title?: string })?.title || (data as string) || "Error " + res.status;
    throw new Error(String(m));
  }
  return data;
}

// Whether a user is currently logged in.
export function isLoggedIn() {
  return !!localStorage.getItem("token");
}

// Clear the session.
export function logout() {
  localStorage.clear();
}

// ---------- Shared cart (kept in localStorage so both pages see it) ----------
export interface CartLine {
  productId: number;
  name: string;
  price: number;
  qty: number;
}

export function getCart(): CartLine[] {
  try {
    return JSON.parse(localStorage.getItem("cart") || "[]");
  } catch {
    return [];
  }
}

export function addCartLine(p: { productId: number; name: string; price: number }) {
  const lines = getCart();
  const existing = lines.find((i) => i.productId === p.productId);
  if (existing) existing.qty++;
  else lines.push({ ...p, qty: 1 });
  localStorage.setItem("cart", JSON.stringify(lines));
}

export function clearCart() {
  localStorage.removeItem("cart");
}
