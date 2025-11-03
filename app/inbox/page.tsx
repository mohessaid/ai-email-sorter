"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Inbox as InboxIcon,
  Mail,
  ArrowLeft,
  CheckSquare,
  Trash2,
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
  category_id: string;
};

type Category = {
  id: string;
  name: string;
};

export default function InboxPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [movingTo, setMovingTo] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadInboxAndCategories();
  }, []);

  async function loadInboxAndCategories() {
    setLoading(true);
    setError(null);
    try {
      // Load categories to find Inbox
      const catRes = await fetch("/api/categories", { credentials: "include" });
      if (catRes.ok) {
        const cats = await catRes.json();
        setCategories(Array.isArray(cats) ? cats : []);

        // Find Inbox category
        const inboxCat = cats.find(
          (c: Category) => c.name.toLowerCase() === "inbox",
        );

        if (inboxCat) {
          // Load emails in Inbox
          const emailRes = await fetch(
            `/api/emails?categoryId=${inboxCat.id}`,
            { credentials: "include" },
          );
          if (emailRes.ok) {
            const data = await emailRes.json();
            setEmails(Array.isArray(data) ? data : []);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load inbox:", err);
      setError("Failed to load inbox");
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

  async function handleMoveTo(categoryId: string) {
    if (selectedEmails.size === 0) return;

    setActionInProgress(true);
    setMovingTo(categoryId);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedEmails).map((emailId) =>
          fetch(`/api/emails/${emailId}/move`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ categoryId }),
          }),
        ),
      );

      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        toast({
          title: "Partially completed",
          description: `Moved ${results.length - failed} emails, ${failed} failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Successfully moved ${results.length} emails`,
        });
      }

      setSelectedEmails(new Set());
      loadInboxAndCategories();
    } catch (err) {
      console.error("Move failed:", err);
      toast({
        title: "Error",
        description: "Failed to move emails",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(false);
      setMovingTo(null);
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
      loadInboxAndCategories();
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

  const otherCategories = categories.filter(
    (c) => c.name.toLowerCase() !== "inbox",
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Inbox</h1>
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

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Inbox</h1>
        </div>
        <Alert variant="destructive">
          <AlertDescription className="text-center">
            <p className="mb-4">{error}</p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <InboxIcon className="w-8 h-8 text-indigo-600" />
              Inbox
              <Badge variant="secondary">{emails.length} emails</Badge>
            </h1>
            <p className="text-slate-600 mt-2">
              Uncategorized emails waiting to be sorted
            </p>
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
                {otherCategories.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Move to:</span>
                    <Select
                      disabled={actionInProgress}
                      onValueChange={(value) => {
                        if (value) {
                          handleMoveTo(value);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {otherCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
            <CardTitle className="mb-2">Inbox is empty!</CardTitle>
            <CardDescription className="mb-6">
              All your emails have been categorized. Great job staying
              organized!
            </CardDescription>
            <Link href="/categories">
              <Button size="lg">View Categories</Button>
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
          <h4 className="font-medium mb-2">About Inbox</h4>
          <p className="text-sm mb-2">
            The Inbox is a special category that holds:
          </p>
          <ul className="text-sm list-disc list-inside space-y-1 ml-2">
            <li>New emails that haven't been categorized yet</li>
            <li>Emails that didn't match any of your categories</li>
            <li>Emails imported before you created categories</li>
          </ul>
          <p className="text-sm mt-2">
            Select emails and move them to the appropriate category to keep your
            inbox clean!
          </p>
        </AlertDescription>
      </Alert>

      <div className="mt-6 text-center">
        <Link href="/">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

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
    </div>
  );
}
