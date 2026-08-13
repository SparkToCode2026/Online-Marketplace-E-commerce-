import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import { Alert, Spinner, EmptyState } from "../components/Ui";

// NOTE: confirm exact route/casing for GET /Category/getAll in Swagger.
export function Categories() {
  const [categories, setCategories] = useState(null); // null = loading
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch("/Category/getAll")
      .then((data) => !cancelled && setCategories(data))
      .catch((err) => {
        if (!cancelled) {
          setCategories([]);
          setError(err.message);
        }
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <div className="page-header">
        <span className="page-eyebrow">Browse</span>
        <h1>Categories</h1>
        <p className="text-muted-ledger mb-0">Pick a category to see what's on offer.</p>
      </div>

      <Alert message={error} type="danger" onClose={() => setError("")} />

      <div className="row g-3">
        {categories === null ? (
          <div className="col-12"><Spinner /></div>
        ) : categories.length === 0 ? (
          <div className="col-12"><EmptyState message="No categories yet." /></div>
        ) : (
          categories.map((c) => (
            <div className="col-sm-6 col-md-4 col-lg-3" key={c.id}>
              <Link to={`/products?categoryId=${c.id}`} className="text-decoration-none">
                <div className="card-ledger h-100">
                  <div className="card-body text-center">
                    <div className="mb-2" style={{ fontSize: "1.6rem" }}>◆</div>
                    <h3 className="mb-0" style={{ fontSize: "1.05rem" }}>{c.name}</h3>
                    {c.description && (
                      <p className="text-muted-ledger mt-2 mb-0" style={{ fontSize: "0.85rem" }}>
                        {c.description}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))
        )}
      </div>
    </>
  );
}
