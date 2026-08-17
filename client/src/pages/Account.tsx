import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch, isLoggedIn } from "../api";
import { useToast } from "../components/Toast";
import NavBar from "../components/NavBar";

interface User {
  userId: number;
  username: string;
  email: string;
  phonenumber: number;
  role: string;
  // Present once a vendor request has been submitted. isVerified stays false
  // while an admin has yet to approve it.
  vendorProfile?: { storeName: string; isVerified: boolean } | null;
}

// Account page — view your details and update the editable ones.
export default function Account() {
  const toast = useToast();
  const userId = localStorage.getItem("userId");
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // "Become a vendor" application state.
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function load() {
    apiFetch(`/User/getById?id=${userId}`)
      .then((d) => {
        const u = d as User;
        setUser(u);
        setUsername(u.username ?? "");
        setPhone(String(u.phonenumber ?? ""));
      })
      .catch((e) => toast((e as Error).message, "error"));
  }

  // Apply to become a vendor. The backend takes the applicant's id from the
  // JWT, so the request body only carries the store details.
  async function applyAsVendor(e: FormEvent) {
    e.preventDefault();
    setApplying(true);
    try {
      await apiFetch("/User/request-vendor", "POST", {
        storeName: storeName.trim(),
        address: storeAddress.trim(),
      });
      toast("Request submitted — an admin will review it shortly.", "success");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setApplying(false);
    }
  }

  if (!isLoggedIn()) return <Navigate to="/login" replace />;

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/User/update?id=${userId}`, "PUT", {
        username: username.trim(),
        phonenumber: Number(phone),
      });
      localStorage.setItem("email", user?.email ?? "");
      toast("Account updated.", "success");
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
        <h2 className="mb-4 font-heading text-2xl">My Account</h2>

        {!user ? (
          <p className="text-sm text-ink/50">Loading…</p>
        ) : (
          <form onSubmit={save} className="space-y-4 rounded-2xl bg-white/60 p-6 shadow-sm">
            <label className="block text-sm">
              <span className="text-ink/60">Full name</span>
              <input
                className="mt-1 w-full rounded-full border border-ink/15 px-4 py-2 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>

            <label className="block text-sm">
              <span className="text-ink/60">Phone number</span>
              <input
                type="tel"
                className="mt-1 w-full rounded-full border border-ink/15 px-4 py-2 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                required
              />
            </label>

            <label className="block text-sm">
              <span className="text-ink/60">Email</span>
              <input
                className="mt-1 w-full cursor-not-allowed rounded-full border border-ink/10 bg-ink/5 px-4 py-2 text-ink/50"
                value={user.email}
                disabled
              />
            </label>

            <div className="text-sm">
              <span className="text-ink/60">Role</span>
              <div className="mt-1">
                <span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-medium text-sage-700">
                  {user.role}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-accent-500 py-2.5 font-medium text-white transition hover:bg-accent-600 disabled:bg-ink/15"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        )}

        {/* Vendor application. Three states: already a vendor (nothing to do),
            a request awaiting approval, or the application form. */}
        {user && user.role === "Customer" && (
          <div className="mt-6 rounded-2xl bg-white/60 p-6 shadow-sm">
            <h3 className="font-heading text-lg">Sell on the marketplace</h3>

            {user.vendorProfile ? (
              <div className="mt-3">
                <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-700">
                  Pending approval
                </span>
                <p className="mt-3 text-sm text-ink/60">
                  Your request for{" "}
                  <span className="font-medium text-ink">{user.vendorProfile.storeName}</span> is
                  waiting for an admin to review it. You'll get seller access once it's approved.
                </p>
              </div>
            ) : (
              <>
                <p className="mt-1 text-sm text-ink/60">
                  Open a store and start listing your own products. An admin reviews every
                  application.
                </p>
                <form onSubmit={applyAsVendor} className="mt-4 space-y-4">
                  <label className="block text-sm">
                    <span className="text-ink/60">Store name</span>
                    <input
                      className="mt-1 w-full rounded-full border border-ink/15 px-4 py-2 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="e.g. Khalid's Electronics"
                      required
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="text-ink/60">Store address</span>
                    <input
                      className="mt-1 w-full rounded-full border border-ink/15 px-4 py-2 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                      value={storeAddress}
                      onChange={(e) => setStoreAddress(e.target.value)}
                      placeholder="e.g. Muscat, Oman"
                      required
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={applying}
                    className="w-full rounded-full bg-accent-500 py-2.5 font-medium text-white transition hover:bg-accent-600 disabled:bg-ink/15"
                  >
                    {applying ? "Submitting…" : "Apply to become a vendor"}
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
