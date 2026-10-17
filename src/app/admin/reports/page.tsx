"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  RiArticleLine,
  RiSearchLine,
  RiCheckDoubleLine,
  RiTimeLine,
  RiShieldCheckLine,
  RiRobotLine,
  RiArrowRightLine,
  RiGithubLine,
} from "react-icons/ri";

interface ReportListItem {
  id: string;
  studentTaskId: string;
  title: string;
  githubRepoUrl: string;
  status: "SUBMITTED" | "AI_REVIEWED" | "FINALIZED";
  finalMarks: number | null;
  submittedAt: string;
  student: {
    id: string;
    name: string;
    email: string;
    batch: { id: string; name: string };
  };
  task: {
    id: string;
    title: string;
    module: { id: string; name: string; orderIndex: number };
  };
  aiMarks: number | null;
  employeeMarks: number | null;
  reviewerAdmin?: { id: string; name: string } | null;
}

interface BatchOption {
  id: string;
  name: string;
}

function ReportsContent() {
  const searchParams = useSearchParams();
  const initialStudentTaskId = searchParams.get("studentTaskId") || "";

  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (initialStudentTaskId) params.set("studentTaskId", initialStudentTaskId);
      if (batchFilter) params.set("batchId", batchFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load reports.");
        return;
      }
      setReports(data.reports);
    } catch {
      setError("An unexpected network error occurred while loading reports.");
    } finally {
      setLoading(false);
    }
  }, [initialStudentTaskId, batchFilter, statusFilter]);

  useEffect(() => {
    fetchReports();
    async function loadBatches() {
      try {
        const res = await fetch("/api/admin/batches");
        const data = await res.json();
        if (data.success) setBatches(data.batches);
      } catch (err) {
        console.error("Batch load error:", err);
      }
    }
    loadBatches();
  }, [fetchReports]);

  const filteredReports = reports.filter((r) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      r.student.name.toLowerCase().includes(term) ||
      r.student.email.toLowerCase().includes(term) ||
      r.task.title.toLowerCase().includes(term) ||
      r.title.toLowerCase().includes(term)
    );
  });

  const totalReports = reports.length;
  const pendingReviewCount = reports.filter((r) => r.status !== "FINALIZED").length;
  const finalizedCount = reports.filter((r) => r.status === "FINALIZED").length;
  const aiReviewedCount = reports.filter((r) => r.status === "AI_REVIEWED").length;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-primary">Report Submissions & Review</h1>
          <p className="text-secondary text-sm mt-1">
            Review student milestone writeups, inspect automated AI code evaluation, and calibrate final grades.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="card-ace p-5">
          <div className="flex items-center justify-between text-muted text-xs mb-2">
            <span>Total Submissions</span>
            <RiArticleLine />
          </div>
          <div className="font-serif text-3xl font-bold text-primary">{totalReports}</div>
        </div>

        <div className="card-ace p-5">
          <div className="flex items-center justify-between text-muted text-xs mb-2">
            <span>Pending Review</span>
            <RiTimeLine className="text-amber-600" />
          </div>
          <div className="font-serif text-3xl font-bold text-amber-700">{pendingReviewCount}</div>
        </div>

        <div className="card-ace p-5">
          <div className="flex items-center justify-between text-muted text-xs mb-2">
            <span>AI Evaluated</span>
            <RiRobotLine className="text-blue-600" />
          </div>
          <div className="font-serif text-3xl font-bold text-blue-700">{aiReviewedCount}</div>
        </div>

        <div className="card-ace p-5">
          <div className="flex items-center justify-between text-muted text-xs mb-2">
            <span>Finalized & Graded</span>
            <RiCheckDoubleLine className="text-green-600" />
          </div>
          <div className="font-serif text-3xl font-bold text-green-700">{finalizedCount}</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="card-ace p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, task, or report title..."
            className="w-full pl-9 pr-3 py-2 border border-outline-variant rounded-md text-xs text-primary focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="w-full px-3 py-2 border border-outline-variant rounded-md text-xs text-primary focus:outline-none focus:border-primary bg-white"
          >
            <option value="">All Cohort Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-outline-variant rounded-md text-xs text-primary focus:outline-none focus:border-primary bg-white"
          >
            <option value="">All Review Statuses</option>
            <option value="SUBMITTED">SUBMITTED (Pending Review)</option>
            <option value="AI_REVIEWED">AI_REVIEWED (Ready for Grade)</option>
            <option value="FINALIZED">FINALIZED (Graded)</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="card-ace overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <div className="font-semibold text-primary text-sm">
            Submitted Reports ({filteredReports.length})
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted text-sm">Loading report submissions...</div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">No report submissions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-outline-variant text-xs uppercase font-bold text-muted">
                <tr>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Task & Module</th>
                  <th className="px-6 py-3">Submitted</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">AI Evaluation</th>
                  <th className="px-6 py-3">Final Marks</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredReports.map((r) => (
                  <tr key={r.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-primary">{r.student.name}</div>
                      <div className="text-xs text-muted">{r.student.email}</div>
                      <span className="text-[11px] text-secondary font-medium">
                        {r.student.batch.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-primary text-xs">{r.task.title}</div>
                      <div className="text-xs text-muted">
                        Week {r.task.module.orderIndex}: {r.task.module.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted">
                      {new Date(r.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {r.status === "SUBMITTED" && (
                        <span className="badge-ace badge-pending text-xs">SUBMITTED</span>
                      )}
                      {r.status === "AI_REVIEWED" && (
                        <span className="badge-ace badge-info text-xs">AI REVIEWED</span>
                      )}
                      {r.status === "FINALIZED" && (
                        <span className="badge-ace badge-success text-xs">FINALIZED</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {r.aiMarks !== null ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                          <RiRobotLine className="text-blue-600" />
                          {r.aiMarks} / 100
                        </div>
                      ) : (
                        <span className="text-xs text-muted italic">Processing...</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {r.finalMarks !== null ? (
                        <div className="font-serif text-lg font-bold text-primary">
                          {r.finalMarks} / 100
                        </div>
                      ) : (
                        <span className="text-xs text-muted italic">Pending Final Grade</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <a
                          href={r.githubRepoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted hover:text-primary p-1"
                          title="View GitHub Repository"
                        >
                          <RiGithubLine className="text-base" />
                        </a>
                        <Link
                          href={`/admin/reports/${r.id}`}
                          className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1 shadow-sm"
                        >
                          <span>Review & Grade</span>
                          <RiArrowRightLine />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default function ReportsPage() {
  return (
    <AdminLayout>
      <Suspense fallback={<div className="p-12 text-center text-muted text-sm">Loading reports...</div>}>
        <ReportsContent />
      </Suspense>
    </AdminLayout>
  );
}
