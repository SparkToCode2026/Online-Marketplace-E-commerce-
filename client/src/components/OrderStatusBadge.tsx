// A small coloured pill that shows an order's status. Both the customer's
// "My Orders" page and the admin Orders table render it, so it lives here as a
// single shared component — change a colour once and it updates everywhere.

export const ORDER_STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

// Maps each status to its Tailwind colours (Organic palette). Anything not
// listed falls back to a neutral tint (see `styles[...] ?? fallback` below).
const styles: Record<string, string> = {
  Pending: "bg-terracotta-50 text-terracotta-700",
  Processing: "bg-sage-50 text-sage-700",
  Shipped: "bg-sage-100 text-sage-700",
  Delivered: "bg-sage-100 text-sage-700 font-semibold",
  Cancelled: "bg-terracotta-100 text-terracotta-700",
};

export default function OrderStatusBadge({ status }: { status: string }) {
  const style = styles[status] ?? "bg-ink/5 text-ink/60";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {status}
    </span>
  );
}
