import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabaseClient";
import { cookies } from "next/headers";

/**
 * GET /api/accounts
 *
 * Returns the list of connected Google accounts from the database.
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

    // Fetch google accounts for this user
    const { data: accounts, error } = await supabase
      .from("google_accounts")
      .select("id, email, scopes, last_sync_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch accounts:", error);
      return NextResponse.json(
        { error: "Failed to load accounts" },
        { status: 500 },
      );
    }

    // Transform to expected format
    const transformedAccounts = (accounts || []).map((account) => ({
      id: account.id,
      email: account.email,
      provider: "google",
      last_sync_at: account.last_sync_at,
      status: "connected",
    }));

    return NextResponse.json(transformedAccounts);
  } catch (err) {
    console.error("GET /api/accounts error:", err);
    return NextResponse.json(
      { error: "Failed to load accounts", details: String(err) },
      { status: 500 },
    );
  }
}

/**
 * POST /api/accounts/connect
 *
 * Initiates OAuth flow to connect a new Gmail account
 * Redirects to the OAuth route
 */
export async function POST(request: NextRequest) {
  try {
    // Redirect to OAuth initiation
    return NextResponse.redirect(new URL("/api/auth/google", request.url));
  } catch (err) {
    console.error("POST /api/accounts error:", err);
    return NextResponse.json(
      { error: "Failed to initiate OAuth" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/accounts/:id
 *
 * Disconnects a Google account by removing it from the database
 */
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const accountId = url.searchParams.get("id");

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Delete the account (ensure user owns it)
    const { error } = await supabase
      .from("google_accounts")
      .delete()
      .eq("id", accountId)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to delete account:", error);
      return NextResponse.json(
        { error: "Failed to disconnect account" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/accounts error:", err);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 },
    );
  }
}
