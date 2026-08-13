import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { Alert, Spinner, Seal } from "../components/Ui";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const emptyForm = { storeName: "", description: "", phone: "", address: "" };

// NOTE: confirm whether the profile is fetched by user id or by its own
// vendor-profile id, and the exact field names, in Swagger.
export function VendorProfile() {
  const { userId } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null); // null = no profile yet
  const [mode, setMode] = useState("view"); // "view" | "create" | "edit"
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/VendorProfile/getById/${userId}`);
      if (data && (data.storeName || data.name)) {
        setProfile(data);
        setMode("view");
      } else {
        setProfile(null);
        setMode("create");
      }
    } catch {
      // A 404 typically just means "no profile yet" — treat as create mode.
      setProfile(null);
      setMode("create");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const startEdit = () => {
    setForm({
      storeName: profile.storeName || profile.name || "",
      description: profile.description || "",
      phone: profile.phone || "",
      address: profile.address || "",
    });
    setMode("edit");
  };

  const startCreate = () => {
    setForm(emptyForm);
    setMode("create");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (mode === "edit" && profile) {
        await apiFetch("/VendorProfile/update", {
          method: "PUT",
          body: JSON.stringify({ id: profile.id, ...form }),
        });
        showToast("Store details updated.");
      } else {
        await apiFetch("/VendorProfile/add", { method: "POST", body: JSON.stringify(form) });
        showToast("Store created — an admin will review it for verification.");
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <span className="page-eyebrow">Vendor</span>
        <h1>My Store</h1>
        <p className="text-muted-ledger mb-0">
          {mode === "view" ? "Here's what customers see on your store." : "Set up your vendor profile to start selling."}
        </p>
      </div>

      <Alert message={error} type="danger" onClose={() => setError("")} />

      {loading ? (
        <Spinner />
      ) : mode === "view" && profile ? (
        <div className="card-ledger">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h3 className="mb-1">{profile.storeName || profile.name}</h3>
                <Seal variant={profile.isVerified ? "verified" : "pending"}>
                  {profile.isVerified ? "Verified" : "Pending verification"}
                </Seal>
              </div>
              <button className="btn btn-outline-ledger btn-sm" onClick={startEdit}>Edit</button>
            </div>
            <dl className="row mb-0">
              <dt className="col-sm-4 text-muted-ledger">Description</dt>
              <dd className="col-sm-8">{profile.description || "—"}</dd>
              <dt className="col-sm-4 text-muted-ledger">Contact phone</dt>
              <dd className="col-sm-8">{profile.phone || "—"}</dd>
              <dt className="col-sm-4 text-muted-ledger">Address</dt>
              <dd className="col-sm-8">{profile.address || "—"}</dd>
            </dl>
          </div>
        </div>
      ) : (
        <div className="card-ledger">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="storeName" className="form-label">Store name</label>
                <input
                  id="storeName" className="form-control" required
                  value={form.storeName}
                  onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="description" className="form-label">Description</label>
                <textarea
                  id="description" className="form-control" rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="phone" className="form-label">Contact phone</label>
                <input
                  id="phone" type="tel" className="form-control"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="address" className="form-label">Address</label>
                <input
                  id="address" className="form-control"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Create store"}
                </button>
                {profile && (
                  <button type="button" className="btn btn-link text-muted-ledger" onClick={() => setMode("view")}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
