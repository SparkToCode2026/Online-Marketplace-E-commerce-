import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { Alert, Spinner, Seal } from "../components/Ui";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

// NOTE: check Swagger for a "current user" endpoint (e.g. GET /User/getCurrent
// or /User/me) — preferred over getById since it needs no id. Fallback used here.
export function Account() {
  const { userId, role } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [original, setOriginal] = useState({ name: "", email: "" });
  const [form, setForm] = useState({ name: "", email: "" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const user = await apiFetch(`/User/getById/${userId}`);
        if (cancelled) return;
        const values = { name: user.name || "", email: user.email || "" };
        setOriginal(values);
        setForm(values);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch("/User/update", {
        method: "PUT",
        body: JSON.stringify({ id: userId, name: form.name.trim(), email: form.email.trim() }),
      });
      setOriginal(form);
      setEditing(false);
      showToast("Account updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(original);
    setEditing(false);
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <span className="page-eyebrow">Account</span>
        <h1>My Account</h1>
        <p className="text-muted-ledger mb-0">View and update your personal details.</p>
      </div>

      <Alert message={error} type="danger" onClose={() => setError("")} />

      {loading ? (
        <Spinner />
      ) : (
        <div className="card-ledger">
          <div className="card-body">
            <form onSubmit={handleSave}>
              <div className="mb-3">
                <label htmlFor="name" className="form-label">Full name</label>
                <input
                  id="name"
                  className="form-control"
                  disabled={!editing}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  disabled={!editing}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Role</label>
                <div><Seal variant="role">{role || "—"}</Seal></div>
              </div>

              <div className="d-flex gap-2 mt-4">
                {!editing && (
                  <button type="button" className="btn btn-outline-ledger" onClick={() => setEditing(true)}>
                    Edit details
                  </button>
                )}
                {editing && (
                  <>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                    <button type="button" className="btn btn-link text-muted-ledger" onClick={handleCancel}>
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
