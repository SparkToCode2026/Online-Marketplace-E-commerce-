import { useEffect, useRef, useState } from "react";
import { apiFetch, formatOMR } from "../api";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmDialog";

// An order line as returned by GET /OrderItem/all. On that endpoint both the
// nested product and order ARE populated (flat), so we can read the product name
// and the parent order's status directly off each item.
interface OrderItem {
  orderItemId: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  product?: { name: string } | null;
  order?: { status: string } | null;
}

// One row from GET /OrderItem/revenueByProduct.
interface ProductRevenue {
  productId: number;
  totalRevenue: number;
}

// Minimal product/order shapes for the "add line item" pickers.
interface Product {
  productId: number;
  name: string;
  isActive: boolean;
}
interface Order {
  orderId: number;
  status: string;
}

// Admin "Items" tab: revenue-per-product summary + a table of every order line
// with inline quantity/price editing and removal, plus a form to add a line to a
// pending order. Wires up the previously-unused OrderItem controller.
export default function AdminOrderItems() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [revenue, setRevenue] = useState<ProductRevenue[]>([]);
  const [productMap, setProductMap] = useState<Record<number, string>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline edit state: which line is open, and its draft quantity + price.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftQty, setDraftQty] = useState(0);
  const [draftPrice, setDraftPrice] = useState(0);

  // "Add line item" form.
  const [addOrderId, setAddOrderId] = useState(0);
  const [addProductId, setAddProductId] = useState(0);
  const [addQty, setAddQty] = useState(1);

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
      const [rawItems, rawRevenue, rawProducts, rawOrders] = await Promise.all([
        apiFetch("/OrderItem/all") as Promise<OrderItem[]>,
        apiFetch("/OrderItem/revenueByProduct") as Promise<ProductRevenue[]>,
        apiFetch("/Product/all") as Promise<Product[]>,
        apiFetch("/Order/all") as Promise<Order[]>,
      ]);
      rawItems.sort((a, b) => b.orderItemId - a.orderItemId);
      setItems(rawItems);
      setRevenue(rawRevenue);
      setProducts(rawProducts);
      setOrders(rawOrders);
      // productId -> name, used by the revenue table (which only carries ids).
      const map: Record<number, string> = {};
      for (const p of rawProducts) map[p.productId] = p.name;
      setProductMap(map);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  // Only a pending order's lines can be added/edited/removed (backend rule).
  const isPending = (it: OrderItem) => it.order?.status === "Pending";
  const pendingOrders = orders.filter((o) => o.status === "Pending");
  const activeProducts = products.filter((p) => p.isActive);

  function startEdit(it: OrderItem) {
    setEditingId(it.orderItemId);
    setDraftQty(it.quantity);
    setDraftPrice(it.unitPrice);
  }

  // Save an edit: quantity and price live on two different endpoints, so we only
  // call the one(s) that actually changed.
  async function saveEdit(it: OrderItem) {
    try {
      if (draftQty !== it.quantity) {
        await apiFetch(`/OrderItem/update?id=${it.orderItemId}&quantity=${draftQty}`, "PUT");
      }
      if (draftPrice !== it.unitPrice) {
        await apiFetch(
          `/OrderItem/correctPrice?id=${it.orderItemId}&correctedUnitPrice=${draftPrice}`,
          "PATCH",
        );
      }
      toast(`Line #${it.orderItemId} updated.`, "success");
      setEditingId(null);
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function remove(it: OrderItem) {
    if (!(await confirm(`Remove line #${it.orderItemId} from order #${it.orderId}?`))) return;
    try {
      await apiFetch(`/OrderItem/remove?id=${it.orderItemId}`, "DELETE");
      toast(`Line #${it.orderItemId} removed.`, "info");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function addItem() {
    if (!addOrderId) return toast("Pick an order.", "info");
    if (!addProductId) return toast("Pick a product.", "info");
    if (addQty < 1) return toast("Quantity must be at least 1.", "info");
    try {
      await apiFetch("/OrderItem/add", "POST", {
        orderId: addOrderId,
        productId: addProductId,
        quantity: addQty,
      });
      toast(`Added product to order #${addOrderId}.`, "success");
      setAddProductId(0);
      setAddQty(1);
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  if (loading) return <p className="text-sm text-ink/40">Loading…</p>;

  return (
    <div>
      {/* --- Revenue per product (top sellers by money) --- */}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink/40">
          Revenue by product
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {revenue.map((r) => (
            <div key={r.productId} className="rounded-2xl bg-white/60 p-4 shadow-sm">
              <p className="truncate text-sm font-medium text-ink/70">
                {productMap[r.productId] ?? `Product #${r.productId}`}
              </p>
              <p className="mt-1 text-lg font-bold text-ink">{formatOMR(r.totalRevenue)}</p>
            </div>
          ))}
          {revenue.length === 0 && <p className="text-sm text-ink/40">No sales yet.</p>}
        </div>
      </div>

      {/* --- Add a line item to a pending order --- */}
      <div className="mb-6 rounded-2xl bg-white/60 p-5 shadow-sm">
        <h3 className="mb-3 font-bold text-ink">Add line item</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-ink/50">
            Order (pending)
            <select
              value={addOrderId}
              onChange={(e) => setAddOrderId(Number(e.target.value))}
              className="mt-1 block w-36 rounded-full border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
            >
              <option value={0} disabled>
                Select…
              </option>
              {pendingOrders.map((o) => (
                <option key={o.orderId} value={o.orderId}>
                  #{o.orderId}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink/50">
            Product
            <select
              value={addProductId}
              onChange={(e) => setAddProductId(Number(e.target.value))}
              className="mt-1 block w-52 rounded-full border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
            >
              <option value={0} disabled>
                Select…
              </option>
              {activeProducts.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink/50">
            Qty
            <input
              type="number"
              min={1}
              value={addQty}
              onChange={(e) => setAddQty(Number(e.target.value))}
              className="mt-1 block w-20 rounded-full border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
            />
          </label>
          <button
            onClick={addItem}
            className="rounded-full bg-accent-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-600"
          >
            Add
          </button>
        </div>
        {pendingOrders.length === 0 && (
          <p className="mt-2 text-xs text-ink/40">No pending orders to add items to.</p>
        )}
      </div>

      {/* --- All order lines --- */}
      <div className="overflow-hidden rounded-2xl bg-white/60 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-accent-100 text-xs uppercase text-ink/50">
            <tr>
              <th className="px-4 py-3">Line</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Unit price</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {items.map((it) => {
              const editing = editingId === it.orderItemId;
              return (
                <tr key={it.orderItemId} className="hover:bg-ink/5">
                  <td className="px-4 py-3 font-medium text-ink">#{it.orderItemId}</td>
                  <td className="px-4 py-3 text-ink/50">#{it.orderId}</td>
                  <td className="px-4 py-3 text-ink/70">
                    {it.product?.name ?? `Product #${it.productId}`}
                  </td>
                  <td className="px-4 py-3">
                    {editing ? (
                      <input
                        type="number"
                        min={1}
                        value={draftQty}
                        onChange={(e) => setDraftQty(Number(e.target.value))}
                        className="w-16 rounded border border-ink/15 px-2 py-1 text-sm outline-none focus:border-accent-500"
                      />
                    ) : (
                      it.quantity
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing ? (
                      <input
                        type="number"
                        min={0}
                        step="0.001"
                        value={draftPrice}
                        onChange={(e) => setDraftPrice(Number(e.target.value))}
                        className="w-24 rounded border border-ink/15 px-2 py-1 text-sm outline-none focus:border-accent-500"
                      />
                    ) : (
                      formatOMR(it.unitPrice)
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatOMR(it.unitPrice * it.quantity)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {editing ? (
                        <>
                          <button
                            onClick={() => saveEdit(it)}
                            className="rounded bg-accent-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded border border-ink/15 px-2.5 py-1 text-xs font-medium text-ink/70 hover:bg-ink/5"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Add/edit/remove are only allowed while the parent
                              order is still Pending (backend enforces this). */}
                          <button
                            onClick={() => startEdit(it)}
                            disabled={!isPending(it)}
                            title={isPending(it) ? "" : "Order is no longer pending"}
                            className="rounded border border-ink/15 px-2.5 py-1 text-xs font-medium text-ink/70 hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => remove(it)}
                            disabled={!isPending(it)}
                            className="rounded border border-accent-200 px-2.5 py-1 text-xs font-medium text-accent-700 hover:bg-accent-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-ink/40">
                  No order items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
