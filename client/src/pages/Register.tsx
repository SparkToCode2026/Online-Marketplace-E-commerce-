import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../api";
import { BrandIcon } from "../components/icons";

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
      <div className="hidden flex-col justify-center bg-gradient-to-br from-sage-500 to-sage-700 p-12 text-white md:flex md:w-1/2">
        <div className="flex items-center gap-2 text-3xl font-bold">
          <BrandIcon className="h-8 w-8" />
          Online Marketplace
        </div>
        <h1 className="mt-6 text-4xl font-extrabold leading-tight">Join the marketplace.</h1>
        <p className="mt-4 max-w-sm text-white/70">
          Create an account to start building your cart and checking out.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-cream p-4">
        <div className="w-full max-w-sm rounded-xl bg-white/60 p-8 shadow-lg">
          <h2 className="mb-1 text-2xl font-bold text-ink">Register</h2>
          <p className="mb-6 text-sm text-ink/50">Create your account to get started.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              className="w-full rounded-full border border-ink/15 px-3 py-2.5 outline-none transition focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-100"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="email"
              className="w-full rounded-full border border-ink/15 px-3 py-2.5 outline-none transition focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-100"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="w-full rounded-full border border-ink/15 px-3 py-2.5 outline-none transition focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-100"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-terracotta-700">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-full bg-terracotta-500 py-2.5 font-medium text-white transition hover:bg-terracotta-600"
            >
              Create account &amp; login
            </button>
          </form>
          <p className="mt-4 text-sm text-ink/50">
            Have an account?{" "}
            <Link to="/login" className="font-medium text-terracotta-600 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
