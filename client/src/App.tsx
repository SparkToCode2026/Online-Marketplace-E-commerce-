import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import ProductDetail from "./pages/ProductDetail";
import Admin from "./pages/Admin";
import Categories from "./pages/Categories";
import Account from "./pages/Account";
import VendorProfile from "./pages/VendorProfile";
import VendorProducts from "./pages/VendorProducts";

// Routes: each page lives in its own file under src/pages.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Shop />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/account" element={<Account />} />
      <Route path="/vendor/profile" element={<VendorProfile />} />
      <Route path="/vendor/products" element={<VendorProducts />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}
