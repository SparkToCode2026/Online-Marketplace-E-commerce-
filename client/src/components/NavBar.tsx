import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useNavigate, useSearchParams } from "react-router-dom";
import { isAdmin, logout } from "../api";
import { BrandIcon, SearchIcon, UserIcon } from "./icons";

// Shared top navigation. Links adapt to the user's role (vendor/admin extras).
export default function NavBar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = localStorage.getItem("role");
  const email = localStorage.getItem("email");

  const [accountOpen, setAccountOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the account menu on any click outside it.
  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const links = [
    { to: "/", label: "Products", end: true },
    { to: "/categories", label: "Categories" },
    { to: "/cart", label: "Cart" },
    { to: "/orders", label: "My Orders" },
  ];
  if (role === "Vendor") {
    links.push({ to: "/vendor/products", label: "My Products" });
    links.push({ to: "/vendor/profile", label: "My Store" });
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // Search always lands on the shop; keep any category filter already in
  // the URL so the two combine, same as Shop's own filtering does.
  function updateSearch(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("search", value);
    else params.delete("search");
    navigate(`/?${params.toString()}`, { replace: true });
  }

  return (
    <nav className="flex flex-wrap items-center gap-3 bg-cream px-6 py-4">
      <NavLink to="/" className="flex items-center gap-2 font-heading text-lg text-ink">
        <BrandIcon className="h-6 w-6 text-terracotta-500" />
        Online Marketplace
      </NavLink>

      <div className="flex min-w-[180px] max-w-sm flex-1 items-center gap-2 rounded-full border border-ink/15 bg-white px-3.5 py-2">
        <SearchIcon className="h-4 w-4 shrink-0 text-ink/40" />
        <input
          value={searchParams.get("search") ?? ""}
          onChange={(e) => updateSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `text-sm hover:text-terracotta-500 ${isActive ? "font-semibold text-terracotta-500" : "text-ink/70"}`
            }
          >
            {l.label}
          </NavLink>
        ))}
        {isAdmin() && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `text-sm hover:text-terracotta-500 ${isActive ? "font-semibold text-terracotta-500" : "text-sage-700"}`
            }
          >
            Admin
          </NavLink>
        )}

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setAccountOpen((o) => !o)}
            aria-label="Account menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 bg-white text-ink/70 hover:bg-ink/5"
          >
            <UserIcon className="h-5 w-5" />
          </button>

          {accountOpen && (
            <div className="absolute right-0 top-11 z-30 w-64 rounded-2xl bg-white p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-terracotta-100 text-terracotta-700">
                  <UserIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{email}</p>
                  <span className="mt-1 inline-block rounded-full bg-sage-100 px-2.5 py-0.5 text-xs font-medium text-sage-700">
                    {role}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1 border-t border-ink/10 pt-3">
                <Link
                  to="/account"
                  onClick={() => setAccountOpen(false)}
                  className="rounded-lg px-2 py-2 text-sm hover:bg-ink/5"
                >
                  My account
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-lg px-2 py-2 text-left text-sm text-terracotta-700 hover:bg-ink/5"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
