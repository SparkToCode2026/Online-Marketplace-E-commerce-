import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmDialog";
import { StarIcon, TrashIcon } from "./icons";

// A single review as returned by GET /Review/all. The API serializes every DTO
// field as camelCase, so the nested reviewer is `user.username` (verified against
// the live response — a contract note claiming PascalCase was wrong).
interface Review {
  reviewId: number;
  userId: number;
  productId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  user?: { username: string } | null;
}

// A row of 5 stars. `value` is how many are filled; when `onPick` is supplied the
// stars become clickable (used by the "write a review" form).
export function Stars({
  value,
  onPick,
  size = "h-5 w-5",
}: {
  value: number;
  onPick?: (n: number) => void;
  size?: string;
}) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onPick}
          onClick={() => onPick?.(n)}
          className={onPick ? "cursor-pointer" : "cursor-default"}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <StarIcon className={`${size} ${n <= value ? "text-accent-500" : "text-ink/25"}`} />
        </button>
      ))}
    </div>
  );
}

// Reviews section shown on the product page. Handles reading the product's
// reviews + average, writing a new one, and deleting your own.
export default function ProductReviews({ productId }: { productId: number }) {
  const toast = useToast();
  const confirm = useConfirm();
  const myId = Number(localStorage.getItem("userId"));

  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // The "write a review" form state.
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reload whenever the product changes (the user can navigate between products
  // without the component unmounting).
  const loadedFor = useRef<number | null>(null);
  useEffect(() => {
    if (loadedFor.current === productId) return;
    loadedFor.current = productId;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function load() {
    setLoading(true);
    try {
      // There is no "reviews for one product" endpoint, so we pull them all and
      // filter client-side. The average has its own endpoint, which returns 404
      // when a product has no reviews yet — we treat that as "no average".
      const all = (await apiFetch("/Review/all")) as Review[];
      const mine = all
        .filter((r) => r.productId === productId)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      setReviews(mine);

      try {
        const avg = (await apiFetch(`/Review/averageRating?productId=${productId}`)) as {
          averageRating: number;
        };
        setAverage(avg.averageRating);
      } catch {
        setAverage(null); // 404 = no reviews yet
      }
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (rating < 1) {
      toast("Pick a star rating first.", "info");
      return;
    }
    setSubmitting(true);
    try {
      // The backend only lets you review a product you've actually ordered; if
      // you haven't, it replies 400 and apiFetch throws that message for us.
      await apiFetch("/Review/add", "POST", {
        userId: myId,
        productId,
        rating,
        comment: comment.trim() || null,
      });
      toast("Thanks for your review!", "success");
      setRating(0);
      setComment("");
      loadedFor.current = null; // force the guard to allow a reload
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(r: Review) {
    if (!(await confirm("Delete your review?"))) return;
    try {
      await apiFetch(`/Review/delete?id=${r.reviewId}`, "DELETE");
      toast("Review deleted.", "info");
      setReviews((prev) => prev.filter((x) => x.reviewId !== r.reviewId));
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <div className="mt-10 border-t border-ink/10 pt-8">
      <div className="mb-5 flex items-center gap-3">
        <h2 className="text-xl font-bold text-ink">Reviews</h2>
        {average !== null && (
          <div className="flex items-center gap-1.5">
            <Stars value={Math.round(average)} />
            <span className="text-sm font-medium text-ink/50">
              {average.toFixed(1)} ({reviews.length})
            </span>
          </div>
        )}
      </div>

      {/* Write-a-review form. The product page already requires login, so we can
          assume a signed-in user here. */}
      <div className="mb-6 rounded-2xl bg-white/60 p-5 shadow-sm">
        <p className="mb-2 text-sm font-medium text-ink/70">Write a review</p>
        <Stars value={rating} onPick={setRating} />
        <textarea
          className="mt-3 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
          placeholder="Share your thoughts (optional)…"
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button
          onClick={submit}
          disabled={submitting}
          className="mt-3 rounded-full bg-accent-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-600 disabled:bg-ink/5"
        >
          {submitting ? "Posting…" : "Post review"}
        </button>
        <p className="mt-2 text-xs text-ink/40">
          You can only review products you've purchased.
        </p>
      </div>

      {/* The list of existing reviews. */}
      {loading ? (
        <p className="text-sm text-ink/40">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-ink/40">No reviews yet — be the first!</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.reviewId} className="rounded-2xl bg-white/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} />
                  <span className="text-sm font-medium text-ink/70">
                    {r.user?.username ?? `User #${r.userId}`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink/40">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                  {/* Only your own reviews get a delete button. */}
                  {r.userId === myId && (
                    <button
                      onClick={() => remove(r)}
                      className="text-ink/40 transition hover:text-accent-700"
                      title="Delete your review"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {r.comment && <p className="mt-2 text-sm text-ink/60">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
