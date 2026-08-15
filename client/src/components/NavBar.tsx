import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { isAdmin, logout } from "../api";
import { BrandIcon, UserIcon, MenuIcon, XIcon } from "./icons";

// Shared top navigation. Links adapt to the user's role (vendor/admin extras).
// On desktop the links and account menu sit inline; below md they collapse
// behind a hamburger toggle.
export default function NavBar() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const email = localStorage.getItem("email");

  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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
    { to: "/cart", label: "Cart" },
    { to: "/orders", label: "My Orders" },
  ];
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
    <nav className="bg-page px-6 py-4">
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
          </div>

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
        </div>
      )}
    </nav>
  );
}
