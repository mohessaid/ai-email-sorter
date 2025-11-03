"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    async function checkAuth() {
      try {
        const res = await fetch("/api/debug/cookies", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(data.hasUserId);
          setUserEmail(data.userEmail);
        }
      } catch (err) {
        console.error("Failed to check auth:", err);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-indigo-600"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3 5a2 2 0 0 1 2-2h6v4H5v12h14V7h-6V3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z" />
              </svg>
              <span className="font-semibold text-lg">AI Email Sorter</span>
            </Link>
          </div>
          <div className="w-24 h-9 bg-slate-100 animate-pulse rounded-md" />
        </div>
      </header>
    );
  }

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-indigo-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M3 5a2 2 0 0 1 2-2h6v4H5v12h14V7h-6V3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z" />
            </svg>
            <span className="font-semibold text-lg">AI Email Sorter</span>
          </Link>
          <nav className="hidden md:flex gap-4 text-sm text-slate-600">
            <Link href="/" className="hover:underline hover:text-slate-900">
              Dashboard
            </Link>
            <Link
              href="/accounts"
              className="hover:underline hover:text-slate-900"
            >
              Accounts
            </Link>
            <Link
              href="/categories"
              className="hover:underline hover:text-slate-900"
            >
              Categories
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-24 h-9 bg-slate-100 animate-pulse rounded-md" />
          ) : isAuthenticated ? (
            <>
              {userEmail && (
                <span className="text-sm text-slate-600 hidden sm:inline">
                  {userEmail}
                </span>
              )}
              <a
                href="/api/accounts/connect"
                className="px-3 py-1.5 rounded-md bg-white border border-indigo-600 text-indigo-600 text-sm hover:bg-indigo-50 inline-block font-medium"
              >
                + Add Account
              </a>
            </>
          ) : (
            <a
              href="/api/auth/google"
              className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 inline-block font-medium"
            >
              Sign in with Google
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
