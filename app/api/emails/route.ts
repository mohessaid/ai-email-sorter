import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabaseClient";

/**
 * GET /api/emails?categoryId=<id>
 *
 * Returns emails in a specific category for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 },
      );
    }

    // Get user from session
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify category belongs to user
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .eq("user_id", userId)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: "Category not found or access denied" },
        { status: 404 },
      );
    }

    // Fetch emails in this category
    const { data: emails, error: emailsError } = await supabase
      .from("emails")
      .select(
        `
        id,
        gmail_message_id,
        subject,
        from_email,
        from_name,
        to_email,
        date,
        snippet,
        summarized_text,
        read_at,
        created_at
      `,
      )
      .eq("category_id", categoryId)
      .is("deleted_at", null)
      .order("date", { ascending: false });

    if (emailsError) {
      console.error("Failed to fetch emails:", emailsError);
      return NextResponse.json(
        { error: "Failed to fetch emails" },
        { status: 500 },
      );
    }

    return NextResponse.json(emails || []);
  } catch (error) {
    console.error("GET /api/emails error:", error);
    return NextResponse.json(
      { error: "Failed to load emails" },
      { status: 500 },
    );
  }
}
