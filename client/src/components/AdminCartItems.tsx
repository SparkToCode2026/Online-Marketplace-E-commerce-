import { useEffect, useRef, useState } from "react";
import { apiFetch, formatOMR } from "../api";
import { useToast } from "./Toast";

// A cart item as returned by GET /CartItem/all and /CartItem/filter. The backend
// includes the parent cart and the product, so each row can show whose cart it
// is in and whether the product is still available.
interface CartItem {
  cartItemId: number;
  cartId: number;
  quantity: number;
  product?: { name: string; price: number; isActive: boolean } | null;
  cart?: { cartId: number; userId: number } | null;
}

// Filters map to the backend Where clause: "all" hits /CartItem/all; the rest
// hit /CartItem/filter?status=… (active/inactive by product availability).
const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active product" },
  { key: "inactive", label: "Inactive product" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

// Admin "Cart Items" tab: every line item across all carts, filterable by the
// product's availability.
export default function AdminCartItems() {
  const toast = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
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
      const path = f === "all" ? "/CartItem/all" : `/CartItem/filter?status=${f}`;
      const data = (await apiFetch(path)) as CartItem[];
      setItems(data);
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

  return (
    <div>
      {/* Availability filter pills — each reloads from the backend Where filter. */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => changeFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filter === f.key ? "bg-accent-500 text-white" : "bg-white/60 text-ink/70 hover:bg-ink/5"
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
          <p className="mb-3 text-sm text-ink/50">{items.length} items</p>
          <div className="overflow-hidden rounded-2xl bg-white/60 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-accent-100 text-xs uppercase text-ink/50">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Cart</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Line total</th>
                  <th className="px-4 py-3">Product status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {items.map((it) => (
                  <tr key={it.cartItemId} className="hover:bg-ink/5">
                    <td className="px-4 py-3 font-medium text-ink">{it.product?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-ink/60">#{it.cartId}</td>
                    <td className="px-4 py-3 text-ink/60">
                      {it.cart ? `User #${it.cart.userId}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink/60">{it.quantity}</td>
                    <td className="px-4 py-3 font-semibold text-accent-700">
                      {formatOMR((it.product?.price ?? 0) * it.quantity)}
                    </td>
                    <td className="px-4 py-3">
                      {it.product?.isActive ? (
                        <span className="rounded-full bg-sage-100 px-2 py-0.5 text-xs font-medium text-sage-700">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink/40">
                      No cart items.
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
