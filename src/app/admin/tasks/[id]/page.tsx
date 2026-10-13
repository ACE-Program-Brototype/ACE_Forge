"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  RiArrowLeftLine,
  RiFileListLine,
  RiExternalLinkLine,
  RiGroupLine,
  RiTimeLine,
  RiCheckDoubleLine,
  RiAlertLine,
  RiGithubLine,
  RiEyeLine,
} from "react-icons/ri";

interface StudentReport {
  id: string;
  title: string;
  status: "SUBMITTED" | "AI_REVIEWED" | "FINALIZED";
  finalMarks: number | null;
  submittedAt: string;
  githubRepoUrl: string;
}

interface StudentTaskRow {
  id: string;
  studentId: string;
  assignedAt: string;
  dueAt: string;
  status: "ASSIGNED" | "SUBMITTED" | "REVIEWED" | "OVERDUE";
  student: {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: "ACTIVE" | "INACTIVE";
    batch: { id: string; name: string };
  };
  report?: StudentReport | null;
}

interface TaskDetail {
  id: string;
  title: string;
  description: string;
  referenceLink?: string | null;
  isActive: boolean;
  module: {
    id: string;
    name: string;
    orderIndex: number;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  studentTasks: StudentTaskRow[];
}

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchTask = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/tasks/${resolvedParams.id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load task details.");
        return;
      }
      setTask(data.task);
    } catch {
      setError("An unexpected network error occurred while loading task details.");
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-12 text-center text-muted text-sm">Loading task submission status...</div>
      </AdminLayout>
    );
  }

  if (error || !task) {
    return (
      <AdminLayout>
        <div className="card-ace p-8 text-center">
          <p className="text-red-700 text-sm mb-4">{error || "Task not found."}</p>
          <Link href="/admin/modules" className="btn-secondary text-xs inline-flex items-center gap-1.5">
            <RiArrowLeftLine />
            Back to Modules
          </Link>
        </div>
      </AdminLayout>
    );
  }

  // Statistics calculation
  const totalStudents = task.studentTasks.length;
  const submittedCount = task.studentTasks.filter(
    (st) => st.status === "SUBMITTED" || st.status === "REVIEWED"
  ).length;
  const pendingCount = task.studentTasks.filter((st) => st.status === "ASSIGNED").length;
  const overdueCount = task.studentTasks.filter((st) => st.status === "OVERDUE").length;

  const filteredTasks = task.studentTasks.filter((st) => {
    if (statusFilter === "ALL") return true;
    return st.status === statusFilter;
  });

  return (
    <AdminLayout>
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/admin/modules"
          className="inline-flex items-center gap-2 text-xs font-semibold text-secondary hover:text-primary transition-colors"
        >
          <RiArrowLeftLine />
          Back to Modules & Tasks
        </Link>
      </div>

      {/* Task Overview Card */}
      <div className="card-ace p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center text-xl">
              <RiFileListLine />
            </div>
            <div>
              <span className="badge-ace badge-info text-xs">
                WEEK {task.module.orderIndex} · {task.module.name}
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-primary mt-1">
                {task.title}
              </h1>
            </div>
          </div>

          <span
            className={`badge-ace text-xs ${
              task.isActive ? "badge-success" : "badge-error"
            }`}
          >
            {task.isActive ? "ACTIVE TASK" : "ARCHIVED"}
          </span>
        </div>

        <p className="text-secondary text-sm leading-relaxed max-w-4xl mb-6">
          {task.description}
        </p>

        {task.referenceLink && (
          <div className="pt-4 border-t border-outline-variant flex items-center gap-2 text-xs">
            <span className="text-muted font-medium">Reference Documentation:</span>
            <a
              href={task.referenceLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-accent font-semibold hover:underline"
            >
              <RiExternalLinkLine />
              {task.referenceLink}
            </a>
          </div>
        )}
      </div>

      {/* Submission Status Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="card-ace p-5">
          <div className="flex items-center justify-between text-muted text-xs mb-2">
            <span>Enrolled Students</span>
            <RiGroupLine />
          </div>
          <div className="font-serif text-3xl font-bold text-primary">{totalStudents}</div>
        </div>

        <div className="card-ace p-5">
          <div className="flex items-center justify-between text-muted text-xs mb-2">
            <span>Submissions</span>
            <RiCheckDoubleLine className="text-green-600" />
          </div>
          <div className="font-serif text-3xl font-bold text-green-700">{submittedCount}</div>
        </div>

        <div className="card-ace p-5">
          <div className="flex items-center justify-between text-muted text-xs mb-2">
            <span>In Progress</span>
            <RiTimeLine className="text-amber-600" />
          </div>
          <div className="font-serif text-3xl font-bold text-amber-700">{pendingCount}</div>
        </div>

        <div className="card-ace p-5">
          <div className="flex items-center justify-between text-muted text-xs mb-2">
            <span>Overdue</span>
            <RiAlertLine className="text-red-600" />
          </div>
          <div className="font-serif text-3xl font-bold text-red-700">{overdueCount}</div>
        </div>
      </div>

      {/* Assigned Students Table */}
      <div className="card-ace overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="font-semibold text-primary text-sm">
            Student Task Tracking & Submissions ({filteredTasks.length})
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-medium">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-outline-variant rounded bg-white text-primary focus:outline-none"
            >
              <option value="ALL">All Statuses ({totalStudents})</option>
              <option value="ASSIGNED">In Progress (ASSIGNED)</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="REVIEWED">Reviewed & Graded</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">
            No students found matching this status filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-outline-variant text-xs uppercase font-bold text-muted">
                <tr>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Cohort Batch</th>
                  <th className="px-6 py-3">Assigned Date</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Report Submission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredTasks.map((st) => (
                  <tr key={st.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-primary">{st.student.name}</div>
                      <div className="text-xs text-muted">{st.student.email}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-secondary font-medium">
                      {st.student.batch.name}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted">
                      {new Date(st.assignedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-secondary font-medium">
                      {new Date(st.dueAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {st.status === "ASSIGNED" && (
                        <span className="badge-ace badge-pending text-xs">IN PROGRESS</span>
                      )}
                      {st.status === "SUBMITTED" && (
                        <span className="badge-ace badge-info text-xs">SUBMITTED</span>
                      )}
                      {st.status === "REVIEWED" && (
                        <span className="badge-ace badge-success text-xs">GRADED</span>
                      )}
                      {st.status === "OVERDUE" && (
                        <span className="badge-ace badge-error text-xs">OVERDUE</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {st.report ? (
                        <div className="inline-flex items-center gap-3">
                          {st.report.finalMarks !== null && (
                            <span className="text-xs font-bold text-primary">
                              Score: {st.report.finalMarks}/100
                            </span>
                          )}
                          <a
                            href={st.report.githubRepoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted hover:text-primary text-base"
                            title="Open GitHub Repository"
                          >
                            <RiGithubLine />
                          </a>
                          <Link
                            href={`/admin/reports?studentTaskId=${st.id}`}
                            className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1"
                          >
                            <RiEyeLine />
                            Review
                          </Link>
                        </div>
                      ) : (
                        <span className="text-xs text-muted italic">Pending Submission</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
