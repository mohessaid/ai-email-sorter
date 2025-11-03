"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Account = {
  id: string;
  email: string;
  provider?: string;
  last_sync_at?: string | null;
  status?: string;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccounts() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/accounts", { credentials: "include" });
        if (!res.ok) {
          throw new Error("Failed to load accounts");
        }
        const data = await res.json();
        setAccounts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load accounts:", err);
        setError("Failed to load accounts. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadAccounts();
  }, []);

  async function handleDisconnect(accountId: string) {
    if (!confirm("Are you sure you want to disconnect this account?")) {
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

      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch (err) {
      console.error("Failed to disconnect:", err);
      alert("Failed to disconnect account. Please try again.");
    }
  }

  function handleConnectAccount() {
    window.location.href = "/api/accounts/connect";
  }

  async function handleSync(accountId: string) {
    setSyncing(accountId);
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
      alert(`Sync completed! Imported ${result.imported || 0} new emails.`);
      loadAccounts(); // Reload to get updated last_sync_at
    } catch (err: any) {
      console.error("Sync failed:", err);
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(null);
    }
  }

  async function handleSyncAll() {
    if (accounts.length === 0) return;

    if (!confirm(`Sync all ${accounts.length} account(s)?`)) return;

    setSyncing("all");
    try {
      let totalImported = 0;
      let failed = 0;

      for (const account of accounts) {
        try {
          const res = await fetch(`/api/gmail/sync?accountId=${account.id}`, {
            method: "POST",
            credentials: "include",
          });

          if (res.ok) {
            const result = await res.json();
            totalImported += result.imported || 0;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      alert(
        `Sync all completed! Imported ${totalImported} emails total. ${failed > 0 ? `${failed} account(s) failed.` : ""}`,
      );
      loadAccounts();
    } catch (err: any) {
      console.error("Sync all failed:", err);
      alert(`Sync all failed: ${err.message}`);
    } finally {
      setSyncing(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Connected Accounts</h1>
          <p className="text-slate-600 mt-2">
            Manage your connected Gmail accounts
          </p>
        </div>
        <div className="py-12 text-center text-slate-500">
          Loading accounts...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Connected Accounts</h1>
          <p className="text-slate-600 mt-2">
            Manage your connected Gmail accounts
          </p>
        </div>
        <div className="flex items-center gap-3">
          {accounts.length > 0 && (
            <button
              onClick={handleSyncAll}
              disabled={syncing === "all"}
              className="px-4 py-2 bg-white border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 text-sm font-medium disabled:opacity-50"
            >
              {syncing === "all" ? "Syncing All..." : "Sync All"}
            </button>
          )}
          <button
            onClick={handleConnectAccount}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
          >
            + Connect Account
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto text-slate-300 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No accounts connected
          </h3>
          <p className="text-slate-600 mb-6">
            Connect your Gmail account to start sorting and summarizing your
            emails with AI.
          </p>
          <button
            onClick={handleConnectAccount}
            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
          >
            Connect Gmail Account
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-indigo-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {account.email}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            account.status === "connected"
                              ? "bg-green-500"
                              : "bg-gray-400"
                          }`}
                        />
                        {account.status === "connected"
                          ? "Connected"
                          : "Disconnected"}
                      </span>
                      <span>•</span>
                      <span>
                        {account.provider === "google" ? "Google" : "Unknown"}
                      </span>
                      {account.last_sync_at && (
                        <>
                          <span>•</span>
                          <span>
                            Last synced:{" "}
                            {new Date(
                              account.last_sync_at,
                            ).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSync(account.id)}
                    disabled={syncing === account.id}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 border disabled:opacity-50"
                  >
                    {syncing === account.id ? "Syncing..." : "Sync"}
                  </button>
                  <button
                    onClick={() => handleDisconnect(account.id)}
                    className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md border border-red-200"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="font-medium text-blue-900 mb-2">
          About Connected Accounts
        </h4>
        <p className="text-sm text-blue-800">
          Each connected account allows the AI Email Sorter to access your Gmail
          messages, classify them into categories, and generate summaries. You
          can connect multiple accounts and manage them independently.
        </p>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/"
          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
