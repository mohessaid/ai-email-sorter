"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Account = {
  id: string;
  email: string;
  provider?: string;
  last_sync_at?: string | null;
  status?: string;
  scopes?: string[];
  created_at?: string;
};

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;

  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadAccount();
  }, [accountId]);

  async function loadAccount() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/accounts", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to load accounts");
      }
      const accounts = await res.json();
      const acc = Array.isArray(accounts)
        ? accounts.find((a) => a.id === accountId)
        : null;

      if (!acc) {
        setError("Account not found");
      } else {
        setAccount(acc);
      }
    } catch (err) {
      console.error("Failed to load account:", err);
      setError("Failed to load account details");
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    if (!account) return;

    setSyncing(true);
    try {
      const res = await fetch(`/api/gmail/sync?accountId=${accountId}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to sync emails");
      }

      const result = await res.json();
      alert(
        `Sync completed! Imported ${result.imported || 0} new emails.`,
      );
      loadAccount(); // Reload to get updated last_sync_at
    } catch (err: any) {
      console.error("Sync failed:", err);
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (
      !confirm(
        "Are you sure you want to disconnect this account? This will not delete imported emails, but you won't be able to import new ones.",
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/accounts?id=${accountId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to disconnect account");
      }

      alert("Account disconnected successfully");
      router.push("/accounts");
    } catch (err) {
      console.error("Failed to disconnect:", err);
      alert("Failed to disconnect account. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Account Details</h1>
        </div>
        <div className="py-12 text-center text-slate-500">
          Loading account details...
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Account Details</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
          <p className="text-red-700 mb-4">{error || "Account not found"}</p>
          <Link
            href="/accounts"
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Back to Accounts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/accounts"
          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium mb-2 inline-block"
        >
          ← Back to Accounts
        </Link>
        <h1 className="text-3xl font-bold">Account Details</h1>
      </div>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-indigo-600"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                {account.email}
              </h2>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      account.status === "connected"
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`}
                  />
                  {account.status === "connected" ? "Connected" : "Disconnected"}
                </span>
                <span>•</span>
                <span>{account.provider === "google" ? "Google" : "Unknown"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 py-4 border-t">
            <div>
              <div className="text-sm text-slate-600 mb-1">Connected Since</div>
              <div className="font-medium">
                {account.created_at
                  ? new Date(account.created_at).toLocaleDateString()
                  : "Unknown"}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">Last Synced</div>
              <div className="font-medium">
                {account.last_sync_at
                  ? new Date(account.last_sync_at).toLocaleString()
                  : "Never"}
              </div>
            </div>
          </div>

          {account.scopes && account.scopes.length > 0 && (
            <div className="py-4 border-t">
              <div className="text-sm text-slate-600 mb-2">Permissions</div>
              <div className="space-y-1">
                {account.scopes.map((scope, idx) => (
                  <div key={idx} className="text-sm text-slate-700">
                    • {scope.replace("https://www.googleapis.com/auth/", "")}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <svg
            className={`w-5 h-5 ${syncing ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {syncing ? "Syncing..." : "Sync Emails Now"}
        </button>

        <button
          onClick={handleDisconnect}
          className="px-6 py-3 bg-white text-red-600 border border-red-200 rounded-md hover:bg-red-50 font-medium"
        >
          Disconnect Account
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="font-medium text-blue-900 mb-2">About Syncing</h4>
        <p className="text-sm text-blue-800 mb-2">
          When you sync this account, the app will:
        </p>
        <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 ml-2">
          <li>Fetch new emails from your Gmail inbox</li>
          <li>Use AI to classify them into your categories</li>
          <li>Generate summaries for each email</li>
          <li>Archive the emails in Gmail (they won't be deleted)</li>
        </ul>
        <p className="text-sm text-blue-800 mt-2">
          Note: Manual sync is required for now. Automatic syncing will be added
          in a future update.
        </p>
      </div>
    </div>
  );
}
