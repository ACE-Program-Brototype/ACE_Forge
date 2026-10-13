"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StudentHeader from "@/components/student/StudentHeader";
import TaskCountdown from "@/components/student/TaskCountdown";
import {
  RiBookOpenLine,
  RiFileListLine,
  RiExternalLinkLine,
  RiArrowRightLine,
  RiCheckDoubleLine,
  RiShieldCheckLine,
} from "react-icons/ri";

interface StudentDashboardData {
  student: {
    id: string;
    name: string;
    email: string;
    phone: string;
    batch: { id: string; name: string };
    currentModule: {
      id: string;
      name: string;
      orderIndex: number;
      description: string;
    };
  };
  tasks: Array<{
    id: string; // studentTaskId
    taskId: string;
    title: string;
    description: string;
    referenceLink?: string | null;
    moduleId: string;
    assignedAt: string;
    dueAt: string;
    status: "ASSIGNED" | "SUBMITTED" | "REVIEWED" | "OVERDUE";
    hasReport: boolean;
    report?: {
      id: string;
      title: string;
      githubRepoUrl: string;
      submittedAt: string;
      status: string;
    } | null;
  }>;
}

export default function StudentDashboardPage() {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const res = await fetch("/api/student/dashboard");
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || "Failed to load dashboard.");
          return;
        }
        setData(json);
      } catch {
        setError("Network connection error. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between">
      <StudentHeader
        studentName={data?.student.name}
        batchName={data?.student.batch.name}
      />

      <main className="max-w-container-max mx-auto px-6 py-10 flex-1 w-full">
        {loading ? (
          <div className="p-16 text-center text-muted text-sm">
            Loading your cohort module and engineering tasks...
          </div>
        ) : error || !data ? (
          <div className="card-ace p-8 text-center text-red-700 text-sm max-w-lg mx-auto">
            {error || "Unable to load dashboard data."}
          </div>
        ) : (
          <>
            {/* Current Module Banner */}
            <div className="card-ace p-6 sm:p-8 mb-10 bg-gradient-to-r from-white to-primary-soft/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge-ace badge-info text-xs">
                  CURRENT ENROLLMENT · WEEK {data.student.currentModule.orderIndex}
                </span>
                <span className="text-xs text-muted">
                  Batch: {data.student.batch.name}
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-primary mb-3">
                {data.student.currentModule.name}
              </h1>

              <p className="text-secondary text-sm sm:text-base leading-relaxed max-w-3xl">
                {data.student.currentModule.description}
              </p>
            </div>

            {/* Weekly Tasks Section */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-primary">
                  Weekly Engineering Tasks
                </h2>
                <p className="text-secondary text-xs sm:text-sm mt-0.5">
                  Complete each task and submit a verified GitHub repository report before the deadline.
                </p>
              </div>

              <div className="text-xs text-muted font-medium hidden sm:block">
                {data.tasks.filter((t) => t.status === "SUBMITTED" || t.status === "REVIEWED").length} of{" "}
                {data.tasks.length} Completed
              </div>
            </div>

            {data.tasks.length === 0 ? (
              <div className="card-ace p-12 text-center text-muted text-sm">
                No active tasks are assigned to this module yet. Please check back soon or consult your faculty mentor.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="card-ace p-6 flex flex-col justify-between hover:border-outline-strong transition-all"
                  >
                    <div>
                      {/* Status and Countdown Header */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        {task.status === "ASSIGNED" && (
                          <span className="badge-ace badge-pending text-xs">IN PROGRESS</span>
                        )}
                        {task.status === "SUBMITTED" && (
                          <span className="badge-ace badge-info text-xs flex items-center gap-1">
                            <RiCheckDoubleLine /> SUBMITTED
                          </span>
                        )}
                        {task.status === "REVIEWED" && (
                          <span className="badge-ace badge-success text-xs flex items-center gap-1">
                            <RiShieldCheckLine /> REVIEWED
                          </span>
                        )}
                        {task.status === "OVERDUE" && (
                          <span className="badge-ace badge-error text-xs">OVERDUE</span>
                        )}

                        <TaskCountdown dueAt={task.dueAt} status={task.status} />
                      </div>

                      <h3 className="font-serif text-xl font-bold text-primary mb-2">
                        {task.title}
                      </h3>

                      <p className="text-secondary text-xs sm:text-sm leading-relaxed mb-4 line-clamp-3">
                        {task.description}
                      </p>

                      {task.referenceLink && (
                        <div className="mb-4">
                          <a
                            href={task.referenceLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-accent font-semibold hover:underline"
                          >
                            <RiExternalLinkLine />
                            Task Documentation & Spec
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-outline-variant flex items-center justify-between">
                      <span className="text-[11px] text-muted">
                        Assigned: {new Date(task.assignedAt).toLocaleDateString()}
                      </span>

                      <Link
                        href={`/tasks/${task.taskId}`}
                        className={`text-xs py-2 px-4 rounded font-semibold inline-flex items-center gap-1.5 transition-all ${
                          task.hasReport
                            ? "btn-secondary"
                            : "btn-primary shadow-sm"
                        }`}
                      >
                        <span>
                          {task.hasReport ? "View Submitted Report" : "Submit Weekly Report"}
                        </span>
                        <RiArrowRightLine />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-outline-variant bg-white py-6 text-center text-xs text-muted">
        ACE Forge Student Workspace · Advanced Computing Engineers
      </footer>
    </div>
  );
}
