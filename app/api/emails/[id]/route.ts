import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabaseClient";

/**
 * GET /api/emails/[id]
 *
 * Returns a single email by ID for the authenticated user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Email ID is required" },
        { status: 400 }
      );
    }

    // Get user from session
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Fetch the email and verify it belongs to a category owned by this user
    const { data: email, error: emailError } = await supabase
      .from("emails")
      .select(
        `
        id,
        gmail_message_id,
        thread_id,
        subject,
        from_email,
        from_name,
        to_email,
        to_name,
        date,
        snippet,
        raw_text,
        html,
        category_id,
        summarized_text,
        classification_confidence,
        classification_method,
        processing_status,
        imported_at,
        archived_at,
        read_at,
        created_at,
        categories!inner(
          id,
          name,
          description,
          user_id
        )
      `
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (emailError || !email) {
      console.error("Failed to fetch email:", emailError);
      return NextResponse.json(
        { error: "Email not found" },
        { status: 404 }
      );
    }

    // Verify the category belongs to the authenticated user
    const category = email.categories as any;
    if (category.user_id !== userId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Mark email as read if not already
    if (!email.read_at) {
      await supabase
        .from("emails")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
    }

    // Remove the nested categories object and flatten it
    const { categories, ...emailData } = email;

    return NextResponse.json({
      ...emailData,
      category: {
        id: category.id,
        name: category.name,
        description: category.description,
      },
    });
  } catch (error) {
    console.error("GET /api/emails/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to load email" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/emails/[id]
 *
 * Soft deletes an email (sets deleted_at timestamp)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Email ID is required" },
        { status: 400 }
      );
    }

    // Get user from session
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // First verify the email belongs to the user via category
    const { data: email, error: fetchError } = await supabase
      .from("emails")
      .select(
        `
        id,
        category_id,
        categories!inner(
          user_id
        )
      `
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (fetchError || !email) {
      return NextResponse.json(
        { error: "Email not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    const category = email.categories as any;
    if (category.user_id !== userId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Soft delete the email
    const { error: deleteError } = await supabase
      .from("emails")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (deleteError) {
      console.error("Failed to delete email:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/emails/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete email" },
      { status: 500 }
    );
  }
}
