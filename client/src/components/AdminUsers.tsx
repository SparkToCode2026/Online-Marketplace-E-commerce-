import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmDialog";
import { SearchIcon } from "./icons";

// A user as returned by GET /User/getAll and /User/filter (admin view).
// PasswordHash is never serialized; the vendor profile rides along only for
// Vendor accounts. createdAt is the default 0001-01-01 for accounts that
// pre-date the CreatedAt column.
interface User {
  userId: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

// Shape of GET /User/stats.
interface Stats {
  total: number;
  byRole: { role: string; count: number }[];
  recent: User[];
}

// Status filter pills, translated into the ?isActive= query on the backend.
const STATUS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "blocked", label: "Blocked" },
] as const;
type StatusKey = (typeof STATUS)[number]["key"];

const ROLES = ["Customer", "Vendor", "Admin"];

// Show the default sentinel date as "—" instead of 1/1/0001.
function joined(iso: string) {
  const d = new Date(iso);
  return d.getFullYear() > 1 ? d.toLocaleDateString() : "—";
}

// Admin "Users" tab: change a user's role, block/unblock accounts, filter the
// list server-side (role / status / search) and see per-role counts.
// Backed by PUT /User/changeRole, DELETE /User/remove (block),
// PUT /User/reactivate (unblock), GET /User/filter and GET /User/stats.
export default function AdminUsers() {
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusKey>("all");
  const [role, setRole] = useState(""); // "" = every role
  const [search, setSearch] = useState("");
  const myId = Number(localStorage.getItem("userId"));

  // Server-side filter: rebuild the query whenever a filter changes, debounced
  // so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, status, search]);

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (role) params.set("role", role);
      if (status !== "all") params.set("isActive", String(status === "active"));
      if (search.trim()) params.set("search", search.trim());
      const qs = params.toString();
      const data = (await apiFetch(`/User/filter${qs ? `?${qs}` : ""}`)) as User[];
      setUsers(data.sort((a, b) => a.userId - b.userId));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      setStats((await apiFetch("/User/stats")) as Stats);
    } catch {
      setStats(null);
    }
  }

  // After any mutation, refresh both the table and the counts.
  function reload() {
    load();
    loadStats();
  }

  async function changeRole(u: User, newRole: string) {
    if (newRole === u.role) return;
    if (!(await confirm(`Change ${u.username}'s role to ${newRole}?`))) return;
    try {
      await apiFetch(`/User/changeRole?id=${u.userId}&newRole=${encodeURIComponent(newRole)}`, "PUT");
      toast(`${u.username} is now ${newRole}.`, "success");
      reload();
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
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const roleCount = (r: string) => stats?.byRole.find((b) => b.role === r)?.count ?? 0;

  return (
    <div>
      {/* Per-role counts from GET /User/stats. */}
      {stats && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl bg-white/60 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-ink/40">Total</p>
            <p className="mt-1 font-heading text-2xl">{stats.total}</p>
          </div>
          {ROLES.map((r) => (
            <div key={r} className="rounded-2xl bg-white/60 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-ink/40">{r}s</p>
              <p className="mt-1 font-heading text-2xl">{roleCount(r)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + role filter feed the /User/filter query. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[16rem] flex-1 items-center gap-2 rounded-full border border-ink/15 bg-white px-3.5 py-2">
          <SearchIcon className="h-4 w-4 shrink-0 text-ink/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Status filter pills — translated into ?isActive= on the backend. */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS.map((s) => (
          <button
            key={s.key}
            onClick={() => setStatus(s.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              status === s.key
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
          <p className="mb-3 text-sm text-ink/50">{users.length} users</p>
          <div className="overflow-hidden rounded-2xl bg-white/60 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-accent-100 text-xs uppercase text-ink/50">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {users.map((u) => {
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
                      <td className="px-4 py-3 text-ink/50">{joined(u.createdAt)}</td>
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
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink/40">
                      No users match your filters.
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
