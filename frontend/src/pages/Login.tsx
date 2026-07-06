import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, User, Mail, UserPlus } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import axios from "axios";

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, status } = useAuth();

  const from = (location.state as any)?.from as string | undefined;

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isLogin) {
        await login({ username, password });
        navigate(from ?? "/", { replace: true });
      } else {
        // Registration
        await axios.post("http://127.0.0.1:8000/api/auth/register", {
          username,
          email,
          password,
          phone_number: phoneNumber || undefined
        });
        // After successful registration, switch to login and auto-fill
        setIsLogin(true);
        setPassword("");
        setPhoneNumber("");
        setError(null);
        alert("Registration successful! Please login with your credentials.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? (isLogin ? "Login failed" : "Registration failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-[#07111f] sm:p-8">
      <div className="mx-auto max-w-md">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <div className="mb-4 flex items-start gap-3">
              <div className="mt-1 rounded-full bg-teal-500/10 p-2 text-teal-600">
                {isLogin ? <ShieldCheck size={18} /> : <UserPlus size={18} />}
              </div>
              <div>
                <h1 className="text-lg font-bold">{isLogin ? "Sign in" : "Create Account"}</h1>
                <p className="text-sm text-slate-500">
                  {isLogin ? "Login to access the toll detection system." : "Register to get started with the toll detection system."}
                </p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <User size={14} /> Username
                </span>
                <input
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </label>

              {!isLogin && (
                <label className="block">
                  <span className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <Mail size={14} /> Email
                  </span>
                  <input
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
              )}

              {!isLogin && (
                <label className="block">
                  <span className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <User size={14} /> Phone Number (Optional)
                  </span>
                  <input
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    autoComplete="tel"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <Lock size={14} /> Password
                </span>
                <input
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                />
              </label>

              {error && <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">{error}</div>}

              <Button
                type="submit"
                disabled={submitting || status === "loading"}
                className="h-10 w-full text-sm font-bold"
              >
                {submitting ? (isLogin ? "Signing in..." : "Creating account...") : (isLogin ? "Sign in" : "Create Account")}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                    setPassword("");
                    if (!isLogin) {
                      setEmail("");
                      setPhoneNumber("");
                    }
                  }}
                  className="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}