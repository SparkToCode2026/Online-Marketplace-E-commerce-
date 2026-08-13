import { NavLink, useNavigate } from "react-router-dom";
import { isAdmin, logout } from "../api";
import { BrandIcon } from "./icons";

// Shared top navigation. Links adapt to the user's role (vendor/admin extras).
export default function NavBar() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const email = localStorage.getItem("email");

  const links = [
    { to: "/", label: "Products", end: true },
    { to: "/categories", label: "Categories" },
    { to: "/cart", label: "Cart" },
    { to: "/account", label: "Account" },
  ];
  if (role === "Vendor") {
    links.push({ to: "/vendor/products", label: "My Products" });
    links.push({ to: "/vendor/profile", label: "My Store" });
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 bg-gray-800 px-6 py-4 text-white">
      <NavLink to="/" className="flex items-center gap-2 text-lg font-bold">
        <BrandIcon className="h-6 w-6" />
        Online Marketplace
      </NavLink>

      <div className="flex flex-wrap items-center gap-4">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `text-sm hover:underline ${isActive ? "font-semibold text-white" : "text-gray-300"}`
            }
          >
            {l.label}
          </NavLink>
        ))}
        {isAdmin() && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `text-sm hover:underline ${isActive ? "font-semibold" : ""} text-amber-300`
            }
          >
            Admin
          </NavLink>
        )}
        <span className="text-sm text-gray-400">{email}</span>
        <button
          onClick={handleLogout}
          className="rounded bg-gray-600 px-3 py-1 text-sm hover:bg-gray-500"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
