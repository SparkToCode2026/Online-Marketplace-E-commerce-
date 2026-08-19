import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch, isLoggedIn } from "../api";
import { useToast } from "../components/Toast";
import NavBar from "../components/NavBar";
import { FieldError, fieldRing, isClean, type Errors } from "../lib/formErrors";

interface Profile {
  vendorProfileId: number;
  storeName: string;
  address: string;
  isVerified: boolean;
  userId: number;
}

// Vendor store page — find this vendor's profile, then view/create/edit it.
export default function VendorProfile() {
  const toast = useToast();
  const userId = Number(localStorage.getItem("userId"));
  const isVendor = localStorage.getItem("role") === "Vendor";

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors<"storeName" | "address">>({});

  async function load() {
    setLoading(true);
    try {
      const all = (await apiFetch("/VendorProfile/all")) as Profile[];
      const mine = all.find((p) => p.userId === userId) ?? null;
      setProfile(mine);
      setEditing(!mine);
      if (mine) {
        setStoreName(mine.storeName);
        setAddress(mine.address);
      }
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isVendor) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (!isVendor) return <Navigate to="/" replace />;

  async function save(e: FormEvent) {
    e.preventDefault();
    const errs: Errors<"storeName" | "address"> = {};
    if (!storeName.trim()) errs.storeName = "Store name is required.";
    if (!address.trim()) errs.address = "Address is required.";
    setErrors(errs);
    if (!isClean(errs)) return;

    setSaving(true);
    try {
      if (profile) {
        await apiFetch(`/VendorProfile/update?id=${profile.vendorProfileId}`, "PUT", {
          storeName: storeName.trim(),
          address: address.trim(),
        });
        toast("Store details updated.", "success");
      } else {
        await apiFetch("/VendorProfile/add", "POST", {
          storeName: storeName.trim(),
          address: address.trim(),
          userId,
        });
        toast("Store created — an admin will review it for verification.", "success");
      }
      await load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-page font-body text-ink">
      <NavBar />
      <div className="mx-auto max-w-xl p-6">
        <h2 className="mb-4 font-heading text-2xl">My Store</h2>

        {loading ? (
          <p className="text-sm text-ink/50">Loading…</p>
        ) : profile && !editing ? (
          <div className="rounded-2xl bg-white/60 p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-heading text-lg">{profile.storeName}</h3>
                {profile.isVerified ? (
                  <span className="mt-1 inline-block rounded-full bg-sage-100 px-3 py-1 text-xs font-medium text-sage-700">
                    Verified
                  </span>
                ) : (
                  <span className="mt-1 inline-block rounded-full bg-accent-100 px-3 py-1 text-xs font-medium text-accent-700">
                    Pending verification
                  </span>
                )}
              </div>
              <button
                onClick={() => setEditing(true)}
                className="rounded-full border border-ink/15 px-3 py-1.5 text-sm font-medium text-ink/70 hover:bg-ink/5"
              >
                Edit
              </button>
            </div>
            <dl className="mt-4 text-sm">
              <dt className="text-ink/60">Address</dt>
              <dd className="mt-1">{profile.address || "—"}</dd>
            </dl>
          </div>
        ) : (
          <form onSubmit={save} noValidate className="space-y-4 rounded-2xl bg-white/60 p-6 shadow-sm">
            <label className="block text-sm">
              <span className="text-ink/60">Store name</span>
              <input
                className={`mt-1 w-full rounded-full border px-4 py-2 outline-none focus:ring-2 ${fieldRing(!!errors.storeName)}`}
                value={storeName}
                onChange={(e) => {
                  setStoreName(e.target.value);
                  if (errors.storeName) setErrors((errs) => ({ ...errs, storeName: undefined }));
                }}
                aria-invalid={!!errors.storeName}
                required
              />
              <FieldError msg={errors.storeName} />
            </label>
            <label className="block text-sm">
              <span className="text-ink/60">Address</span>
              <input
                className={`mt-1 w-full rounded-full border px-4 py-2 outline-none focus:ring-2 ${fieldRing(!!errors.address)}`}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (errors.address) setErrors((errs) => ({ ...errs, address: undefined }));
                }}
                aria-invalid={!!errors.address}
                required
              />
              <FieldError msg={errors.address} />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-accent-500 px-4 py-2 font-medium text-white transition hover:bg-accent-600 disabled:bg-ink/15"
              >
                {saving ? "Saving…" : profile ? "Save changes" : "Create store"}
              </button>
              {profile && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink/70 hover:bg-ink/5"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
