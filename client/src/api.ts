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

// Whether the logged-in user is an admin (role comes from the login response).
export function isAdmin() {
  return localStorage.getItem("role") === "Admin";
}

// Clear the session.
export function logout() {
  localStorage.clear();
}

// Resolves this user's cart id (cached in localStorage). Creates one on
// first use; if the user already has a cart (create returns 409, e.g. the
// seeded demo accounts) it looks theirs up from /Cart/all instead.
export async function ensureCart(): Promise<number | null> {
  const saved = localStorage.getItem("cartId");
  if (saved) return Number(saved);

  const userId = Number(localStorage.getItem("userId"));
  try {
    const id = (await apiFetch(`/Cart/create?userId=${userId}`, "POST")) as number;
    localStorage.setItem("cartId", String(id));
    return id;
  } catch {
    try {
      const carts = (await apiFetch("/Cart/all")) as { cartId: number; userId: number }[];
      const mine = carts.find((c) => c.userId === userId);
      if (mine) {
        localStorage.setItem("cartId", String(mine.cartId));
        return mine.cartId;
      }
    } catch {
      /* fall through to null */
    }
    return null;
  }
}
