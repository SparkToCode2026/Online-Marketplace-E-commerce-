interface PaginationProps {
  page: number;
  totalPages: number;
  // Takes the setState updater directly (e.g. React's setPage) so Prev/Next always
  // step from the latest page even if two clicks land before a re-render.
  onChange: (update: (page: number) => number) => void;
}

// Simple prev/next pager. Renders nothing when everything fits on one page.
export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onChange((p) => p - 1)}
        disabled={page <= 1}
        className="rounded-full border border-ink/15 px-4 py-1.5 text-sm font-medium text-ink/70 transition hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        Prev
      </button>
      <span className="text-sm text-ink/60">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange((p) => p + 1)}
        disabled={page >= totalPages}
        className="rounded-full border border-ink/15 px-4 py-1.5 text-sm font-medium text-ink/70 transition hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        Next
      </button>
    </div>
  );
}
