import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../api";
import { BrandIcon } from "../components/icons";

const demoAccounts = [
  { label: "Admin", email: "khaild.alhadi2021@gmail.com" },
  { label: "Vendor", email: "alijah3099@gmail.com" },
  { label: "Customer", email: "yousef@marketplace.com" },
];
const demoPassword = "Passw0rd!23";

// Login page — verifies credentials and stores the JWT.
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function login(em: string, pw: string) {
    setError("");
    try {
      const data = (await apiFetch("/User/login", "POST", { email: em, password: pw })) as {
        token: string;
        userId: number;
        role: string;
      };
      localStorage.clear();
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", String(data.userId));
      localStorage.setItem("role", data.role);
      localStorage.setItem("email", em);
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    login(email, password);
  }

  function demoLogin(em: string) {
    setEmail(em);
    setPassword(demoPassword);
    login(em, demoPassword);
  }

  return (
    <div className="flex min-h-screen font-body text-ink">
      <div className="hidden flex-col justify-center bg-terracotta-500 p-12 text-white md:flex md:w-1/2">
        <div className="flex items-center gap-2 font-heading text-3xl">
          <BrandIcon className="h-8 w-8" />
          Online Marketplace
        </div>
        <h1 className="mt-6 font-heading text-4xl leading-tight">Welcome back.</h1>
        <p className="mt-4 max-w-sm text-white/85">
          Sign in to pick up your cart, track orders, and keep shopping.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-cream p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white/70 p-8 shadow-lg">
          <h2 className="mb-1 font-heading text-2xl">Login</h2>
          <p className="mb-6 text-sm text-ink/60">Enter your details to continue.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              className="w-full rounded-full border border-ink/15 px-4 py-2.5 outline-none transition focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-100"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="w-full rounded-full border border-ink/15 px-4 py-2.5 outline-none transition focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-100"
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
              Login
            </button>
          </form>
          <p className="mt-4 text-sm text-ink/60">
            No account?{" "}
            <Link to="/register" className="font-medium text-terracotta-700 hover:underline">
              Register
            </Link>
          </p>

          <div className="mt-6 border-t border-ink/10 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/40">
              Quick test login
            </p>
            <div className="grid grid-cols-3 gap-2">
              {demoAccounts.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => demoLogin(a.email)}
                  className="rounded-full border border-ink/15 py-2 text-xs font-medium text-ink/70 transition hover:border-terracotta-500 hover:text-terracotta-700"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
