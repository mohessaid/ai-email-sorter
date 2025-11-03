import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/accounts/connect
 *
 * Initiates the OAuth flow to connect a Gmail account.
 * Redirects to the Google OAuth route.
 */
export async function GET(request: NextRequest) {
  try {
    // Redirect to the OAuth initiation route
    return NextResponse.redirect(new URL("/api/auth/google", request.url));
  } catch (err) {
    console.error("GET /api/accounts/connect error:", err);
    return NextResponse.json(
      { error: "Failed to initiate OAuth" },
      { status: 500 },
    );
  }
}
