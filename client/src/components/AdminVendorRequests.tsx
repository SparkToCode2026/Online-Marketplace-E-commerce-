import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmDialog";

// A pending vendor application, as returned by GET /User/vendor-requests:
// an unverified VendorProfile whose owner is still a Customer.
interface VendorRequest {
  vendorProfileId: number;
  storeName: string;
  address: string;
  createdaAt: string;
  userId: number;
  users?: { username: string; email: string };
}

function applied(iso: string) {
  const d = new Date(iso);
  return d.getFullYear() > 1 ? d.toLocaleDateString() : "—";
}

// Admin "Vendor Requests" tab: review customers who applied to open a store.
// Approving promotes them to the Vendor role and verifies the storefront
// (PUT /User/approve-vendor); rejecting drops the pending profile so they can
// apply again later (DELETE /User/reject-vendor).
export default function AdminVendorRequests() {
  const toast = useToast();
  const confirm = useConfirm();
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

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
      const data = (await apiFetch("/User/vendor-requests")) as VendorRequest[];
      setRequests(data.sort((a, b) => a.vendorProfileId - b.vendorProfileId));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function approve(r: VendorRequest) {
    // Approving isn't destructive, so use the neutral tone rather than the
    // dialog's default "danger"/"Delete" styling.
    const ok = await confirm(
      `Approve "${r.storeName}"? ${r.users?.username ?? "This user"} becomes a Vendor.`,
      { title: "Approve request", confirmLabel: "Approve", tone: "default" },
    );
    if (!ok) return;
    setBusyId(r.vendorProfileId);
    try {
      await apiFetch(`/User/approve-vendor?userId=${r.userId}`, "PUT");
      toast(`"${r.storeName}" approved.`, "success");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(r: VendorRequest) {
    const ok = await confirm(
      `Reject "${r.storeName}"? The request is removed; they can apply again.`,
      { title: "Reject request", confirmLabel: "Reject" },
    );
    if (!ok) return;
    setBusyId(r.vendorProfileId);
    try {
      await apiFetch(`/User/reject-vendor?userId=${r.userId}`, "DELETE");
      toast(`"${r.storeName}" rejected.`, "info");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="text-sm text-ink/40">Loading…</p>;

  return (
    <div>
      <p className="mb-3 text-sm text-ink/50">
        {requests.length} pending {requests.length === 1 ? "request" : "requests"}
      </p>

      {requests.length === 0 ? (
        <div className="rounded-2xl bg-white/60 p-10 text-center shadow-sm">
          <p className="text-ink/60">No vendor applications waiting for review.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white/60 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-accent-100 text-xs uppercase text-ink/50">
              <tr>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3 text-right">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {requests.map((r) => (
                <tr key={r.vendorProfileId} className="hover:bg-ink/5">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{r.storeName}</div>
                    <div className="text-xs text-ink/50">{r.address || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-ink">{r.users?.username ?? "—"}</div>
                    <div className="text-xs text-ink/50">{r.users?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-ink/50">{applied(r.createdaAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => approve(r)}
                        disabled={busyId === r.vendorProfileId}
                        className="rounded-full bg-accent-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-accent-600 disabled:bg-ink/15"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reject(r)}
                        disabled={busyId === r.vendorProfileId}
                        className="rounded-full border border-ink/15 px-3 py-1 text-xs font-medium text-ink/70 transition hover:bg-ink/5 disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
