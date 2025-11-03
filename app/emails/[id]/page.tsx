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
import { Separator } from "@/components/ui/separator";
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
import { ArrowLeft, Trash2, Mail, Clock, User, Info } from "lucide-react";

type Email = {
  id: string;
  gmail_message_id: string;
  thread_id?: string;
  subject: string;
  from_email: string;
  from_name?: string;
  to_email?: string;
  to_name?: string;
  date: string;
  snippet?: string;
  raw_text?: string;
  html?: string;
  category_id?: string;
  summarized_text?: string;
  read_at?: string | null;
};

type Category = {
  id: string;
  name: string;
  description: string;
};

export default function EmailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const emailId = params.id as string;

  const [email, setEmail] = useState<Email | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"html" | "text">("html");
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadEmail();
  }, [emailId]);

  async function loadEmail() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/emails/${emailId}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to load email");
      }

      const data = await res.json();
      setEmail(data);

      // Load category info
      if (data.category_id) {
        const catRes = await fetch("/api/categories", {
          credentials: "include",
        });
        if (catRes.ok) {
          const categories = await catRes.json();
          const cat = Array.isArray(categories)
            ? categories.find((c) => c.id === data.category_id)
            : null;
          setCategory(cat || null);
        }
      }
    } catch (err: any) {
      console.error("Failed to load email:", err);
      setError(err.message || "Failed to load email");
    } finally {
      setLoading(false);
    }
  }

  function requestDelete() {
    setDeleteConfirmOpen(true);
  }

  async function handleDelete() {
    setDeleteConfirmOpen(false);
    setDeleting(true);
    try {
      const res = await fetch(`/api/emails/${emailId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to delete email");
      }

      toast({
        title: "Email deleted",
        description: "The email has been deleted successfully.",
      });

      // Navigate back to category or inbox
      if (category) {
        router.push(`/categories/${category.id}`);
      } else {
        router.push("/inbox");
      }
    } catch (err: any) {
      console.error("Delete failed:", err);
      toast({
        title: "Error",
        description: `Failed to delete email: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-64 w-full mt-6" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="max-w-5xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription className="text-center">
            <p className="mb-4">{error || "Email not found"}</p>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header with back button */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Email Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">
                {email.subject || "No Subject"}
              </CardTitle>
              {category && (
                <Link href={`/categories/${category.id}`}>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                  >
                    {category.name}
                  </Badge>
                </Link>
              )}
            </div>
            <Button
              onClick={requestDelete}
              disabled={deleting}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-slate-500 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-500 block mb-1">
                  From:
                </span>
                <span className="text-sm text-slate-900">
                  {email.from_name && (
                    <span className="font-medium">{email.from_name}</span>
                  )}
                  {email.from_name && email.from_email && " "}
                  {email.from_email && (
                    <span className="text-slate-600">
                      &lt;{email.from_email}&gt;
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-slate-500 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-500 block mb-1">
                  To:
                </span>
                <span className="text-sm text-slate-900">
                  {email.to_name && (
                    <span className="font-medium">{email.to_name}</span>
                  )}
                  {email.to_name && email.to_email && " "}
                  {email.to_email && (
                    <span className="text-slate-600">
                      &lt;{email.to_email}&gt;
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-slate-500 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-500 block mb-1">
                  Date:
                </span>
                <span className="text-sm text-slate-900">
                  {formatDate(email.date)}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* AI Summary */}
        {email.summarized_text && (
          <>
            <Separator />
            <CardContent className="py-4 bg-blue-50/50">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">
                    AI Summary
                  </h3>
                  <p className="text-sm text-blue-800">
                    {email.summarized_text}
                  </p>
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* View Mode Toggle */}
        {email.html && email.raw_text && (
          <>
            <Separator />
            <CardContent className="py-3 bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">View:</span>
                <Button
                  onClick={() => setViewMode("html")}
                  variant={viewMode === "html" ? "default" : "outline"}
                  size="sm"
                >
                  HTML
                </Button>
                <Button
                  onClick={() => setViewMode("text")}
                  variant={viewMode === "text" ? "default" : "outline"}
                  size="sm"
                >
                  Plain Text
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Email Body */}
        <Separator />
        <CardContent className="p-6">
          {viewMode === "html" && email.html ? (
            <div className="prose prose-sm max-w-none">
              <iframe
                srcDoc={email.html}
                className="w-full min-h-[400px] border rounded"
                sandbox="allow-same-origin"
                title="Email content"
              />
            </div>
          ) : email.raw_text ? (
            <div className="whitespace-pre-wrap text-sm text-slate-800 font-mono bg-slate-50 p-4 rounded border">
              {email.raw_text}
            </div>
          ) : email.snippet ? (
            <div className="text-sm text-slate-600 italic">
              {email.snippet}
              <p className="mt-4 text-slate-500">
                (Full email content not available)
              </p>
            </div>
          ) : (
            <div className="text-sm text-slate-500 italic">
              No email content available
            </div>
          )}
        </CardContent>

        {/* Footer with actions */}
        <Separator />
        <CardContent className="py-4 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Gmail Message ID: {email.gmail_message_id}
            </div>
            <div className="flex items-center gap-3">
              {category && (
                <Link href={`/categories/${category.id}`}>
                  <Button variant="link" size="sm">
                    View all in {category.name} →
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this email?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This email will be permanently
              deleted from the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
