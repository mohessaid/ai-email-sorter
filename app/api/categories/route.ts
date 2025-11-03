import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabaseClient";
import { cookies } from "next/headers";

/**
 * GET /api/categories
 *
 * Returns all categories for the authenticated user from the database.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      // No authenticated user - return empty array
      return NextResponse.json([]);
    }

    const supabase = createAdminClient();

    // Fetch categories for this user with email count
    const { data: categories, error } = await supabase
      .from("categories")
      .select(
        `
        id,
        name,
        description,
        created_at,
        emails:emails(count)
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch categories:", error);
      return NextResponse.json(
        { error: "Failed to load categories" },
        { status: 500 },
      );
    }

    // Transform to expected format with email counts
    const transformedCategories = (categories || []).map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      count: category.emails?.[0]?.count || 0,
    }));

    return NextResponse.json(transformedCategories);
  } catch (err) {
    console.error("GET /api/categories error:", err);
    return NextResponse.json(
      { error: "Failed to load categories" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/categories
 *
 * Creates a new category for the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const name = body.name?.toString()?.trim();
    const description = body.description?.toString()?.trim() || "";

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Insert the new category
    const { data: newCategory, error } = await supabase
      .from("categories")
      .insert({
        name,
        description,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create category:", error);
      return NextResponse.json(
        { error: "Failed to create category" },
        { status: 500 },
      );
    }

    // Return the created category with count
    return NextResponse.json(
      {
        id: newCategory.id,
        name: newCategory.name,
        description: newCategory.description,
        count: 0,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/categories error:", err);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/categories
 *
 * Deletes a category for the authenticated user.
 */
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Delete the category (ensure user owns it)
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to delete category:", error);
      return NextResponse.json(
        { error: "Failed to delete category" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/categories error:", err);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
