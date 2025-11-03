"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
import {
  Trash2,
  Mail,
  ArrowLeft,
  CheckSquare,
  Square,
  Info,
} from "lucide-react";

type Email = {
  id: string;
  subject: string;
  from_email: string;
  from_name?: string;
  date: string;
  summarized_text: string;
  snippet?: string;
  gmail_message_id: string;
  read_at?: string | null;
};

type Category = {
  id: string;
  name: string;
  description: string;
  count?: number;
};

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [unsubscribeConfirmOpen, setUnsubscribeConfirmOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCategoryAndEmails();
  }, [categoryId]);

  async function loadCategoryAndEmails() {
    setLoading(true);
    setError(null);
    try {
      // Load category details
      const catRes = await fetch("/api/categories", { credentials: "include" });
      if (catRes.ok) {
        const categories = await catRes.json();
        const cat = Array.isArray(categories)
          ? categories.find((c) => c.id === categoryId)
          : null;
        setCategory(cat || null);
      }

      // Load emails in this category
      const emailRes = await fetch(`/api/emails?categoryId=${categoryId}`, {
        credentials: "include",
      });
      if (emailRes.ok) {
        const data = await emailRes.json();
        setEmails(Array.isArray(data) ? data : []);
      } else {
        throw new Error("Failed to load emails");
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load category details");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelectEmail(emailId: string) {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
  }

  function toggleSelectAll() {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map((e) => e.id)));
    }
  }

  function requestBulkDelete() {
    if (selectedEmails.size === 0) return;
    setDeleteConfirmOpen(true);
  }

  async function handleBulkDelete() {
    setDeleteConfirmOpen(false);
    setActionInProgress(true);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedEmails).map((emailId) =>
          fetch(`/api/emails/${emailId}`, {
            method: "DELETE",
            credentials: "include",
          }),
        ),
      );

      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        toast({
          title: "Partially completed",
          description: `Deleted ${results.length - failed} emails, ${failed} failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Successfully deleted ${results.length} emails`,
        });
      }

      setSelectedEmails(new Set());
      loadCategoryAndEmails();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast({
        title: "Error",
        description: "Failed to delete emails",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(false);
    }
  }

  function requestBulkUnsubscribe() {
    if (selectedEmails.size === 0) return;
    setUnsubscribeConfirmOpen(true);
  }

  async function handleBulkUnsubscribe() {
    setUnsubscribeConfirmOpen(false);
    setActionInProgress(true);
    try {
      const selectedEmailIds = Array.from(selectedEmails);
      const res = await fetch("/api/emails/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emailIds: selectedEmailIds }),
      });

      if (!res.ok) {
        throw new Error("Unsubscribe request failed");
      }

      const result = await res.json();
      toast({
        title: "Unsubscribe completed",
        description: `${result.successful || 0} successful, ${result.failed || 0} failed`,
      });

      setSelectedEmails(new Set());
      loadCategoryAndEmails();
    } catch (err) {
      console.error("Bulk unsubscribe failed:", err);
      toast({
        title: "Error",
        description: "Failed to process unsubscribe requests",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(false);
    }
  }

  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else if (diffDays === 1) {
        return "Yesterday";
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return dateString;
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Category Emails</h1>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Category Emails</h1>
        </div>
        <Alert variant="destructive">
          <AlertDescription className="text-center">
            <p className="mb-4">{error || "Category not found"}</p>
            <Link href="/categories">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Categories
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href="/categories">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Categories
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {category.name}
              <Badge variant="secondary">{emails.length} emails</Badge>
            </h1>
            <p className="text-slate-600 mt-2">{category.description}</p>
          </div>
        </div>
      </div>

      {selectedEmails.size > 0 && (
        <Alert className="mb-4">
          <CheckSquare className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedEmails.size} email(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={requestBulkUnsubscribe}
                  disabled={actionInProgress}
                  variant="outline"
                  size="sm"
                >
                  Unsubscribe
                </Button>
                <Button
                  onClick={requestBulkDelete}
                  disabled={actionInProgress}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button
                  onClick={() => setSelectedEmails(new Set())}
                  variant="ghost"
                  size="sm"
                >
                  Clear
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {emails.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <CardTitle className="mb-2">
              No emails in this category yet
            </CardTitle>
            <CardDescription className="mb-6">
              Sync your Gmail account to import and classify emails into this
              category.
            </CardDescription>
            <Link href="/accounts">
              <Button size="lg">Go to Accounts</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <Card className="sticky top-0 z-10">
            <CardContent className="p-3 flex items-center gap-3">
              <Checkbox
                checked={
                  emails.length > 0 && selectedEmails.size === emails.length
                }
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-slate-600">Select All</span>
            </CardContent>
          </Card>

          {emails.map((email) => (
            <Card
              key={email.id}
              className={`hover:shadow-md transition-shadow ${
                selectedEmails.has(email.id) ? "border-indigo-600" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedEmails.has(email.id)}
                    onCheckedChange={() => toggleSelectEmail(email.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {email.subject || "No Subject"}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {email.from_name || email.from_email}
                        </p>
                      </div>
                      <span className="text-sm text-slate-500 whitespace-nowrap">
                        {formatDate(email.date)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mb-3">
                      {email.summarized_text ||
                        email.snippet ||
                        "No summary available"}
                    </p>
                    <Link href={`/emails/${email.id}`}>
                      <Button variant="link" className="p-0 h-auto">
                        Read Full Email →
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Alert className="mt-8">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <h4 className="font-medium mb-2">Bulk Actions</h4>
          <p className="text-sm">
            Select emails using the checkboxes to perform bulk actions like
            delete or unsubscribe. The unsubscribe feature will automatically
            find and follow unsubscribe links in the selected emails.
          </p>
        </AlertDescription>
      </Alert>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedEmails.size} email(s)?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected emails will be
              permanently deleted from the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsubscribe Confirmation Dialog */}
      <AlertDialog
        open={unsubscribeConfirmOpen}
        onOpenChange={setUnsubscribeConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Unsubscribe from {selectedEmails.size} email(s)?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The app will search for unsubscribe links and attempt to process
              them automatically. This may take some time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkUnsubscribe}>
              Unsubscribe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
