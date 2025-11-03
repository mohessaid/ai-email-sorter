import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabaseClient";

/**
 * POST /api/emails/[id]/move
 *
 * Moves an email to a different category
 * Body: { categoryId: string }
 */
export async function POST(
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

    const body = await request.json().catch(() => null);
    const categoryId = body?.categoryId;

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category ID is required" },
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

    // Verify the target category belongs to the user
    const { data: targetCategory, error: categoryError } = await supabase
      .from("categories")
      .select("id, name, user_id")
      .eq("id", categoryId)
      .eq("user_id", userId)
      .single();

    if (categoryError || !targetCategory) {
      return NextResponse.json(
        { error: "Target category not found or access denied" },
        { status: 404 }
      );
    }

    // Verify the email belongs to the user via its current category
    const { data: email, error: emailError } = await supabase
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

    if (emailError || !email) {
      return NextResponse.json(
        { error: "Email not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    const currentCategory = email.categories as any;
    if (currentCategory.user_id !== userId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Move the email to the new category
    const { error: updateError } = await supabase
      .from("emails")
      .update({ category_id: categoryId })
      .eq("id", id);

    if (updateError) {
      console.error("Failed to move email:", updateError);
      return NextResponse.json(
        { error: "Failed to move email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Email moved to ${targetCategory.name}`,
    });
  } catch (error) {
    console.error("POST /api/emails/[id]/move error:", error);
    return NextResponse.json(
      { error: "Failed to move email" },
      { status: 500 }
    );
  }
}
