import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../api";

// Register page — creates the account, then logs in with it.
export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/User/register", "POST", {
        userName: name,
        email,
        password,
        role: "Customer",
      });
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
      <div className="hidden flex-col justify-center bg-gradient-to-br from-emerald-600 to-teal-800 p-12 text-white md:flex md:w-1/2">
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
        <h1 className="mt-6 text-4xl font-extrabold leading-tight">Join the marketplace.</h1>
        <p className="mt-4 max-w-sm text-emerald-100">
          Create an account to start building your cart and checking out.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
          <h2 className="mb-1 text-2xl font-bold text-gray-900">Register</h2>
          <p className="mb-6 text-sm text-gray-500">Create your account to get started.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition hover:bg-emerald-700"
            >
              Create account &amp; login
            </button>
          </form>
          <p className="mt-4 text-sm text-gray-500">
            Have an account?{" "}
            <Link to="/login" className="font-medium text-emerald-600 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
