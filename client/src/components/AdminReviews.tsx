import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmDialog";
import { TrashIcon } from "./icons";
import { Stars } from "./ProductReviews";

// A review as returned by GET /Review/filter (admin view). isApproved is the
// moderation flag: false means the storefront hides it.
interface Review {
  reviewId: number;
  userId: number;
  productId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  isApproved: boolean;
  user?: { username: string; email: string } | null;
  product?: { name: string } | null;
}

// Visibility filter pills, translated into the ?isApproved= query.
const VISIBILITY = [
  { key: "all", label: "All" },
  { key: "visible", label: "Visible" },
  { key: "hidden", label: "Hidden" },
] as const;
type VisibilityKey = (typeof VISIBILITY)[number]["key"];

const RATINGS = [
  { value: "", label: "Any rating" },
  { value: "5", label: "5 stars" },
  { value: "4", label: "4+ stars" },
  { value: "3", label: "3+ stars" },
  { value: "2", label: "2+ stars" },
];

function when(iso: string) {
  const d = new Date(iso);
  return d.getFullYear() > 1 ? d.toLocaleDateString() : "—";
}

// Admin "Reviews" tab: moderate customer reviews. Hiding a review keeps the row
// but drops it from the storefront and from the public rating averages.
// Backed by GET /Review/filter, PATCH /Review/approve and DELETE /Review/delete.
export default function AdminReviews() {
  const toast = useToast();
  const confirm = useConfirm();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibility, setVisibility] = useState<VisibilityKey>("all");
  const [minRating, setMinRating] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  // Server-side filter: rebuild the query whenever a filter changes.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibility, minRating]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (visibility !== "all") params.set("isApproved", String(visibility === "visible"));
      if (minRating) params.set("minRating", minRating);
      const qs = params.toString();
      const data = (await apiFetch(`/Review/filter${qs ? `?${qs}` : ""}`)) as Review[];
      setReviews(data.sort((a, b) => b.reviewId - a.reviewId));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  // Hide or restore a review. Hidden reviews stop counting toward the product's
  // public average, so refresh the list after the server confirms.
  async function setApproved(r: Review, isApproved: boolean) {
    if (!isApproved) {
      const ok = await confirm(
        `Hide this review? It disappears from the storefront and stops counting toward the product's rating.`,
        { title: "Hide review", confirmLabel: "Hide" },
      );
      if (!ok) return;
    }
    setBusyId(r.reviewId);
    try {
      await apiFetch(`/Review/approve?id=${r.reviewId}&isApproved=${isApproved}`, "PATCH");
      toast(isApproved ? "Review is visible again." : "Review hidden.", isApproved ? "success" : "info");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(r: Review) {
    const ok = await confirm("Delete this review permanently? Hiding it is usually enough.", {
      title: "Delete review",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setBusyId(r.reviewId);
    try {
      await apiFetch(`/Review/delete?id=${r.reviewId}`, "DELETE");
      toast("Review deleted.", "info");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  const hiddenCount = reviews.filter((r) => !r.isApproved).length;

  return (
    <div>
      {/* Filters feed the /Review/filter query. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
        >
          {RATINGS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {VISIBILITY.map((v) => (
          <button
            key={v.key}
            onClick={() => setVisibility(v.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              visibility === v.key
                ? "bg-accent-500 text-white"
                : "bg-white/60 text-ink/70 hover:bg-ink/5"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Loading…</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink/50">
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            {hiddenCount > 0 && ` · ${hiddenCount} hidden`}
          </p>

          {reviews.length === 0 ? (
            <div className="rounded-2xl bg-white/60 p-10 text-center shadow-sm">
              <p className="text-ink/60">No reviews match your filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div
                  key={r.reviewId}
                  className={`rounded-2xl p-4 shadow-sm ${r.isApproved ? "bg-white/60" : "bg-ink/5"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Stars value={r.rating} size="h-4 w-4" />
                        <span className="font-medium text-ink">
                          {r.product?.name ?? `Product #${r.productId}`}
                        </span>
                        {!r.isApproved && (
                          <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-ink/50">
                        {r.user?.username ?? `User #${r.userId}`} · {when(r.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setApproved(r, !r.isApproved)}
                        disabled={busyId === r.reviewId}
                        className="rounded-full border border-ink/15 px-3 py-1 text-xs font-medium text-ink/70 transition hover:bg-ink/5 disabled:opacity-40"
                      >
                        {r.isApproved ? "Hide" : "Show"}
                      </button>
                      <button
                        onClick={() => remove(r)}
                        disabled={busyId === r.reviewId}
                        title="Delete review"
                        aria-label="Delete review"
                        className="rounded-full p-1.5 text-ink/30 transition hover:bg-accent-100 hover:text-accent-600 disabled:opacity-40"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {r.comment && <p className="mt-2 text-sm text-ink/80">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
