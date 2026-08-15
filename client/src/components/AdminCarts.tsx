import { useEffect, useRef, useState } from "react";
import { apiFetch, formatOMR } from "../api";
import { useToast } from "./Toast";

// A cart as returned by GET /Cart/all (admin view). The backend includes each
// cart's owner and every line's product, so we can show who owns the cart and
// exactly what's inside it.
interface CartItem {
  cartItemId: number;
  quantity: number;
  product?: { name: string; price: number } | null;
}

interface Cart {
  cartId: number;
  userId: number;
  createdAt: string;
  user?: { username: string; email: string; role: string } | null;
  cartItems?: CartItem[] | null;
}

// The activity filters offered in the UI. "all" hits /Cart/all; the rest hit
// /Cart/filter?status=… which the backend translates into a Where clause.
const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "abandoned", label: "Abandoned" },
  { key: "empty", label: "Empty" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

// Admin "Carts" tab: a read-only overview of every user's cart — owner, item
// count, contents, running total and when it was created — with an activity filter.
export default function AdminCarts() {
  const toast = useToast();
  const [carts, setCarts] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(f: FilterKey) {
    setLoading(true);
    try {
      const path = f === "all" ? "/Cart/all" : `/Cart/filter?status=${f}`;
      const data = (await apiFetch(path)) as Cart[];
      // Busiest carts first, so active shoppers surface at the top.
      setCarts(data.sort((a, b) => (b.cartItems?.length ?? 0) - (a.cartItems?.length ?? 0)));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  function changeFilter(f: FilterKey) {
    setFilter(f);
    load(f);
  }

  const units = (c: Cart) => (c.cartItems ?? []).reduce((s, i) => s + i.quantity, 0);
  const total = (c: Cart) =>
    (c.cartItems ?? []).reduce((s, i) => s + (i.product?.price ?? 0) * i.quantity, 0);

  return (
    <div>
      {/* Activity filter pills — each reloads from the backend Where filter. */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => changeFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filter === f.key
                ? "bg-accent-500 text-white"
                : "bg-white/60 text-ink/70 hover:bg-ink/5"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Loading…</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink/50">{carts.length} carts</p>
          <div className="overflow-hidden rounded-2xl bg-white/60 shadow-sm">
            <table className="w-full text-left text-sm">
          <thead className="bg-accent-100 text-xs uppercase text-ink/50">
            <tr>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Contents</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {carts.map((c) => (
              <tr key={c.cartId} className="align-top hover:bg-ink/5">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{c.user?.username ?? `User #${c.userId}`}</div>
                  {c.user?.email && <div className="text-xs text-ink/50">{c.user.email}</div>}
                </td>
                <td className="px-4 py-3 text-ink/60">{units(c)}</td>
                <td className="px-4 py-3 text-ink/60">
                  {(c.cartItems?.length ?? 0) === 0
                    ? "—"
                    : c.cartItems!.map((i) => `${i.quantity}× ${i.product?.name ?? "item"}`).join(", ")}
                </td>
                <td className="px-4 py-3 font-semibold text-accent-700">{formatOMR(total(c))}</td>
                <td className="px-4 py-3 text-ink/50">{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {carts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink/40">
                  No carts yet.
                </td>
              </tr>
            )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
