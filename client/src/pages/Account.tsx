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
}

// Account page — view your details and update the editable ones.
export default function Account() {
  const toast = useToast();
  const userId = localStorage.getItem("userId");
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch(`/User/getById?id=${userId}`)
      .then((d) => {
        const u = d as User;
        setUser(u);
        setUsername(u.username ?? "");
        setPhone(String(u.phonenumber ?? ""));
      })
      .catch((e) => toast((e as Error).message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="min-h-screen bg-cream font-body text-ink">
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
                className="mt-1 w-full rounded-full border border-ink/15 px-4 py-2 outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-100"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>

            <label className="block text-sm">
              <span className="text-ink/60">Phone number</span>
              <input
                type="tel"
                className="mt-1 w-full rounded-full border border-ink/15 px-4 py-2 outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-100"
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
              className="w-full rounded-full bg-terracotta-500 py-2.5 font-medium text-white transition hover:bg-terracotta-600 disabled:bg-ink/15"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
