import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmDialog";
import { FieldError, fieldRing, isClean, type Errors } from "../lib/formErrors";

// A coupon row from GET /Coupon/usage. That endpoint already carries every
// field this screen needs — the flag, the limit and the live usage count — so
// it replaces the old /Coupon/all + /Coupon/byUsage pair with one request.
interface Coupon {
  couponId: number;
  code: string;
  discountPercent: number;
  expiryDate: string;
  isActive: boolean;
  usageLimit: number | null;
  usageCount: number;
  remainingUses: number | null;
}

// A blank "new coupon" form. expiryDate is a yyyy-mm-dd string from <input type=date>.
// usageLimit is "" for unlimited.
const emptyForm = { code: "", discountPercent: 10, expiryDate: "", usageLimit: "" };

// Admin "Coupons" tab: list coupons with their usage, create new ones, expire a
// coupon immediately, or delete it. Rendered inside the admin-guarded Admin page.
export default function AdminCoupons() {
  const toast = useToast();
  const confirm = useConfirm();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Errors<keyof typeof emptyForm>>({});
  const [adding, setAdding] = useState(false);

  // Update one field and clear its error as the user edits it.
  function updateForm<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((errs) => (errs[key] ? { ...errs, [key]: undefined } : errs));
  }

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
      const rows = (await apiFetch("/Coupon/usage")) as Coupon[];
      setCoupons(rows.sort((a, b) => a.code.localeCompare(b.code)));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  // A coupon is usable only if it's switched on, still in date, and under its
  // usage limit — the same three conditions the backend checks.
  const notExpired = (c: Coupon) => new Date(c.expiryDate) > new Date();
  const limitReached = (c: Coupon) => c.usageLimit != null && c.usageCount >= c.usageLimit;

  // Label describing why a coupon isn't usable (first blocking reason wins).
  function statusOf(c: Coupon) {
    if (!c.isActive) return { text: "Disabled", cls: "bg-ink/5 text-ink/50" };
    if (!notExpired(c)) return { text: "Expired", cls: "bg-ink/5 text-ink/50" };
    if (limitReached(c)) return { text: "Limit reached", cls: "bg-accent-100 text-accent-700" };
    return { text: "Active", cls: "bg-sage-100 text-sage-700" };
  }

  function validate() {
    // Validate here because the backend's /update path skips these checks; we
    // keep the UI honest and give instant feedback.
    const errs: Errors<keyof typeof emptyForm> = {};
    if (!form.code.trim()) errs.code = "Code is required.";
    if (form.discountPercent <= 0 || form.discountPercent > 100)
      errs.discountPercent = "Discount must be between 1 and 100.";
    if (!form.expiryDate || new Date(form.expiryDate) <= new Date())
      errs.expiryDate = "Pick an expiry date in the future.";
    return errs;
  }

  async function create() {
    const errs = validate();
    setErrors(errs);
    if (!isClean(errs)) return;

    setAdding(true);
    try {
      await apiFetch("/Coupon/add", "POST", {
        code: form.code.trim(),
        discountPercent: form.discountPercent,
        expiryDate: form.expiryDate,
        // Blank means unlimited; the backend takes null for that.
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      });
      toast(`Coupon "${form.code.trim()}" created.`, "success");
      setForm(emptyForm);
      setErrors({});
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setAdding(false);
    }
  }

  // Reversible on/off switch, unlike expireNow which rewrites the expiry date.
  async function toggle(c: Coupon) {
    try {
      await apiFetch(`/Coupon/toggle?id=${c.couponId}`, "PATCH");
      toast(`Coupon "${c.code}" ${c.isActive ? "disabled" : "enabled"}.`, "info");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  // Hard-expire: sets the expiry to now. Irreversible, so it asks first.
  async function expireNow(c: Coupon) {
    const ok = await confirm(
      `Expire "${c.code}" now? Unlike disabling, this rewrites the expiry date and can't be undone.`,
      { title: "Expire coupon", confirmLabel: "Expire" },
    );
    if (!ok) return;
    try {
      await apiFetch(`/Coupon/expireNow?id=${c.couponId}`, "PATCH");
      toast(`Coupon "${c.code}" expired.`, "info");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function remove(c: Coupon) {
    const ok = await confirm(`Delete coupon "${c.code}"?`, {
      title: "Delete coupon",
      confirmLabel: "Delete",
    });
    if (!ok) return;
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
              className={`mt-1 block w-40 rounded-full border px-3 py-2 text-sm outline-none focus:ring-2 ${fieldRing(!!errors.code)}`}
              placeholder="WELCOME10"
              value={form.code}
              onChange={(e) => updateForm("code", e.target.value)}
              aria-invalid={!!errors.code}
            />
            <FieldError msg={errors.code} />
          </label>
          <label className="text-xs text-ink/50">
            Discount %
            <input
              type="number"
              min={1}
              max={100}
              className={`mt-1 block w-28 rounded-full border px-3 py-2 text-sm outline-none focus:ring-2 ${fieldRing(!!errors.discountPercent)}`}
              value={form.discountPercent}
              onChange={(e) => updateForm("discountPercent", Number(e.target.value))}
              aria-invalid={!!errors.discountPercent}
            />
            <FieldError msg={errors.discountPercent} />
          </label>
          <label className="text-xs text-ink/50">
            Expires
            <input
              type="date"
              className={`mt-1 block rounded-full border px-3 py-2 text-sm outline-none focus:ring-2 ${fieldRing(!!errors.expiryDate)}`}
              value={form.expiryDate}
              onChange={(e) => updateForm("expiryDate", e.target.value)}
              aria-invalid={!!errors.expiryDate}
            />
            <FieldError msg={errors.expiryDate} />
          </label>
          <label className="text-xs text-ink/50">
            Usage limit
            <input
              type="number"
              min={1}
              className="mt-1 block w-32 rounded-full border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
              placeholder="Unlimited"
              value={form.usageLimit}
              onChange={(e) => updateForm("usageLimit", e.target.value)}
            />
          </label>
          <button
            onClick={create}
            disabled={adding}
            className="rounded-full bg-accent-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-600 disabled:bg-ink/5"
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
            <thead className="bg-accent-100 text-xs uppercase text-ink/50">
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
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusOf(c).cls}`}
                    >
                      {statusOf(c).text}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink/50">
                    {c.usageCount} {c.usageCount === 1 ? "order" : "orders"}
                    {c.usageLimit != null && (
                      <span className="block text-xs text-ink/40">
                        limit {c.usageLimit} · {Math.max(c.remainingUses ?? 0, 0)} left
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => toggle(c)}
                        className="rounded-full border border-ink/15 px-2.5 py-1 text-xs font-medium text-ink/70 hover:bg-ink/5"
                      >
                        {c.isActive ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => expireNow(c)}
                        disabled={!notExpired(c)}
                        className="rounded-full border border-ink/15 px-2.5 py-1 text-xs font-medium text-ink/70 hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Expire now
                      </button>
                      <button
                        onClick={() => remove(c)}
                        className="rounded-full border border-accent-200 px-2.5 py-1 text-xs font-medium text-accent-700 hover:bg-accent-100"
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
