import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmDialog";
import { FieldError, fieldRing, isClean, type Errors } from "../lib/formErrors";

// A category as returned by GET /Category/all. `products` is included by the
// backend, so we can show a live product count without a second request.
interface Category {
  categoryId: number;
  name: string;
  description?: string | null;
  products?: { productId: number }[] | null;
}

const emptyForm = { name: "", description: "" };

// Admin "Categories" tab: list categories with their product counts, create and
// edit them, move a category's products elsewhere, and delete empty ones.
// Rendered inside the admin-guarded Admin page.
export default function AdminCategories() {
  const toast = useToast();
  const confirm = useConfirm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Errors<keyof typeof emptyForm>>({});
  // null = the form is creating a new category; a number = editing that id.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  // Which row is showing its "move products" picker, and the chosen target.
  const [reassign, setReassign] = useState<{ id: number; target: string } | null>(null);

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
      const data = (await apiFetch("/Category/all")) as Category[];
      setCategories(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  const productCount = (c: Category) => c.products?.length ?? 0;

  function startEdit(c: Category) {
    setEditingId(c.categoryId);
    setForm({ name: c.name, description: c.description ?? "" });
    setErrors({});
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
  }

  // One handler for both create and edit — the only difference is the endpoint.
  async function save() {
    const errs: Errors<keyof typeof emptyForm> = {};
    if (!form.name.trim()) errs.name = "Name is required.";
    setErrors(errs);
    if (!isClean(errs)) return;

    setSaving(true);
    const body = { name: form.name.trim(), description: form.description.trim() || null };
    try {
      if (editingId === null) {
        await apiFetch("/Category/add", "POST", body);
        toast(`Category "${body.name}" created.`, "success");
      } else {
        await apiFetch(`/Category/update?id=${editingId}`, "PUT", body);
        toast(`Category "${body.name}" updated.`, "success");
      }
      cancelEdit();
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Category) {
    if (!(await confirm(`Delete category "${c.name}"?`))) return;
    try {
      // The backend returns 409 while the category still owns products; that
      // message is surfaced to the admin so they know to reassign first.
      await apiFetch(`/Category/delete?id=${c.categoryId}`, "DELETE");
      toast(`Category "${c.name}" deleted.`, "success");
      if (editingId === c.categoryId) cancelEdit();
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function doReassign() {
    if (!reassign?.target) return toast("Pick a category to move products into.", "info");
    try {
      await apiFetch(
        `/Category/reassignProducts?id=${reassign.id}&targetCategoryId=${reassign.target}`,
        "PATCH",
      );
      toast("Products moved.", "success");
      setReassign(null);
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <div>
      {/* --- Create / edit form --- */}
      <div className="mb-6 rounded-2xl bg-white/60 p-5 shadow-sm">
        <h3 className="mb-3 font-bold text-ink">{editingId === null ? "New category" : "Edit category"}</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-ink/50">
            Name
            <input
              className={`mt-1 block w-48 rounded-full border px-3 py-2 text-sm outline-none focus:ring-2 ${fieldRing(!!errors.name)}`}
              placeholder="Electronics"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                if (errors.name) setErrors((errs) => ({ ...errs, name: undefined }));
              }}
              aria-invalid={!!errors.name}
            />
            <FieldError msg={errors.name} />
          </label>
          <label className="text-xs text-ink/50">
            Description
            <input
              className="mt-1 block w-72 rounded-full border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
              placeholder="Optional"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-accent-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-600 disabled:bg-ink/5"
          >
            {saving ? "Saving…" : editingId === null ? "Add category" : "Save changes"}
          </button>
          {editingId !== null && (
            <button
              onClick={cancelEdit}
              className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink/70 hover:bg-ink/5"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* --- Categories table --- */}
      {loading ? (
        <p className="text-sm text-ink/40">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white/60 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-accent-100 text-xs uppercase text-ink/50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {categories.map((c) => {
                const count = productCount(c);
                return (
                  <tr key={c.categoryId} className="hover:bg-ink/5">
                    <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                    <td className="px-4 py-3 text-ink/60">{c.description || "—"}</td>
                    <td className="px-4 py-3 text-ink/60">{count}</td>
                    <td className="px-4 py-3">
                      {reassign?.id === c.categoryId ? (
                        // Inline "move products" picker: choose any OTHER category.
                        <div className="flex justify-end gap-2">
                          <select
                            value={reassign.target}
                            onChange={(e) => setReassign({ id: c.categoryId, target: e.target.value })}
                            className="rounded-full border border-ink/15 px-3 py-1 text-xs outline-none focus:border-accent-500"
                          >
                            <option value="">Move products to…</option>
                            {categories
                              .filter((o) => o.categoryId !== c.categoryId)
                              .map((o) => (
                                <option key={o.categoryId} value={o.categoryId}>
                                  {o.name}
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={doReassign}
                            className="rounded-full bg-accent-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-600"
                          >
                            Move
                          </button>
                          <button
                            onClick={() => setReassign(null)}
                            className="rounded-full border border-ink/15 px-2.5 py-1 text-xs font-medium text-ink/70 hover:bg-ink/5"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(c)}
                            className="rounded-full border border-ink/15 px-2.5 py-1 text-xs font-medium text-ink/70 hover:bg-ink/5"
                          >
                            Edit
                          </button>
                          {count > 0 && (
                            <button
                              onClick={() => setReassign({ id: c.categoryId, target: "" })}
                              className="rounded-full border border-ink/15 px-2.5 py-1 text-xs font-medium text-ink/70 hover:bg-ink/5"
                            >
                              Move products
                            </button>
                          )}
                          <button
                            onClick={() => remove(c)}
                            className="rounded-full border border-accent-200 px-2.5 py-1 text-xs font-medium text-accent-700 hover:bg-accent-100"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-ink/40">
                    No categories yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
