import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { isAdmin, isLoggedIn, logout, apiFetch, ensureCart, onCartChange } from "../api";
import { BrandIcon, UserIcon, MenuIcon, XIcon, CartIcon } from "./icons";

// Shared top navigation. Links adapt to the user's role (vendor/admin extras).
// On desktop the links and account menu sit inline; below md they collapse
// behind a hamburger toggle.
export default function NavBar() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const email = localStorage.getItem("email");

  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Total quantity in the cart, shown as a badge on the cart icon.
  const [cartCount, setCartCount] = useState(0);
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

  // Load the cart badge count, and keep it in sync: onCartChange fires whenever
  // any page adds/removes/clears items (via bumpCart), so the badge updates
  // live without a page reload.
  useEffect(() => {
    if (!isLoggedIn()) return;

    async function refreshCount() {
      try {
        const id = await ensureCart();
        if (!id) return setCartCount(0);
        const cart = (await apiFetch(`/Cart/getById?id=${id}`)) as {
          cartItems?: { quantity: number }[];
        };
        const total = (cart.cartItems ?? []).reduce((s, i) => s + i.quantity, 0);
        setCartCount(total);
      } catch {
        setCartCount(0);
      }
    }

    refreshCount();
    return onCartChange(refreshCount); // unsubscribe on unmount
  }, []);

  const loggedIn = isLoggedIn();
  const links: { to: string; label: string; end?: boolean }[] = [
    { to: "/", label: "Products", end: true },
  ];
  if (loggedIn) {
    links.push({ to: "/orders", label: "My Orders" });
  }
  if (role === "Vendor") {
    links.push({ to: "/vendor/products", label: "My Products" });
    links.push({ to: "/vendor/profile", label: "My Store" });
  }
  if (isAdmin()) links.push({ to: "/admin", label: "Admin" });

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="sticky top-0 z-40 bg-page px-6 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <NavLink
          to="/"
          className="flex items-center gap-2 font-heading text-lg text-ink"
          onClick={() => setMobileOpen(false)}
        >
          <BrandIcon className="h-6 w-6 text-accent-500" />
          Online Marketplace
        </NavLink>

        {/* Desktop links + account */}
        <div className="ml-auto hidden items-center gap-4 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `text-sm hover:text-accent-500 ${isActive ? "font-semibold text-accent-500" : "text-ink/70"}`
              }
            >
              {l.label}
            </NavLink>
          ))}

          {/* Cart icon with a live item-count badge. */}
          {loggedIn && (
            <NavLink
              to="/cart"
              aria-label={`Cart (${cartCount} items)`}
              className={({ isActive }) =>
                `relative hover:text-accent-500 ${isActive ? "text-accent-500" : "text-ink/70"}`
              }
            >
              <CartIcon className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-semibold leading-none text-white">
                  {cartCount}
                </span>
              )}
            </NavLink>
          )}

          {!loggedIn && (
            <Link
              to="/login"
              className="rounded-full bg-accent-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-accent-600"
            >
              Sign in
            </Link>
          )}
          {loggedIn && (
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
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
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
                    className="rounded-lg px-2 py-2 text-left text-sm text-accent-700 hover:bg-ink/5"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={mobileOpen}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 bg-white text-ink/70 hover:bg-ink/5 md:hidden"
        >
          {mobileOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-lg md:hidden">
          <div className="flex flex-col">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-2 py-2 text-sm hover:bg-ink/5 ${isActive ? "font-semibold text-accent-500" : "text-ink/70"}`
                }
              >
                {l.label}
              </NavLink>
            ))}
            {loggedIn && (
              <NavLink
                to="/cart"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-ink/5 ${isActive ? "font-semibold text-accent-500" : "text-ink/70"}`
                }
              >
                <CartIcon className="h-5 w-5" />
                Cart
                {cartCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-semibold leading-none text-white">
                    {cartCount}
                  </span>
                )}
              </NavLink>
            )}
          </div>

          {loggedIn ? (
          <>
          <div className="flex items-center gap-3 border-t border-ink/10 pt-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
              <UserIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{email}</p>
              <span className="mt-1 inline-block rounded-full bg-sage-100 px-2.5 py-0.5 text-xs font-medium text-sage-700">
                {role}
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <Link
              to="/account"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-2 py-2 text-sm hover:bg-ink/5"
            >
              My account
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg px-2 py-2 text-left text-sm text-accent-700 hover:bg-ink/5"
            >
              Sign out
            </button>
          </div>
          </>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="rounded-full bg-accent-500 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-accent-600"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
