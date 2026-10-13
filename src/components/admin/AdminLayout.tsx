"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  RiDashboardLine,
  RiStackLine,
  RiBookOpenLine,
  RiGroupLine,
  RiArticleLine,
  RiShieldUserLine,
  RiLogoutBoxRLine,
  RiUserStarLine,
  RiMenuLine,
  RiCloseLine,
} from "react-icons/ri";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.userType === "ADMIN") {
          setUser(data.user);
        }
      } catch (err) {
        console.error("Failed to load admin user:", err);
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const navItems = [
    { label: "Overview", href: "/admin/dashboard", icon: RiDashboardLine },
    { label: "Batches", href: "/admin/batches", icon: RiStackLine },
    { label: "Modules & Tasks", href: "/admin/modules", icon: RiBookOpenLine },
    { label: "Students", href: "/admin/students", icon: RiGroupLine },
    { label: "Active Students", href: "/admin/active-students", icon: RiUserStarLine },
    { label: "Submitted Reports", href: "/admin/reports", icon: RiArticleLine },
  ];

  if (user?.role === "SUPER_ADMIN") {
    navItems.push({ label: "Team & Admins", href: "/admin/team", icon: RiShieldUserLine });
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-outline-variant px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="font-serif text-lg font-bold text-primary">
          ACE <span className="text-accent">FORGE</span>
          <span className="ml-2 text-xs font-sans font-semibold text-muted">ADMIN</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-primary text-xl p-1"
        >
          {mobileMenuOpen ? <RiCloseLine /> : <RiMenuLine />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-outline-variant flex flex-col justify-between transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Logo & Header */}
          <div className="p-6 border-b border-outline-variant">
            <Link href="/admin/dashboard" className="block">
              <span className="font-serif text-2xl font-bold tracking-tight text-primary">
                ACE <span className="text-accent">FORGE</span>
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="badge-ace badge-info text-[10px] py-0.5 px-2">ADMIN PORTAL</span>
                {user?.role === "SUPER_ADMIN" && (
                  <span className="badge-ace badge-pending text-[10px] py-0.5 px-2">SUPER ADMIN</span>
                )}
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted px-3 py-2">
              Management
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-secondary hover:bg-primary-soft hover:text-primary"
                  }`}
                >
                  <Icon className={`text-lg ${isActive ? "text-accent" : "text-muted"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer Profile & Logout */}
        <div className="p-4 border-t border-outline-variant bg-surface/50">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="text-sm font-semibold text-primary truncate">
                {user?.name || "Administrator"}
              </div>
              <div className="text-xs text-muted truncate">{user?.email || ""}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-muted hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              <RiLogoutBoxRLine className="text-lg" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
