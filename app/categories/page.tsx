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
import { Trash2, Plus, Tag } from "lucide-react";

type Category = {
  id: string;
  name: string;
  description: string;
  count?: number;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to load categories");
      }
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load categories:", err);
      setError("Failed to load categories. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
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

  function requestDeleteCategory(id: string) {
    setDeleteConfirm(id);
  }

  async function handleDeleteCategory() {
    if (!deleteConfirm) return;

    try {
      const res = await fetch(
        `/api/categories?id=${encodeURIComponent(deleteConfirm)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Delete failed");
      setCategories((prev) => prev.filter((c) => c.id !== deleteConfirm));
      toast({
        title: "Category deleted",
        description: "The category has been removed.",
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-slate-600 mt-2">Manage your email categories</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Loading categories...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-slate-600 mt-2">
            Manage categories used by AI to sort your emails
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {categories.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Tag className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No categories yet
            </h3>
            <p className="text-slate-600 mb-6">
              Create categories to help the AI automatically sort your emails.
              For example: "Work", "Receipts", "Newsletters", etc.
            </p>
            <Button onClick={() => setAdding(true)} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Link href={`/categories/${category.id}`}>
                        <CardTitle className="hover:text-indigo-600 cursor-pointer">
                          {category.name}
                        </CardTitle>
                      </Link>
                      <Badge variant="secondary">
                        {category.count ?? 0} emails
                      </Badge>
                    </div>
                    <CardDescription className="mt-2">
                      {category.description || "No description"}
                    </CardDescription>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => requestDeleteCategory(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
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
                placeholder="e.g. Work, Receipts, Newsletters"
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
                placeholder="How should AI decide this category? e.g. 'Emails from colleagues and work-related messages'"
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

      <Alert className="mt-8">
        <Tag className="h-4 w-4" />
        <AlertDescription>
          <h4 className="font-medium mb-2">How Categories Work</h4>
          <p className="text-sm mb-2">
            Categories help the AI automatically organize your emails. When you
            create a category with a clear description, the AI will:
          </p>
          <ul className="text-sm list-disc list-inside space-y-1 ml-2">
            <li>Analyze incoming emails</li>
            <li>Match them to the most relevant category</li>
            <li>Generate a summary of each email</li>
            <li>Organize them for easy viewing</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="mt-6 text-center">
        <Link
          href="/"
          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              Emails in this category will not be deleted, but they will no
              longer be categorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
