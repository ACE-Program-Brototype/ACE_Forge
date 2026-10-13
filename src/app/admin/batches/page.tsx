"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  RiStackLine,
  RiAddLine,
  RiCalendarEventLine,
  RiGroupLine,
  RiCloseLine,
  RiCheckLine,
  RiDeleteBinLine,
} from "react-icons/ri";

interface BatchItem {
  id: string;
  name: string;
  startDate: string;
  status: "ACTIVE" | "COMPLETED";
  createdAt: string;
  _count?: {
    students: number;
  };
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/batches");
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load batches.");
        return;
      }
      setBatches(data.batches);
    } catch {
      setError("An unexpected network error occurred while loading batches.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, startDate, status }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Failed to create batch.");
        setSubmitting(false);
        return;
      }

      setName("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setShowModal(false);
      fetchBatches();
    } catch {
      setFormError("Failed to communicate with server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBatch = async (batch: BatchItem) => {
    if (!confirm(`Are you sure you want to delete batch "${batch.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/batches/${batch.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to delete batch.");
        return;
      }
      fetchBatches();
    } catch {
      alert("Network error deleting batch.");
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-primary">Cohort Batches</h1>
          <p className="text-secondary text-sm mt-1">
            Create and monitor engineering cohort intakes, schedules, and active student enrollments.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setShowModal(true);
          }}
          className="btn-primary text-sm flex items-center gap-2 shadow-sm"
        >
          <RiAddLine className="text-base" />
          Create New Batch
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Batches Grid */}
      {loading ? (
        <div className="p-12 text-center text-muted text-sm">Loading cohort batches...</div>
      ) : batches.length === 0 ? (
        <div className="card-ace p-12 text-center text-muted text-sm">
          No batches found. Create your first engineering cohort batch.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => (
            <div key={batch.id} className="card-ace p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center text-xl">
                    <RiStackLine />
                  </div>
                  {batch.status === "ACTIVE" ? (
                    <span className="badge-ace badge-success text-xs">ACTIVE COHORT</span>
                  ) : (
                    <span className="badge-ace badge-info text-xs">COMPLETED</span>
                  )}
                </div>

                <h3 className="font-serif text-xl font-bold text-primary mb-2">{batch.name}</h3>

                <div className="space-y-1.5 text-xs text-secondary mb-6">
                  <div className="flex items-center gap-2">
                    <RiCalendarEventLine className="text-muted" />
                    <span>Commenced: {new Date(batch.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiGroupLine className="text-muted" />
                    <span>{batch._count?.students || 0} Students Enrolled</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant flex items-center justify-between text-xs">
                <span className="text-muted">
                  Created {new Date(batch.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleDeleteBatch(batch)}
                  className="text-red-700 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                  title="Delete Batch"
                >
                  <RiDeleteBinLine className="text-base" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-primary-soft text-primary flex items-center justify-center text-lg">
                  <RiStackLine />
                </div>
                <h3 className="font-serif text-xl font-bold text-primary">Create New Batch</h3>
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

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Batch Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cohort 2026 - System Architecture"
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "ACTIVE" | "COMPLETED")}
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
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
                  {submitting ? "Saving..." : (
                    <>
                      <RiCheckLine />
                      Save Batch
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
