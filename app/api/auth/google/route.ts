import { NextResponse } from "next/server";
import type { NextRequest } from "next/request";

/**
 * GET /api/auth/google
 *
 * Initiates Google OAuth flow for Gmail access
 * Redirects user to Google's consent screen
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json(
        {
          error: "Google OAuth not configured",
          message: "Set GOOGLE_CLIENT_ID in .env.local",
          setup_guide: "See README.md for Google OAuth setup instructions"
        },
        { status: 500 }
      );
    }

    // OAuth 2.0 parameters
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/auth/callback/google`;

    // Gmail scopes we need
    const scopes = [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
    ].join(" ");

    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(7);

    // Build Google OAuth URL
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", scopes);
    authUrl.searchParams.append("access_type", "offline"); // Get refresh token
    authUrl.searchParams.append("prompt", "consent"); // Force consent screen
    authUrl.searchParams.append("state", state);

    console.log("Redirecting to Google OAuth:", {
      clientId: clientId.substring(0, 20) + "...",
      redirectUri,
      scopes: scopes.split(" "),
    });

    // Redirect to Google
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("OAuth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}
