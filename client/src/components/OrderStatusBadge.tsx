// A small coloured pill that shows an order's status. Both the customer's
// "My Orders" page and the admin Orders table render it, so it lives here as a
// single shared component — change a colour once and it updates everywhere.

// The statuses an order can move through. The backend has no lookup endpoint
// for these (Checkout only ever sets "Pending"), so we keep the canonical list
// on the frontend. The admin dropdown is built from this array, which means
// adding a new status later is a one-line change here.
export const ORDER_STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

// Maps each status to its Tailwind colours. Anything not listed falls back to a
// neutral grey (see `styles[...] ?? fallback` below), so an unexpected value
// from the API still renders instead of crashing.
const styles: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Processing: "bg-blue-50 text-blue-700",
  Shipped: "bg-indigo-50 text-indigo-700",
  Delivered: "bg-green-50 text-green-700",
  Cancelled: "bg-red-50 text-red-600",
};

export default function OrderStatusBadge({ status }: { status: string }) {
  const style = styles[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {status}
    </span>
  );
}
