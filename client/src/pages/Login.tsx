import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../api";

// Login page — verifies credentials and stores the JWT.
export default function Login() {
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = (await apiFetch("/User/login", "POST", { email, password })) as {
        token: string;
        userId: number;
        role: string;
      };
      // Clear any cart/session data left over from a different account on
      // this browser before storing the new one.
      localStorage.clear();
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", String(data.userId));
      localStorage.setItem("role", data.role);
      localStorage.setItem("email", email);
      navigate("/"); // go to the shop
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-col justify-center bg-gradient-to-br from-blue-600 to-indigo-800 p-12 text-white md:flex md:w-1/2">
        <div className="flex items-center gap-2 text-3xl font-bold">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-8 w-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m-3 0h13.5l-1.14 9.13a1.5 1.5 0 01-1.49 1.37H7.38a1.5 1.5 0 01-1.49-1.37L4.75 10.5z"
            />
          </svg>
          Online Marketplace
        </div>
        <h1 className="mt-6 text-4xl font-extrabold leading-tight">Welcome back.</h1>
        <p className="mt-4 max-w-sm text-blue-100">
          Sign in to pick up your cart, track orders, and keep shopping.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
          <h2 className="mb-1 text-2xl font-bold text-gray-900">Login</h2>
          <p className="mb-6 text-sm text-gray-500">Enter your details to continue.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700"
            >
              Login
            </button>
          </form>
          <p className="mt-4 text-sm text-gray-500">
            No account?{" "}
            <Link to="/register" className="font-medium text-blue-600 hover:underline">
              Register
            </Link>
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Demo: khaild.alhadi2021@gmail.com / Passw0rd!23
          </p>
        </div>
      </div>
    </div>
  );
}
