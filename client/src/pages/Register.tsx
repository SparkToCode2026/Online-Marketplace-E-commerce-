import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../api";
import { BrandIcon } from "../components/icons";
import { FieldError, fieldRing, isClean, type Errors } from "../lib/formErrors";

// Register page — creates the account, then logs in with it.
export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Errors<"name" | "email" | "password">>({});
  const navigate = useNavigate();

  function validate() {
    const errs: Errors<"name" | "email" | "password"> = {};
    if (!name.trim()) errs.name = "Name is required.";
    if (!email.trim()) errs.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "Enter a valid email address.";
    if (!password) errs.password = "Password is required.";
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const errs = validate();
    setErrors(errs);
    if (!isClean(errs)) return;
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
    <div className="flex min-h-screen font-body text-ink">
      <div className="hidden flex-col justify-center bg-gradient-to-br from-sage-500 to-sage-700 p-12 text-white md:flex md:w-1/2">
        <div className="flex items-center gap-2 font-heading text-3xl">
          <BrandIcon className="h-8 w-8" />
          Online Marketplace
        </div>
        <h1 className="mt-6 font-heading text-4xl leading-tight">Join the marketplace.</h1>
        <p className="mt-4 max-w-sm text-white/85">
          Create an account to start building your cart and checking out.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-page p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white/70 p-8 shadow-lg">
          <h2 className="mb-1 font-heading text-2xl">Register</h2>
          <p className="mb-6 text-sm text-ink/60">Create your account to get started.</p>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <input
                className={`w-full rounded-full border px-3 py-2.5 outline-none transition focus:ring-2 ${fieldRing(!!errors.name)}`}
                placeholder="Name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((errs) => ({ ...errs, name: undefined }));
                }}
                aria-invalid={!!errors.name}
                required
              />
              <FieldError msg={errors.name} />
            </div>
            <div>
              <input
                type="email"
                className={`w-full rounded-full border px-3 py-2.5 outline-none transition focus:ring-2 ${fieldRing(!!errors.email)}`}
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((errs) => ({ ...errs, email: undefined }));
                }}
                aria-invalid={!!errors.email}
                required
              />
              <FieldError msg={errors.email} />
            </div>
            <div>
              <input
                type="password"
                className={`w-full rounded-full border px-3 py-2.5 outline-none transition focus:ring-2 ${fieldRing(!!errors.password)}`}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((errs) => ({ ...errs, password: undefined }));
                }}
                aria-invalid={!!errors.password}
                required
              />
              <FieldError msg={errors.password} />
            </div>
            {error && <p className="text-sm text-accent-700">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-full bg-accent-500 py-2.5 font-medium text-white transition hover:bg-accent-600"
            >
              Create account &amp; login
            </button>
          </form>
          <p className="mt-4 text-sm text-ink/60">
            Have an account?{" "}
            <Link to="/login" className="font-medium text-accent-700 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
