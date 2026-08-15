import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { useToast } from "./Toast";

// A coupon as returned by GET /Coupon/all.
interface Coupon {
  couponId: number;
  code: string;
  discountPercent: number;
  expiryDate: string;
}

// One row from GET /Coupon/byUsage — how many orders have used each coupon.
interface Usage {
  couponId: number;
  code: string;
  usageCount: number;
}

// A blank "new coupon" form. expiryDate is a yyyy-mm-dd string from <input type=date>.
const emptyForm = { code: "", discountPercent: 10, expiryDate: "" };

// Admin "Coupons" tab: list coupons with their usage, create new ones, expire a
// coupon immediately, or delete it. Rendered inside the admin-guarded Admin page.
export default function AdminCoupons() {
  const toast = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  // couponId -> how many orders used it (merged in from /Coupon/byUsage).
  const [usage, setUsage] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [adding, setAdding] = useState(false);

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [all, byUsage] = await Promise.all([
        apiFetch("/Coupon/all") as Promise<Coupon[]>,
        apiFetch("/Coupon/byUsage") as Promise<Usage[]>,
      ]);
      setCoupons(all.sort((a, b) => a.code.localeCompare(b.code)));
      // Fold the usage list into a quick id -> count lookup.
      const map: Record<number, number> = {};
      for (const u of byUsage) map[u.couponId] = u.usageCount;
      setUsage(map);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  // A coupon is "active" while its expiry is still in the future.
  const isActive = (c: Coupon) => new Date(c.expiryDate) > new Date();

  async function create() {
    // Validate here because the backend's /update path skips these checks; we
    // keep the UI honest and give instant feedback.
    if (!form.code.trim()) return toast("Enter a coupon code.", "info");
    if (form.discountPercent <= 0 || form.discountPercent > 100)
      return toast("Discount must be between 1 and 100.", "info");
    if (!form.expiryDate || new Date(form.expiryDate) <= new Date())
      return toast("Pick an expiry date in the future.", "info");

    setAdding(true);
    try {
      await apiFetch("/Coupon/add", "POST", {
        code: form.code.trim(),
        discountPercent: form.discountPercent,
        expiryDate: form.expiryDate,
      });
      toast(`Coupon "${form.code.trim()}" created.`, "success");
      setForm(emptyForm);
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setAdding(false);
    }
  }

  async function expireNow(c: Coupon) {
    try {
      await apiFetch(`/Coupon/expireNow?id=${c.couponId}`, "PATCH");
      toast(`Coupon "${c.code}" expired.`, "info");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function remove(c: Coupon) {
    if (!confirm(`Delete coupon "${c.code}"?`)) return;
    try {
      // The backend returns 409 if any order used this coupon; surface that.
      await apiFetch(`/Coupon/delete?id=${c.couponId}`, "DELETE");
      toast(`Coupon "${c.code}" deleted.`, "success");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <div>
      {/* --- Create form --- */}
      <div className="mb-6 rounded-2xl bg-white/60 p-5 shadow-sm">
        <h3 className="mb-3 font-bold text-ink">New coupon</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-ink/50">
            Code
            <input
              className="mt-1 block w-40 rounded-full border border-ink/15 px-3 py-2 text-sm outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-100"
              placeholder="WELCOME10"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </label>
          <label className="text-xs text-ink/50">
            Discount %
            <input
              type="number"
              min={1}
              max={100}
              className="mt-1 block w-28 rounded-full border border-ink/15 px-3 py-2 text-sm outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-100"
              value={form.discountPercent}
              onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })}
            />
          </label>
          <label className="text-xs text-ink/50">
            Expires
            <input
              type="date"
              className="mt-1 block rounded-full border border-ink/15 px-3 py-2 text-sm outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-100"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
          </label>
          <button
            onClick={create}
            disabled={adding}
            className="rounded-full bg-terracotta-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-terracotta-600 disabled:bg-ink/5"
          >
            {adding ? "Adding…" : "Add coupon"}
          </button>
        </div>
      </div>

      {/* --- Coupons table --- */}
      {loading ? (
        <p className="text-sm text-ink/40">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white/60 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-terracotta-50 text-xs uppercase text-ink/50">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Used by</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {coupons.map((c) => (
                <tr key={c.couponId} className="hover:bg-ink/5">
                  <td className="px-4 py-3 font-medium text-ink">{c.code}</td>
                  <td className="px-4 py-3">{c.discountPercent}%</td>
                  <td className="px-4 py-3 text-ink/50">
                    {new Date(c.expiryDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {isActive(c) ? (
                      <span className="rounded-full bg-sage-100 px-2 py-0.5 text-xs font-medium text-sage-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink/50">
                        Expired
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink/50">{usage[c.couponId] ?? 0} orders</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => expireNow(c)}
                        disabled={!isActive(c)}
                        className="rounded-full border border-ink/15 px-2.5 py-1 text-xs font-medium text-ink/70 hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Expire now
                      </button>
                      <button
                        onClick={() => remove(c)}
                        className="rounded-full border border-terracotta-200 px-2.5 py-1 text-xs font-medium text-terracotta-700 hover:bg-terracotta-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink/40">
                    No coupons yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
