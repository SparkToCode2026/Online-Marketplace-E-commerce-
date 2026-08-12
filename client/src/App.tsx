import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";

// Routes: each page lives in its own file under src/pages.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Shop />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}
