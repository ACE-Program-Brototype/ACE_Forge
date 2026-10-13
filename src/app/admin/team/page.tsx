"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  RiShieldUserLine,
  RiUserAddLine,
  RiMailLine,
  RiCheckLine,
  RiCloseLine,
  RiLockPasswordLine,
} from "react-icons/ri";

interface AdminItem {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function TeamManagementPage() {
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "SUPER_ADMIN">("ADMIN");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/team");
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load admin team.");
        return;
      }
      setAdmins(data.admins);
    } catch {
      setError("An unexpected network error occurred while loading team data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role,
          password: password.trim() ? password : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Failed to create administrator.");
        setSubmitting(false);
        return;
      }

      setSuccessInfo(
        `Administrator ${data.admin.name} successfully created! Temporary password: ${data.temporaryPassword} (Invite email sent).`
      );
      setName("");
      setEmail("");
      setPassword("");
      setShowModal(false);
      fetchAdmins();
    } catch {
      setFormError("Failed to communicate with server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin: AdminItem) => {
    const actionText = admin.isActive ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${actionText} ${admin.name}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/team/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !admin.isActive }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || `Failed to ${actionText} administrator.`);
        return;
      }

      fetchAdmins();
    } catch {
      alert("Network error updating administrator status.");
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-ace badge-pending text-xs">SUPER ADMIN ACCESS ONLY</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-primary mt-1">
            Team & Administrator Management
          </h1>
          <p className="text-secondary text-sm mt-1">
            Manage engineering faculty, program directors, and mentors with authorized administrative access.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setShowModal(true);
          }}
          className="btn-primary text-sm flex items-center gap-2 shadow-sm"
        >
          <RiUserAddLine className="text-base" />
          Invite Administrator
        </button>
      </div>

      {successInfo && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-900 text-sm flex items-center justify-between">
          <span>{successInfo}</span>
          <button
            onClick={() => setSuccessInfo(null)}
            className="text-green-700 hover:text-green-900 text-base"
          >
            <RiCloseLine />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Admin Table */}
      <div className="card-ace overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <div className="font-semibold text-primary text-sm">
            Active Faculty & Leadership ({admins.length})
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted text-sm">Loading administrators...</div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">No administrators found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-outline-variant text-xs uppercase font-bold text-muted">
                <tr>
                  <th className="px-6 py-3">Administrator</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Invited By</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {admins.map((item) => (
                  <tr key={item.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-primary">{item.name}</div>
                      <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
                        <RiMailLine />
                        {item.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.role === "SUPER_ADMIN" ? (
                        <span className="badge-ace badge-pending text-xs">SUPER ADMIN</span>
                      ) : (
                        <span className="badge-ace badge-info text-xs">ADMIN (EMPLOYEE)</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.isActive ? (
                        <span className="badge-ace badge-success text-xs">ACTIVE</span>
                      ) : (
                        <span className="badge-ace badge-error text-xs">DEACTIVATED</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-secondary">
                      {item.createdBy ? item.createdBy.name : "System Seed"}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded border transition-colors ${
                          item.isActive
                            ? "border-red-200 text-red-700 hover:bg-red-50"
                            : "border-green-200 text-green-700 hover:bg-green-50"
                        }`}
                      >
                        {item.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-primary-soft text-primary flex items-center justify-center text-lg">
                  <RiShieldUserLine />
                </div>
                <h3 className="font-serif text-xl font-bold text-primary">Invite Administrator</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted hover:text-primary text-xl"
              >
                <RiCloseLine />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Navaneeth Sankar"
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@aceprogram.org"
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "ADMIN" | "SUPER_ADMIN")}
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary bg-white"
                >
                  <option value="ADMIN">ADMIN (Employee / Mentor)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Full Administrative Control)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-primary">
                    Temporary Password
                  </label>
                  <span className="text-[11px] text-muted">Leave empty to auto-generate</span>
                </div>
                <div className="relative">
                  <RiLockPasswordLine className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Auto-generated secure password"
                    className="w-full pl-9 pr-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  {submitting ? "Inviting..." : (
                    <>
                      <RiCheckLine />
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
