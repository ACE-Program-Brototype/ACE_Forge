"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RiGraduationCapLine, RiLogoutBoxRLine } from "react-icons/ri";

interface StudentHeaderProps {
  studentName?: string;
  batchName?: string;
}

export default function StudentHeader({ studentName, batchName }: StudentHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/student/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-outline-variant">
      <div className="max-w-container-max mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="font-serif text-2xl font-bold tracking-tight text-primary">
            ACE <span className="text-accent">FORGE</span>
          </span>
          <span className="badge-ace badge-info text-[10px] py-0.5">STUDENT PORTAL</span>
        </Link>

        <div className="flex items-center gap-4">
          {studentName && (
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-primary">{studentName}</span>
              {batchName && <span className="text-[11px] text-muted">{batchName}</span>}
            </div>
          )}

          <button
            onClick={handleLogout}
            title="Log Out"
            className="flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"
          >
            <RiLogoutBoxRLine className="text-base" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
