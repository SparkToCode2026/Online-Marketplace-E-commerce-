import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { apiFetch, isLoggedIn, isAdmin, logout } from "../api";
import { useToast } from "../components/Toast";
import { BrandIcon, ArrowLeftIcon } from "../components/icons";

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

interface Vendor {
  vendorProfileId: number;
  storeName: string;
}

// Blank form used when opening the "add product" modal.
const emptyForm = {
  name: "",
  description: "",
  productUrl: "",
  price: 0,
  stockQuantity: 0,
  categoryId: 0,
  vendorProfileId: 0,
};

// Admin dashboard — full product CRUD (create/update/activate/delete).
export default function Admin() {
  const navigate = useNavigate();
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // editing === null means the modal is closed. A product means "edit that
  // one"; the sentinel below means "add a new one".
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [form, setForm] = useState(emptyForm);

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    loadProducts();
    apiFetch("/Category/all").then((d) => setCategories(d as Category[])).catch(() => {});
    apiFetch("/VendorProfile/all").then((d) => setVendors(d as Vendor[])).catch(() => {});
  }, []);

  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/" replace />;

  function loadProducts() {
    apiFetch("/Product/all")
      .then((d) => setProducts(d as Product[]))
      .catch((e) => toast((e as Error).message, "error"));
  }

  function openAdd() {
    setForm({ ...emptyForm });
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
      vendorProfileId: p.vendorProfileId,
    });
    setEditing(p);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      if (editing === "new") {
        await apiFetch("/Product/add", "POST", form);
        toast(`Product "${form.name}" created.`, "success");
      } else if (editing) {
        // The update endpoint only accepts these four editable fields.
        await apiFetch(`/Product/update?id=${editing.productId}`, "PUT", {
          name: form.name,
          description: form.description,
          price: form.price,
          stockQuantity: form.stockQuantity,
        });
        toast(`Product "${form.name}" updated.`, "success");
      }
      setEditing(null);
      loadProducts();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  async function toggleActive(p: Product) {
    try {
      await apiFetch(`/Product/setActive?id=${p.productId}&isActive=${!p.isActive}`, "PATCH");
      loadProducts();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  async function remove(p: Product) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/Product/delete?id=${p.productId}`, "DELETE");
      toast(`Product "${p.name}" deleted.`, "success");
      loadProducts();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between bg-gray-800 px-6 py-4 text-white">
        <span className="flex items-center gap-2 text-lg font-bold">
          <BrandIcon className="h-6 w-6" />
          Online Marketplace
        </span>
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-1 text-sm hover:underline">
            <ArrowLeftIcon className="h-4 w-4" />
            Storefront
          </Link>
          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
            Admin
          </span>
          <span className="text-sm text-gray-300">{localStorage.getItem("email")}</span>
          <button
            onClick={handleLogout}
            className="rounded bg-gray-600 px-3 py-1 text-sm hover:bg-gray-500"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-400">{products.length} total</p>
          </div>
          <button
            onClick={openAdd}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            + Add product
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
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
                      <img
                        src={p.productUrl}
                        alt={p.name}
                        className="h-10 w-10 rounded object-cover"
                      />
                      <span className="font-medium text-gray-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{p.price.toLocaleString()} SAR</td>
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
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                    No products yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              {editing === "new" ? "Add product" : `Edit "${editing.name}"`}
            </h2>
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
                  Price (SAR)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
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
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs text-gray-500">
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
                    <label className="text-xs text-gray-500">
                      Vendor
                      <select
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        value={form.vendorProfileId}
                        onChange={(e) =>
                          setForm({ ...form, vendorProfileId: Number(e.target.value) })
                        }
                        required
                      >
                        <option value={0} disabled>
                          Select…
                        </option>
                        {vendors.map((v) => (
                          <option key={v.vendorProfileId} value={v.vendorProfileId}>
                            {v.storeName}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
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
