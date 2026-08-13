import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiFetch, isLoggedIn, formatOMR } from "../api";
import { useToast } from "../components/Toast";
import NavBar from "../components/NavBar";

interface Product {
  productId: number;
  name: string;
  description: string;
  productUrl: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
  categoryId: number;
  vendorProfileId: number;
  category?: { name: string };
}

interface Category {
  categoryId: number;
  name: string;
}

const emptyForm = {
  name: "",
  description: "",
  productUrl: "",
  price: 0,
  stockQuantity: 0,
  categoryId: 0,
};

// Vendor products page — lists and manages only this vendor's products. Their
// vendorProfileId comes from /VendorProfile/all (keyed by profile, not user).
export default function VendorProducts() {
  const toast = useToast();
  const userId = Number(localStorage.getItem("userId"));
  const isVendor = localStorage.getItem("role") === "Vendor";

  const [vendorProfileId, setVendorProfileId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isVendor) {
      setLoading(false);
      return;
    }
    apiFetch("/Category/all").then((d) => setCategories(d as Category[])).catch(() => {});
    (async () => {
      try {
        const all = (await apiFetch("/VendorProfile/all")) as { vendorProfileId: number; userId: number }[];
        const mine = all.find((p) => p.userId === userId);
        setVendorProfileId(mine?.vendorProfileId ?? null);
      } catch (e) {
        toast((e as Error).message, "error");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (vendorProfileId) loadProducts(vendorProfileId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorProfileId]);

  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (!isVendor) return <Navigate to="/" replace />;

  function loadProducts(vpId: number) {
    apiFetch("/Product/all")
      .then((d) => setProducts((d as Product[]).filter((p) => p.vendorProfileId === vpId)))
      .catch((e) => toast((e as Error).message, "error"));
  }

  function openAdd() {
    setForm({ ...emptyForm, categoryId: categories[0]?.categoryId ?? 0 });
    setEditing("new");
  }

  function openEdit(p: Product) {
    setForm({
      name: p.name,
      description: p.description ?? "",
      productUrl: p.productUrl,
      price: p.price,
      stockQuantity: p.stockQuantity,
      categoryId: p.categoryId,
    });
    setEditing(p);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      if (editing === "new") {
        await apiFetch("/Product/add", "POST", { ...form, vendorProfileId });
        toast(`Product "${form.name}" created.`, "success");
      } else if (editing) {
        await apiFetch(`/Product/update?id=${editing.productId}`, "PUT", {
          name: form.name,
          description: form.description,
          price: form.price,
          stockQuantity: form.stockQuantity,
        });
        toast(`Product "${form.name}" updated.`, "success");
      }
      setEditing(null);
      if (vendorProfileId) loadProducts(vendorProfileId);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  async function toggleActive(p: Product) {
    try {
      await apiFetch(`/Product/setActive?id=${p.productId}&isActive=${!p.isActive}`, "PATCH");
      if (vendorProfileId) loadProducts(vendorProfileId);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  async function remove(p: Product) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/Product/delete?id=${p.productId}`, "DELETE");
      toast(`Product "${p.name}" deleted.`, "success");
      if (vendorProfileId) loadProducts(vendorProfileId);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="mx-auto max-w-5xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">My Products</h2>
          {vendorProfileId && (
            <button
              onClick={openAdd}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              + Add product
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : !vendorProfileId ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">You need a store before you can list products.</p>
            <Link
              to="/vendor/profile"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Set up my store
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr key={p.productId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={p.productUrl} alt={p.name} className="h-10 w-10 rounded object-cover" />
                        <span className="font-medium text-gray-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatOMR(p.price)}</td>
                    <td className="px-4 py-3">{p.stockQuantity}</td>
                    <td className="px-4 py-3">
                      {p.isActive ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(p)}
                          className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                        >
                          {p.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => remove(p)}
                          className="rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                      No products yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              {editing === "new" ? "Add product" : `Edit "${editing.name}"`}
            </h3>
            <form onSubmit={save} className="space-y-3">
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Description"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-gray-500">
                  Price (OMR)
                  <input
                    type="number"
                    min={0}
                    step="0.001"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    required
                  />
                </label>
                <label className="text-xs text-gray-500">
                  Stock
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={form.stockQuantity}
                    onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })}
                    required
                  />
                </label>
              </div>

              {editing === "new" && (
                <>
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Image URL (optional)"
                    value={form.productUrl}
                    onChange={(e) => setForm({ ...form, productUrl: e.target.value })}
                  />
                  <label className="block text-xs text-gray-500">
                    Category
                    <select
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                      required
                    >
                      <option value={0} disabled>
                        Select…
                      </option>
                      {categories.map((c) => (
                        <option key={c.categoryId} value={c.categoryId}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {editing === "new" ? "Create" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
