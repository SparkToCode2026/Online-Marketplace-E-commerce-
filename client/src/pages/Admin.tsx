import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch, isLoggedIn, isAdmin, formatOMR } from "../api";
import { useToast } from "../components/Toast";
import NavBar from "../components/NavBar";
import AdminOrders from "../components/AdminOrders";
import AdminCoupons from "../components/AdminCoupons";
import AdminPayments from "../components/AdminPayments";
import AdminShipping from "../components/AdminShipping";
import AdminOrderItems from "../components/AdminOrderItems";

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

// One bucket from /Order/statsByStatus — used here just for the revenue tile.
interface StatusStat {
  status: string;
  orderCount: number;
  totalRevenue: number;
}

const emptyForm = {
  name: "",
  description: "",
  productUrl: "",
  price: 0,
  stockQuantity: 0,
  categoryId: 0,
  vendorProfileId: 0,
};

// Tab pill styling: filled accent when active, plain otherwise.
function tabClass(active: boolean) {
  return `rounded-full px-4 py-2 text-sm font-medium transition ${
    active ? "bg-accent-500 text-white" : "bg-white/60 text-ink/70 hover:bg-ink/5"
  }`;
}

// Admin dashboard — product CRUD plus an orders/revenue view, switched by tabs.
export default function Admin() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orderStats, setOrderStats] = useState<StatusStat[]>([]);

  const [tab, setTab] = useState<
    "products" | "orders" | "coupons" | "payments" | "shipping" | "items"
  >("products");

  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [form, setForm] = useState(emptyForm);

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    loadProducts();
    apiFetch("/Category/all").then((d) => setCategories(d as Category[])).catch(() => {});
    apiFetch("/VendorProfile/all").then((d) => setVendors(d as Vendor[])).catch(() => {});
    apiFetch("/Order/statsByStatus").then((d) => setOrderStats(d as StatusStat[])).catch(() => {});
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

  const categoryCounts = categories.map((c) => ({
    ...c,
    count: products.filter((p) => p.categoryId === c.categoryId).length,
  }));
  const maxCatCount = Math.max(1, ...categoryCounts.map((c) => c.count));

  return (
    <div className="min-h-screen bg-page font-body text-ink">
      <NavBar />

      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-5 flex flex-wrap gap-2">
          <button onClick={() => setTab("products")} className={tabClass(tab === "products")}>
            Products
          </button>
          <button onClick={() => setTab("orders")} className={tabClass(tab === "orders")}>
            Orders
          </button>
          <button onClick={() => setTab("coupons")} className={tabClass(tab === "coupons")}>
            Coupons
          </button>
          <button onClick={() => setTab("payments")} className={tabClass(tab === "payments")}>
            Payments
          </button>
          <button onClick={() => setTab("shipping")} className={tabClass(tab === "shipping")}>
            Shipping
          </button>
          <button onClick={() => setTab("items")} className={tabClass(tab === "items")}>
            Items
          </button>
        </div>

        {tab === "orders" && <AdminOrders />}
        {tab === "coupons" && <AdminCoupons />}
        {tab === "payments" && <AdminPayments />}
        {tab === "shipping" && <AdminShipping />}
        {tab === "items" && <AdminOrderItems />}

        {tab === "products" && (
          <>
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Products", value: String(products.length) },
            { label: "Categories", value: String(categories.length) },
            { label: "Vendors", value: String(vendors.length) },
            { label: "Revenue", value: formatOMR(orderStats.reduce((s, x) => s + x.totalRevenue, 0)) },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/60 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-ink/40">{s.label}</p>
              <p className="mt-1 font-heading text-2xl">{s.value}</p>
            </div>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="mb-6 rounded-2xl bg-white/60 p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-ink/70">Products per category</h3>
            <div className="flex h-36 items-end gap-4">
              {categoryCounts.map((c) => (
                <div key={c.categoryId} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-xs font-bold text-accent-700">{c.count}</span>
                  <div
                    className="w-full max-w-[44px] rounded-t-md bg-accent-400"
                    style={{ height: `${Math.max(8, Math.round((c.count / maxCatCount) * 100))}%` }}
                  />
                  <span className="text-center text-[11px] text-ink/50">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl">Products</h1>
            <p className="text-sm text-ink/50">{products.length} total</p>
          </div>
          <button
            onClick={openAdd}
            className="rounded-full bg-accent-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-600"
          >
            + Add product
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white/60 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-accent-100 text-xs uppercase text-ink/50">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {products.map((p) => (
                <tr key={p.productId} className="hover:bg-ink/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.productUrl}
                        alt={p.name}
                        className="h-10 w-10 rounded-full object-cover saturate-[.85] brightness-[.97]"
                      />
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink/60">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{formatOMR(p.price)}</td>
                  <td className="px-4 py-3">{p.stockQuantity}</td>
                  <td className="px-4 py-3">
                    {p.isActive ? (
                      <span className="rounded-full bg-sage-100 px-2 py-0.5 text-xs font-medium text-sage-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink/50">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-full border border-ink/15 px-3 py-1 text-xs font-medium text-ink/70 hover:bg-ink/5"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(p)}
                        className="rounded-full border border-ink/15 px-3 py-1 text-xs font-medium text-ink/70 hover:bg-ink/5"
                      >
                        {p.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => remove(p)}
                        className="rounded-full border border-accent-200 px-3 py-1 text-xs font-medium text-accent-700 hover:bg-accent-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink/40">
                    No products yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
          </>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 font-heading text-lg">
              {editing === "new" ? "Add product" : `Edit "${editing.name}"`}
            </h2>
            <form onSubmit={save} className="space-y-3">
              <input
                className="w-full rounded-full border border-ink/15 px-4 py-2 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <textarea
                className="w-full rounded-2xl border border-ink/15 px-4 py-2 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                placeholder="Description"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-ink/60">
                  Price (OMR)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-1 w-full rounded-full border border-ink/15 px-4 py-2 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    required
                  />
                </label>
                <label className="text-xs text-ink/60">
                  Stock
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-full border border-ink/15 px-4 py-2 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                    value={form.stockQuantity}
                    onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })}
                    required
                  />
                </label>
              </div>

              {editing === "new" && (
                <>
                  <input
                    className="w-full rounded-full border border-ink/15 px-4 py-2 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                    placeholder="Image URL (optional)"
                    value={form.productUrl}
                    onChange={(e) => setForm({ ...form, productUrl: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs text-ink/60">
                      Category
                      <select
                        className="mt-1 w-full rounded-full border border-ink/15 px-4 py-2 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
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
                    <label className="text-xs text-ink/60">
                      Vendor
                      <select
                        className="mt-1 w-full rounded-full border border-ink/15 px-4 py-2 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
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
                  className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink/70 hover:bg-ink/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600"
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
