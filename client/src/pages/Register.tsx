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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow">
        <h1 className="mb-4 text-xl font-bold">Register</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            className="w-full rounded border px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full rounded border px-3 py-2"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full rounded bg-green-600 py-2 text-white hover:bg-green-700"
          >
            Create account &amp; login
          </button>
        </form>
        <p className="mt-3 text-sm text-gray-500">
          Have an account?{" "}
          <Link to="/login" className="text-blue-600">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
