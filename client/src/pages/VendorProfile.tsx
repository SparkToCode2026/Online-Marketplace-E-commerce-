import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch, isLoggedIn } from "../api";
import { useToast } from "../components/Toast";
import NavBar from "../components/NavBar";

interface Profile {
  vendorProfileId: number;
  storeName: string;
  address: string;
  isVerified: boolean;
  userId: number;
}

// Vendor store page — find this vendor's profile (via /VendorProfile/all, since
// the API keys it by profile id not user id), then view/create/edit it. The
// backend only stores store name and address.
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

  async function load() {
    setLoading(true);
    try {
      const all = (await apiFetch("/VendorProfile/all")) as Profile[];
      const mine = all.find((p) => p.userId === userId) ?? null;
      setProfile(mine);
      setEditing(!mine); // no profile yet -> start in create mode
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
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="mx-auto max-w-xl p-6">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">My Store</h2>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : profile && !editing ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{profile.storeName}</h3>
                {profile.isVerified ? (
                  <span className="mt-1 inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    Verified
                  </span>
                ) : (
                  <span className="mt-1 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    Pending verification
                  </span>
                )}
              </div>
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Edit
              </button>
            </div>
            <dl className="mt-4 text-sm">
              <dt className="text-gray-500">Address</dt>
              <dd className="mt-1 text-gray-900">{profile.address || "—"}</dd>
            </dl>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
            <label className="block text-sm">
              <span className="text-gray-500">Store name</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-500">Address</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-300"
              >
                {saving ? "Saving…" : profile ? "Save changes" : "Create store"}
              </button>
              {profile && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
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
