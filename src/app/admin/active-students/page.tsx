"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  RiUserStarLine,
  RiTimeLine,
  RiMailLine,
  RiPhoneLine,
  RiArrowRightLine,
  RiFileListLine,
} from "react-icons/ri";

interface ActiveStudentItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  batch: { id: string; name: string };
  currentModule: { id: string; name: string; orderIndex: number };
  openTaskCount: number;
  earliestDueAt: string | null;
  openTasks: Array<{
    id: string;
    taskId: string;
    title: string;
    dueAt: string;
  }>;
}

export default function ActiveStudentsPage() {
  const [students, setStudents] = useState<ActiveStudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/active-students");
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load active candidates.");
        return;
      }
      setStudents(data.students);
    } catch {
      setError("Network error loading active candidates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveStudents();
  }, [fetchActiveStudents]);

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-ace badge-info text-xs">PIPELINE MONITORING</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-primary mt-1">
            Active Candidates Holding Tasks
          </h1>
          <p className="text-secondary text-sm mt-1">
            Candidates currently actively working on open, unsubmitted engineering milestones.
          </p>
        </div>

        <div className="font-serif text-2xl font-bold text-primary bg-white px-5 py-2.5 rounded-lg border border-outline-variant shadow-sm flex items-center gap-3">
          <RiUserStarLine className="text-accent text-xl" />
          <span>{students.length} Candidates</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="p-16 text-center text-muted text-sm">Loading active candidates...</div>
      ) : students.length === 0 ? (
        <div className="card-ace p-12 text-center text-muted text-sm">
          No candidates currently hold unsubmitted open tasks. All students are up to date!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {students.map((s) => (
            <div
              key={s.id}
              className="card-ace p-6 flex flex-col justify-between hover:border-outline-strong transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{
                        background: `hsl(${s.name.charCodeAt(0) * 11}, 35%, 40%)`,
                      }}
                    >
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary text-base">{s.name}</h3>
                      <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <RiMailLine /> {s.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <RiPhoneLine /> {s.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="badge-ace badge-pending text-xs whitespace-nowrap">
                    {s.openTaskCount} Open {s.openTaskCount === 1 ? "Task" : "Tasks"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-secondary mb-4">
                  <span className="font-medium text-primary">{s.batch.name}</span>
                  <span>·</span>
                  <span className="badge-ace badge-info text-[10px] py-0.5">
                    W{s.currentModule.orderIndex}: {s.currentModule.name}
                  </span>
                </div>

                {/* Open Tasks List */}
                <div className="bg-surface p-3.5 rounded-lg border border-outline-variant space-y-2 mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted block flex items-center gap-1">
                    <RiFileListLine /> In-Progress Tasks
                  </span>
                  {s.openTasks.map((ot) => (
                    <div
                      key={ot.id}
                      className="flex items-center justify-between text-xs gap-2 pt-1 border-t border-outline-variant/60 first:border-0 first:pt-0"
                    >
                      <span className="text-primary font-medium truncate">{ot.title}</span>
                      <span className="text-muted shrink-0 text-[11px] flex items-center gap-1">
                        <RiTimeLine className="text-xs text-amber-600" />
                        Due {new Date(ot.dueAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-outline-variant flex items-center justify-between">
                <span className="text-xs text-muted">
                  Earliest Due:{" "}
                  <strong>
                    {s.earliestDueAt ? new Date(s.earliestDueAt).toLocaleDateString() : "N/A"}
                  </strong>
                </span>

                <Link
                  href={`/admin/students/${s.id}`}
                  className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1 hover:border-primary"
                >
                  <span>Student Profile</span>
                  <RiArrowRightLine />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
