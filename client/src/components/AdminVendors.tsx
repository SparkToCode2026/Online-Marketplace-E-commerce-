import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmDialog";
import { SearchIcon } from "./icons";

// A vendor profile as returned by GET /VendorProfile/filter (admin view).
// `users` rides along (Include on the backend) so we can show the owner.
// Note: the backend property is spelled `createdaAt`.
interface VendorProfile {
  vendorProfileId: number;
  storeName: string;
  address: string;
  createdaAt: string;
  userId: number;
  isVerified: boolean;
  users?: { username: string; email: string };
}

// Verification filter pills, translated into the ?isVerified= query.
const VERIFICATION = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified" },
  { key: "pending", label: "Pending" },
] as const;
type VerificationKey = (typeof VERIFICATION)[number]["key"];

// Show the default sentinel date as "—" instead of 1/1/0001.
function created(iso: string) {
  const d = new Date(iso);
  return d.getFullYear() > 1 ? d.toLocaleDateString() : "—";
}

// Admin "Vendors" tab: filter storefronts server-side (verification / store-name
// search) and verify a pending store.
// Backed by GET /VendorProfile/filter and PATCH /VendorProfile/verify.
export default function AdminVendors() {
  const toast = useToast();
  const confirm = useConfirm();
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<VerificationKey>("all");
  const [search, setSearch] = useState("");

  // Server-side filter: rebuild the query whenever a filter changes, debounced
  // so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verification, search]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (verification !== "all") params.set("isVerified", String(verification === "verified"));
      if (search.trim()) params.set("search", search.trim());
      const qs = params.toString();
      const data = (await apiFetch(`/VendorProfile/filter${qs ? `?${qs}` : ""}`)) as VendorProfile[];
      setVendors(data.sort((a, b) => a.vendorProfileId - b.vendorProfileId));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function verify(v: VendorProfile) {
    const ok = await confirm(
      `Verify "${v.storeName}"? It will be marked as an approved storefront.`,
      { title: "Verify store", confirmLabel: "Verify", tone: "default" },
    );
    if (!ok) return;
    try {
      await apiFetch(`/VendorProfile/verify?id=${v.vendorProfileId}`, "PATCH");
      toast(`"${v.storeName}" is now verified.`, "success");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <div>
      {/* Search + verification filter feed the /VendorProfile/filter query. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[16rem] flex-1 items-center gap-2 rounded-full border border-ink/15 bg-white px-3.5 py-2">
          <SearchIcon className="h-4 w-4 shrink-0 text-ink/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search store name…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
          />
        </div>
      </div>

      {/* Verification filter pills — translated into ?isVerified= on the backend. */}
      <div className="mb-4 flex flex-wrap gap-2">
        {VERIFICATION.map((s) => (
          <button
            key={s.key}
            onClick={() => setVerification(s.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              verification === s.key
                ? "bg-accent-500 text-white"
                : "bg-white/60 text-ink/70 hover:bg-ink/5"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Loading…</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink/50">{vendors.length} vendors</p>
          <div className="overflow-hidden rounded-2xl bg-white/60 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-accent-100 text-xs uppercase text-ink/50">
                <tr>
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {vendors.map((v) => (
                  <tr key={v.vendorProfileId} className="hover:bg-ink/5">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{v.storeName}</div>
                      <div className="text-xs text-ink/50">{v.address || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-ink">{v.users?.username ?? "—"}</div>
                      <div className="text-xs text-ink/50">{v.users?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {v.isVerified ? (
                        <span className="rounded-full bg-sage-100 px-2 py-0.5 text-xs font-medium text-sage-700">
                          Verified
                        </span>
                      ) : (
                        <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink/50">{created(v.createdaAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => verify(v)}
                          disabled={v.isVerified}
                          className="rounded-full border border-ink/15 px-3 py-1 text-xs font-medium text-ink/70 hover:bg-ink/5 disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                          {v.isVerified ? "Verified" : "Verify"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {vendors.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink/40">
                      No vendors match your filters.
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
