"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Plus, Trash2, AlertCircle } from "lucide-react";

type Account = {
  id: string;
  email: string;
  provider?: string;
  last_sync_at?: string | null;
};

type Category = {
  id: string;
  name: string;
  description: string;
  count?: number;
};

function DashboardContent() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<{
    accountId: string;
    message: string;
  } | null>(null);
  const { toast } = useToast();

  const searchParams = useSearchParams();
  const authSuccess = searchParams.get("auth") === "success";
  const connectedEmail = searchParams.get("email");

  useEffect(() => {
    // Load accounts and categories. Backend API routes are expected at:
    // GET /api/accounts
    // GET /api/categories
    // These are called as JSON; if they aren't implemented yet the UI will show empty lists and helpful messaging.
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [aRes, cRes] = await Promise.all([
          fetch("/api/accounts", { credentials: "include" }).then((r) =>
            r.ok ? r.json() : [],
          ),
          fetch("/api/categories", { credentials: "include" }).then((r) =>
            r.ok ? r.json() : [],
          ),
        ]);

        // Defensive typing: backend might return { data: [...] } or raw array
        setAccounts(Array.isArray(aRes) ? aRes : (aRes?.data ?? []));
        setCategories(Array.isArray(cRes) ? cRes : (cRes?.data ?? []));
      } catch (err) {
        console.error("Failed loading dashboard data", err);
        setError(
          "Failed to load data. Ensure the backend API routes are running.",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authSuccess]);

  async function handleConnectAccount() {
    // This will start the OAuth flow on the server side.
    // The API route should redirect to Google / Supabase etc.
    // Here we open the connect endpoint in a new tab so devs can inspect the flow.
    window.open("/api/accounts/connect", "_blank");
  }

  async function handleAddCategory(e?: React.FormEvent) {
    e?.preventDefault();
    if (!newName.trim()) {
      setError("Category name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim(),
        }),
      });

      if (!res.ok) {
        const payload = await res.text();
        throw new Error(payload || "Failed to create category");
      }

      const created = await res.json();
      // Append to list (API may return created entity)
      setCategories((prev) => [created, ...prev]);
      setNewName("");
      setNewDescription("");
      setAdding(false);
      toast({
        title: "Category created",
        description: `${created.name} has been added successfully.`,
      });
    } catch (err: any) {
      console.error("Create category failed", err);
      setError(err?.message ?? "Failed to create category");
    } finally {
      setSaving(false);
    }
  }

  async function refreshCategories() {
    try {
      const res = await fetch("/api/categories", { credentials: "include" });
      const data = res.ok ? await res.json() : [];
      setCategories(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (err) {
      console.error("refresh failed", err);
    }
  }

  async function handleDeleteCategory(id: string) {
    setDeleteConfirm(id);
  }

  async function confirmDeleteCategory() {
    if (!deleteConfirm) return;

    try {
      const res = await fetch(
        `/api/categories/${encodeURIComponent(deleteConfirm)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Delete failed");
      setCategories((prev) => prev.filter((c) => c.id !== deleteConfirm));
      toast({
        title: "Category deleted",
        description: "The category has been removed successfully.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirm(null);
    }
  }

  async function handleSyncAccount(accountId: string) {
    setSyncing(accountId);
    setSyncError(null);
    try {
      const res = await fetch(`/api/gmail/sync?accountId=${accountId}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        const errorMessage = data.error || "Failed to sync emails";

        // Check if token expired
        if (
          errorMessage.includes("expired") ||
          errorMessage.includes("token")
        ) {
          setSyncError({
            accountId,
            message: errorMessage,
          });
          throw new Error(errorMessage);
        }

        throw new Error(errorMessage);
      }

      const result = await res.json();
      toast({
        title: "Sync completed",
        description: `Imported ${result.imported || 0} new emails.`,
      });

      // Reload accounts to get updated last_sync_at
      const aRes = await fetch("/api/accounts", { credentials: "include" });
      if (aRes.ok) {
        const data = await aRes.json();
        setAccounts(Array.isArray(data) ? data : (data?.data ?? []));
      }

      // Reload categories to get updated counts
      refreshCategories();
    } catch (err: any) {
      console.error("Sync failed:", err);

      if (!syncError) {
        toast({
          title: "Sync failed",
          description: err.message,
          variant: "destructive",
        });
      }
    } finally {
      setSyncing(null);
    }
  }

  async function handleReconnectAccount(accountId: string) {
    // Redirect to reconnect flow
    window.location.href = `/api/accounts/connect?reconnect=${accountId}`;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Success message after OAuth */}
      {authSuccess && connectedEmail && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-green-600 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-medium text-green-900">
                Successfully connected!
              </h3>
              <p className="text-sm text-green-700 mt-1">
                Your Gmail account <strong>{connectedEmail}</strong> is now
                connected and ready to import emails.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-600">
            Connect Gmail accounts, manage categories, and let AI sort &
            summarize incoming messages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleConnectAccount}
            variant="outline"
            title="Connect another Gmail account"
          >
            <Plus className="mr-2 h-4 w-4" />
            Connect Gmail
          </Button>

          <Button onClick={() => setAdding(true)} title="Add a new category">
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-500">
            Loading accounts and categories...
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Accounts column */}
          <Card>
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>
                Manage the Gmail accounts you've connected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No accounts connected yet. Click &quot;Connect Gmail&quot; to
                  start.
                </p>
              ) : (
                <ul className="space-y-3">
                  {accounts.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-col gap-2 p-3 border rounded-md"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{a.email}</div>
                        <div className="text-xs text-slate-500">
                          {a.provider ?? "google"} • last sync:{" "}
                          {a.last_sync_at
                            ? new Date(a.last_sync_at).toLocaleString()
                            : "never"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleSyncAccount(a.id)}
                          disabled={syncing === a.id}
                          size="sm"
                          variant="default"
                        >
                          <RefreshCw
                            className={`mr-2 h-3 w-3 ${syncing === a.id ? "animate-spin" : ""}`}
                          />
                          {syncing === a.id ? "Syncing..." : "Sync"}
                        </Button>
                        {syncError && syncError.accountId === a.id && (
                          <Button
                            onClick={() => handleReconnectAccount(a.id)}
                            size="sm"
                            variant="outline"
                          >
                            Reconnect
                          </Button>
                        )}
                      </div>
                      {syncError && syncError.accountId === a.id && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {syncError.message}
                          </AlertDescription>
                        </Alert>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Categories column */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Categories</CardTitle>
                  <CardDescription>
                    Custom categories are used by the AI to sort incoming
                    emails.
                  </CardDescription>
                </div>
                <Button onClick={refreshCategories} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No categories yet. Click &quot;Add Category&quot; to create
                  one.
                </p>
              ) : (
                <div className="grid gap-3">
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex-1">
                        <a
                          href={`/categories/${c.id}`}
                          className="font-medium text-sm text-slate-900 hover:text-indigo-600"
                        >
                          {c.name}
                        </a>
                        <p className="text-xs text-slate-500 mt-1">
                          {c.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {typeof c.count === "number" ? c.count : "0"}
                        </Badge>
                        <Button
                          title="Delete category"
                          onClick={() => handleDeleteCategory(c.id)}
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Category Dialog */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>
              Create a new category for AI to sort your emails.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Receipts, Work, Newsletters"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="How should AI decide this category? e.g. 'Purchase confirmations, invoices, receipts, order confirmations, and payment notifications'"
                rows={4}
              />
              <p className="text-xs text-slate-500">
                The AI will use this description to classify emails into this
                category.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAdding(false);
                  setNewName("");
                  setNewDescription("");
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the category. Emails in this category will not be
              deleted, but they will no longer be categorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="py-10 text-center text-slate-500">Loading...</div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
