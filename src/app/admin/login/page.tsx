"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RiShieldUserLine, RiLockPasswordLine, RiMailLine, RiArrowRightLine } from "react-icons/ri";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Authentication failed. Invalid admin credentials.");
        setLoading(false);
        return;
      }

      router.push("/admin/dashboard");
    } catch {
      setError("An unexpected network error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-outline-variant bg-white py-4 px-6">
        <div className="max-w-container-max mx-auto flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl font-bold tracking-tight text-primary">
            ACE <span className="text-accent">FORGE</span>
          </Link>
          <Link href="/login" className="text-xs font-semibold text-secondary hover:text-primary transition-colors">
            Student Portal →
          </Link>
        </div>
      </header>

      {/* Admin Login Card */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-outline-variant rounded-xl shadow-lg p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center text-xl">
              <RiShieldUserLine />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-accent">Staff & Leadership</span>
              <h1 className="font-serif text-2xl font-bold text-primary">Admin Sign In</h1>
            </div>
          </div>

          <p className="text-secondary text-sm mb-6">
            Sign in to manage student batches, inspect weekly reports, review AI code analysis, and assign grades.
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-2">
                Administrator Email
              </label>
              <div className="relative">
                <RiMailLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-lg" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="director@aceprogram.org"
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-md text-sm text-primary placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-2">
                Admin Password
              </label>
              <div className="relative">
                <RiLockPasswordLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-lg" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-md text-sm text-primary placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 mt-2 flex items-center justify-center gap-2 font-semibold text-sm shadow-md"
            >
              {loading ? (
                <span>Verifying Authorization...</span>
              ) : (
                <>
                  <span>Sign In as Admin</span>
                  <RiArrowRightLine />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-outline-variant text-center">
            <p className="text-xs text-muted">
              Access restricted to authorized personnel and program directors. All sessions are audited.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant bg-white py-4 text-center text-xs text-muted">
        ACE Forge Administrative Control Subsystem
      </footer>
    </div>
  );
}
