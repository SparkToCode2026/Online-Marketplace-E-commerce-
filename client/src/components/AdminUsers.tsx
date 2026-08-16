import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmDialog";

// A user as returned by GET /User/getAll (admin view). PasswordHash is never
// serialized; the vendor profile rides along only for Vendor accounts.
interface User {
  userId: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
}

// Status filter pills. Filtered client-side — there is no /User/filter endpoint.
const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "blocked", label: "Blocked" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const ROLES = ["Customer", "Vendor", "Admin"];

// Admin "Users" tab: change a user's role and block/unblock their account.
// Backed by PUT /User/changeRole, DELETE /User/remove (block) and
// PUT /User/reactivate (unblock).
export default function AdminUsers() {
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const myId = Number(localStorage.getItem("userId"));

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
      const data = (await apiFetch("/User/getAll")) as User[];
      setUsers(data.sort((a, b) => a.userId - b.userId));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(u: User, newRole: string) {
    if (newRole === u.role) return;
    if (!(await confirm(`Change ${u.username}'s role to ${newRole}?`))) return;
    try {
      await apiFetch(`/User/changeRole?id=${u.userId}&newRole=${encodeURIComponent(newRole)}`, "PUT");
      toast(`${u.username} is now ${newRole}.`, "success");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function toggleActive(u: User) {
    try {
      if (u.isActive) {
        if (!(await confirm(`Block ${u.username}? They won't be able to log in.`))) return;
        await apiFetch(`/User/remove?id=${u.userId}`, "DELETE");
        toast(`${u.username}'s account is blocked.`, "info");
      } else {
        await apiFetch(`/User/reactivate?id=${u.userId}`, "PUT");
        toast(`${u.username}'s account is active again.`, "success");
      }
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const shown = users.filter((u) =>
    filter === "all" ? true : filter === "active" ? u.isActive : !u.isActive,
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filter === f.key
                ? "bg-accent-500 text-white"
                : "bg-white/60 text-ink/70 hover:bg-ink/5"
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
          <p className="mb-3 text-sm text-ink/50">{shown.length} users</p>
          <div className="overflow-hidden rounded-2xl bg-white/60 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-accent-100 text-xs uppercase text-ink/50">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {shown.map((u) => {
                  // The current admin can't change their own role or block
                  // themselves — that would lock them out mid-session.
                  const isSelf = u.userId === myId;
                  return (
                    <tr key={u.userId} className="hover:bg-ink/5">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">
                          {u.username}
                          {isSelf && <span className="ml-2 text-xs text-accent-700">(You)</span>}
                        </div>
                        <div className="text-xs text-ink/50">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) => changeRole(u, e.target.value)}
                          className="rounded-full border border-ink/15 bg-white px-3 py-1.5 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100 disabled:opacity-50"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {u.isActive ? (
                          <span className="rounded-full bg-sage-100 px-2 py-0.5 text-xs font-medium text-sage-700">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">
                            Blocked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            onClick={() => toggleActive(u)}
                            disabled={isSelf}
                            className="rounded-full border border-ink/15 px-3 py-1 text-xs font-medium text-ink/70 hover:bg-ink/5 disabled:opacity-40 disabled:hover:bg-transparent"
                          >
                            {u.isActive ? "Block" : "Unblock"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-ink/40">
                      No users.
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
