"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  RiGroupLine,
  RiUserStarLine,
  RiFileListLine,
  RiArticleLine,
  RiTimeLine,
  RiAlertLine,
  RiArrowRightLine,
  RiUserAddLine,
  RiStackLine,
  RiCheckLine,
} from "react-icons/ri";

interface DashboardStats {
  counts: {
    totalStudents: number;
    activeStudents: number;
    openTasks: number;
    submittedReports: number;
    pendingReviews: number;
    overdueTasks: number;
  };
  moduleBreakdown: Array<{
    name: string;
    fullName: string;
    studentCount: number;
  }>;
  recentActivity: Array<{
    id: string;
    title: string;
    description: string;
    timestamp: string;
    type: "SUBMISSION" | "EVALUATION" | "ENROLLMENT";
    status: "success" | "info" | "pending";
  }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/dashboard/stats");
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || "Failed to load dashboard metrics.");
          return;
        }
        setStats(data);
      } catch {
        setError("Network communication error.");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-primary">Admin Overview</h1>
          <p className="text-secondary text-sm mt-1">
            Real-time cohort execution metrics, task assignments, and evaluation pipeline status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/students"
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RiUserAddLine />
            Enroll Student
          </Link>
          <Link
            href="/admin/reports"
            className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
          >
            <RiArticleLine />
            Pending Reviews
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {loading || !stats ? (
        <div className="p-16 text-center text-muted text-sm">Loading admin analytics...</div>
      ) : (
        <>
          {/* Top Stat Cards (4-column responsive grid matching ace-web design system) */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {/* Total Students */}
            <div className="card-ace p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted text-xs mb-2">
                <span>Total Students</span>
                <RiGroupLine />
              </div>
              <div className="font-serif text-3xl font-bold text-primary">
                {stats.counts.totalStudents}
              </div>
              <Link
                href="/admin/students"
                className="text-[11px] text-accent font-semibold mt-2 hover:underline inline-flex items-center gap-1"
              >
                Directory →
              </Link>
            </div>

            {/* Active Students Holding Tasks */}
            <div className="card-ace p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted text-xs mb-2">
                <span>Active Candidates</span>
                <RiUserStarLine className="text-accent" />
              </div>
              <div className="font-serif text-3xl font-bold text-primary">
                {stats.counts.activeStudents}
              </div>
              <Link
                href="/admin/active-students"
                className="text-[11px] text-accent font-semibold mt-2 hover:underline inline-flex items-center gap-1"
              >
                Holding Tasks →
              </Link>
            </div>

            {/* Open Curriculum Tasks */}
            <div className="card-ace p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted text-xs mb-2">
                <span>Active Tasks</span>
                <RiFileListLine />
              </div>
              <div className="font-serif text-3xl font-bold text-primary">
                {stats.counts.openTasks}
              </div>
              <Link
                href="/admin/modules"
                className="text-[11px] text-muted font-medium mt-2 hover:underline inline-flex items-center gap-1"
              >
                Curriculum →
              </Link>
            </div>

            {/* Submitted Reports */}
            <div className="card-ace p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted text-xs mb-2">
                <span>Submissions</span>
                <RiArticleLine className="text-blue-600" />
              </div>
              <div className="font-serif text-3xl font-bold text-primary">
                {stats.counts.submittedReports}
              </div>
              <Link
                href="/admin/reports"
                className="text-[11px] text-muted font-medium mt-2 hover:underline inline-flex items-center gap-1"
              >
                Submissions →
              </Link>
            </div>

            {/* Pending Reviews */}
            <div className="card-ace p-5 flex flex-col justify-between bg-amber-50/40 border-amber-200/60">
              <div className="flex items-center justify-between text-amber-800 text-xs mb-2">
                <span>Pending Reviews</span>
                <RiTimeLine className="text-amber-600" />
              </div>
              <div className="font-serif text-3xl font-bold text-amber-800">
                {stats.counts.pendingReviews}
              </div>
              <Link
                href="/admin/reports"
                className="text-[11px] text-amber-800 font-semibold mt-2 hover:underline inline-flex items-center gap-1"
              >
                Grade Now →
              </Link>
            </div>

            {/* Overdue Tasks */}
            <div className="card-ace p-5 flex flex-col justify-between bg-red-50/40 border-red-200/60">
              <div className="flex items-center justify-between text-red-800 text-xs mb-2">
                <span>Overdue Tasks</span>
                <RiAlertLine className="text-red-600" />
              </div>
              <div className="font-serif text-3xl font-bold text-red-800">
                {stats.counts.overdueTasks}
              </div>
              <Link
                href="/admin/active-students"
                className="text-[11px] text-red-700 font-semibold mt-2 hover:underline inline-flex items-center gap-1"
              >
                Inspect →
              </Link>
            </div>
          </div>

          {/* Grid: Recent Activity & Module Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Activity Feed (2 Cols) */}
            <div className="lg:col-span-2 card-ace p-6">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant mb-4">
                <h2 className="font-serif text-xl font-bold text-primary">Recent Cohort Activity</h2>
                <span className="text-xs text-muted">Real-Time Event Feed</span>
              </div>

              {stats.recentActivity.length === 0 ? (
                <div className="p-8 text-center text-muted text-xs">No recent activity logged.</div>
              ) : (
                <div className="divide-y divide-outline-variant">
                  {stats.recentActivity.map((item) => (
                    <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{
                            background: `hsl(${item.title.charCodeAt(0) * 11}, 35%, 40%)`,
                          }}
                        >
                          {item.title.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-primary truncate">
                            {item.title}
                          </div>
                          <div className="text-xs text-secondary truncate">{item.description}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.status === "success"
                              ? "bg-green-600"
                              : item.status === "info"
                              ? "bg-blue-600"
                              : "bg-amber-600"
                          }`}
                        />
                        <span className="text-[11px] text-muted">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Module Distribution & Fast Navigation */}
            <div className="space-y-6">
              {/* Module Distribution */}
              <div className="card-ace p-6">
                <h3 className="font-serif text-base font-bold text-primary mb-4">
                  Candidates by Curriculum Week
                </h3>

                <div className="space-y-3">
                  {stats.moduleBreakdown.map((m) => {
                    const pct =
                      stats.counts.totalStudents > 0
                        ? Math.round((m.studentCount / stats.counts.totalStudents) * 100)
                        : 0;
                    return (
                      <div key={m.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-primary">{m.name}</span>
                          <span className="text-muted">
                            {m.studentCount} students ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Navigation Card */}
              <div className="card-ace p-6 bg-primary text-white">
                <span className="text-xs font-semibold uppercase tracking-wider text-accent block mb-1">
                  Faculty Workspace
                </span>
                <h4 className="font-serif text-lg font-bold mb-2">Weekly Review Workflow</h4>
                <p className="text-xs text-white/80 leading-relaxed mb-4">
                  Inspect GitHub repositories with automated AST verification, calibrate scores with AI assistance, and provide student feedback.
                </p>
                <Link
                  href="/admin/reports"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary rounded text-xs font-bold hover:bg-accent hover:text-black transition-colors"
                >
                  <span>Review Submissions</span>
                  <RiArrowRightLine />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
