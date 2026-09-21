"use client";

import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function DashboardLayout({ children }) {
  const { user, loading, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090d]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-400/20 border-t-blue-400"></div>
          <p className="text-sm text-white/40">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "⌂" },
    { href: "/dashboard/materials", label: "Materials", icon: "📁" },
    { href: "/dashboard/study", label: "Study Space", icon: "📚" },
    { href: "/dashboard/analytics", label: "Analytics", icon: "📊" },
  ];

  return (
    <div className="flex min-h-screen bg-[#07090d]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-white/[0.06] bg-[#090b10]">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-20 items-center px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white">
                <img src="/logo.png" alt="GetEasy" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-base font-semibold text-white">GetEasy</p>
                <p className="text-xs text-white/35">Learning Platform</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    isActive
                      ? "bg-white/[0.06] text-white"
                      : "text-white/40 hover:bg-white/[0.035] hover:text-white"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="border-t border-white/[0.06] p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-400/10 text-sm font-semibold text-blue-300">
                {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-white">{user?.full_name || "User"}</p>
                <p className="truncate text-xs text-white/40">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-white/60 transition hover:bg-white/[0.04] hover:text-white"
            >
              <span>→</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1">{children}</main>
    </div>
  );
}
