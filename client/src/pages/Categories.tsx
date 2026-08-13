import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiFetch, isLoggedIn } from "../api";
import { useToast } from "../components/Toast";
import NavBar from "../components/NavBar";

interface Category {
  categoryId: number;
  name: string;
  description?: string;
}

// Categories page — lists categories; each links to the shop filtered by it.
export default function Categories() {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    apiFetch("/Category/all")
      .then((d) => setCategories(d as Category[]))
      .catch((e) => {
        setCategories([]);
        toast((e as Error).message, "error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isLoggedIn()) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="mx-auto max-w-6xl p-6">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Categories</h2>

        {categories === null ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-gray-400">No categories yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.categoryId}
                to={`/?category=${c.categoryId}`}
                className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <h3 className="font-semibold text-gray-900">{c.name}</h3>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{c.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
