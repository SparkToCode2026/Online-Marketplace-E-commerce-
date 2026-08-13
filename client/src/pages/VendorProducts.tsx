import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { Alert, Spinner, Seal, EmptyState } from "../components/Ui";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const emptyForm = { name: "", price: "", description: "", categoryId: "" };

// NOTE: confirm whether Swagger has a dedicated GET /Product/byVendor/{id}
// filter — this falls back to fetching /Product/all and filtering
// client-side by vendorId if that endpoint doesn't exist.
export function VendorProducts() {
  const { userId } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState(null); // null = loading
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function loadCategories() {
    try {
      const data = await apiFetch("/Category/getAll");
      setCategories(data);
    } catch {
      setCategories([]);
    }
  }

  async function loadProducts() {
    setProducts(null);
    setError("");
    try {
      let data;
      try {
        data = await apiFetch(`/Product/byVendor/${userId}`);
      } catch {
        const all = await apiFetch("/Product/all");
        data = all.filter((p) => String(p.vendorId) === String(userId));
      }
      setProducts(data);
    } catch (err) {
      setProducts([]);
      setError(err.message);
    }
  }

  useEffect(() => {
    loadCategories();
    loadProducts(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id || "" });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name || "",
      price: p.price ?? "",
      description: p.description || "",
      categoryId: p.categoryId || categories[0]?.id || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      price: parseFloat(form.price),
      description: form.description.trim(),
      categoryId: form.categoryId,
    };
    try {
      if (editingId) {
        await apiFetch("/Product/update", { method: "PUT", body: JSON.stringify({ id: editingId, ...payload }) });
        showToast("Product updated.");
      } else {
        await apiFetch("/Product/add", { method: "POST", body: JSON.stringify({ ...payload, vendorId: userId }) });
        showToast("Product added.");
      }
      setShowModal(false);
      loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id, currentlyActive) => {
    setBusyId(id);
    try {
      await apiFetch("/Product/setActive", {
        method: "PUT",
        body: JSON.stringify({ id, isActive: !currentlyActive }),
      });
      showToast(currentlyActive ? "Product deactivated." : "Product activated.");
      loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setBusyId(id);
    try {
      await apiFetch(`/Product/delete/${id}`, { method: "DELETE" });
      showToast("Product deleted.");
      loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="page-header d-flex flex-wrap justify-content-between align-items-end gap-3">
        <div>
          <span className="page-eyebrow">Vendor</span>
          <h1>My Products</h1>
          <p className="text-muted-ledger mb-0">Manage everything listed under your store.</p>
        </div>
        <button className="btn btn-brass" onClick={openAdd}>+ Add product</button>
      </div>

      <Alert message={error} type="danger" onClose={() => setError("")} />

      <div className="table-ledger">
        <table className="table table-ledger mb-0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Category</th>
              <th>Status</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products === null ? (
              <tr className="loading-row"><td colSpan={5}><Spinner /></td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={5}><EmptyState message="You haven't added any products yet." /></td></tr>
            ) : (
              products.map((p) => {
                const isActive = p.isActive !== false;
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="text-mono">${Number(p.price ?? 0).toFixed(2)}</td>
                    <td>{p.categoryName || "—"}</td>
                    <td>{isActive ? <Seal variant="verified">Active</Seal> : <Seal variant="inactive">Deactivated</Seal>}</td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-ledger" onClick={() => openEdit(p)}>Edit</button>
                        <button
                          className="btn btn-outline-ledger"
                          disabled={busyId === p.id}
                          onClick={() => handleToggleActive(p.id, isActive)}
                        >
                          {isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button className="btn btn-outline-danger" disabled={busyId === p.id} onClick={() => handleDelete(p.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal
        show={showModal}
        title={editingId ? "Edit product" : "Add product"}
        onClose={() => setShowModal(false)}
        footer={
          <>
            <button className="btn btn-outline-ledger" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={saving} onClick={handleSubmit}>
              {saving ? "Saving…" : "Save product"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="productName" className="form-label">Name</label>
            <input
              id="productName" className="form-control" required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="productPrice" className="form-label">Price</label>
            <input
              id="productPrice" type="number" step="0.01" min="0" className="form-control" required
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="productCategory" className="form-label">Category</label>
            <select
              id="productCategory" className="form-select" required
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              {categories.length === 0 && <option value="">No categories available</option>}
              {categories.map((c) => (
                <option value={c.id} key={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="productDescription" className="form-label">Description</label>
            <textarea
              id="productDescription" className="form-control" rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
