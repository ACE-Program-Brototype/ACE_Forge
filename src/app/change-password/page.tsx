"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RiKey2Line, RiLockPasswordLine, RiShieldCheckLine, RiLogoutBoxRLine } from "react-icons/ri";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/student/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to update password. Please check your current password.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("An unexpected network error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/student/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-outline-variant bg-white py-4 px-6">
        <div className="max-w-container-max mx-auto flex items-center justify-between">
          <div className="font-serif text-2xl font-bold tracking-tight text-primary">
            ACE <span className="text-accent">FORGE</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-red-700 transition-colors"
          >
            <RiLogoutBoxRLine />
            Log Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white border border-outline-variant rounded-xl shadow-lg p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
              <RiKey2Line />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">First-Time Setup Required</span>
              <h1 className="font-serif text-2xl font-bold text-primary">Set Your New Password</h1>
            </div>
          </div>

          <div className="mb-6 p-4 rounded-lg bg-primary-soft border border-primary/10 text-primary text-xs leading-relaxed">
            <div className="font-semibold flex items-center gap-1.5 mb-1 text-primary">
              <RiShieldCheckLine className="text-accent text-sm" />
              Security Policy Requirement
            </div>
            Your initial temporary password is your phone number. You must create a unique, strong password before accessing your weekly engineering tasks.
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-2">
                Current Temporary Password (Phone Number)
              </label>
              <div className="relative">
                <RiLockPasswordLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-lg" />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your registered phone number"
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-md text-sm text-primary placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-2">
                New Password
              </label>
              <div className="relative">
                <RiLockPasswordLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-lg" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters with numbers & symbols"
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-md text-sm text-primary placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <RiLockPasswordLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-lg" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type your new password"
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
                <span>Updating Credentials...</span>
              ) : (
                <span>Confirm & Enter Student Portal</span>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant bg-white py-4 text-center text-xs text-muted">
        ACE Security Framework · Zero-Trust Credential Rotation
      </footer>
    </div>
  );
}
