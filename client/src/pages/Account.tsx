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

// Account page — view your details and update the editable ones. The backend's
// /User/update only accepts username and phone, so email and role are read-only.
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
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="mx-auto max-w-xl p-6">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">My Account</h2>

        {!user ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <form onSubmit={save} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
            <label className="block text-sm">
              <span className="text-gray-500">Full name</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>

            <label className="block text-sm">
              <span className="text-gray-500">Phone number</span>
              <input
                type="tel"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                required
              />
            </label>

            <label className="block text-sm">
              <span className="text-gray-500">Email</span>
              <input
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500"
                value={user.email}
                disabled
              />
            </label>

            <div className="text-sm">
              <span className="text-gray-500">Role</span>
              <div className="mt-1">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {user.role}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-300"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
