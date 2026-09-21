"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      const errorMsg = "Password must be at least 6 characters long";
      setError(errorMsg);
      showToast(errorMsg, "error");
      return;
    }

    setLoading(true);

    const result = await register(email, password, fullName);

    if (!result.success) {
      setError(result.error);
      showToast(result.error, "error");
      setLoading(false);
    } else {
      showToast("Account created successfully!", "success");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07090d] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white">
            <img src="/logo.png" alt="GetEasy" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="mt-2 text-sm text-white/40">Start your learning journey with GetEasy</p>
        </div>

        {/* Register Form */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/70">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[#080a0f] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-blue-400/30 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[#080a0f] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-blue-400/30 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[#080a0f] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-blue-400/30 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-white/30">Must be at least 6 characters</p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-400/10 bg-red-400/[0.04] px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-white/40">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-400 hover:text-blue-300">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/25">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
