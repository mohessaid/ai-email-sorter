import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabaseClient";

/**
 * GET /api/auth/callback/google
 *
 * Handles the OAuth callback from Google
 * Exchanges authorization code for access token and refresh token
 * Stores user and account data in Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("OAuth error:", error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}?error=${error}`,
      );
    }

    // Check if we have authorization code
    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}?error=no_code`,
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Missing Google OAuth credentials");
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}?error=config_missing`,
      );
    }

    // Exchange code for tokens
    const tokenUrl = "https://oauth2.googleapis.com/token";
    const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/callback/google`;

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}?error=token_exchange_failed`,
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      },
    );

    if (!userInfoResponse.ok) {
      console.error("Failed to get user info");
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}?error=user_info_failed`,
      );
    }

    const userInfo = await userInfoResponse.json();

    console.log("OAuth successful:", {
      email: userInfo.email,
      hasRefreshToken: !!tokens.refresh_token,
      scopes: tokens.scope,
    });

    // Save to Supabase
    try {
      const supabase = createAdminClient();

      // 1. Create or get user
      let userId: string;

      // Check if user already exists
      const { data: existingUsers, error: userQueryError } = await supabase
        .from("users")
        .select("id")
        .eq("email", userInfo.email)
        .limit(1);

      if (userQueryError) {
        console.error("Error querying users:", userQueryError);
        throw userQueryError;
      }

      if (existingUsers && existingUsers.length > 0) {
        userId = existingUsers[0].id;
        console.log("Existing user found:", userId);
      } else {
        // Create new user
        const { data: newUser, error: userInsertError } = await supabase
          .from("users")
          .insert({
            email: userInfo.email,
            name: userInfo.name || null,
          })
          .select("id")
          .single();

        if (userInsertError) {
          console.error("Error creating user:", userInsertError);
          throw userInsertError;
        }

        userId = newUser.id;
        console.log("New user created:", userId);
      }

      // 2. Check if this Google account is already connected
      const { data: existingAccounts, error: accountQueryError } =
        await supabase
          .from("google_accounts")
          .select("id")
          .eq("email", userInfo.email)
          .eq("user_id", userId)
          .limit(1);

      if (accountQueryError) {
        console.error("Error querying google_accounts:", accountQueryError);
        throw accountQueryError;
      }

      // Calculate token expiry
      const tokenExpiry = new Date(
        Date.now() + (tokens.expires_in || 3600) * 1000,
      );

      // Parse scopes
      const scopes = tokens.scope ? tokens.scope.split(" ") : [];

      if (existingAccounts && existingAccounts.length > 0) {
        // Update existing account
        const { error: accountUpdateError } = await supabase
          .from("google_accounts")
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            token_expiry: tokenExpiry.toISOString(),
            scopes: scopes,
            last_sync_at: null, // Reset sync timestamp
          })
          .eq("id", existingAccounts[0].id);

        if (accountUpdateError) {
          console.error("Error updating google_account:", accountUpdateError);
          throw accountUpdateError;
        }

        console.log("Google account updated:", existingAccounts[0].id);
      } else {
        // Create new google account
        const { error: accountInsertError } = await supabase
          .from("google_accounts")
          .insert({
            user_id: userId,
            email: userInfo.email,
            google_user_id: userInfo.id,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            token_expiry: tokenExpiry.toISOString(),
            scopes: scopes,
          });

        if (accountInsertError) {
          console.error("Error creating google_account:", accountInsertError);
          throw accountInsertError;
        }

        console.log("New Google account connected for user:", userId);
      }

      // Redirect back to dashboard with success message
      const response = NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}?auth=success&email=${encodeURIComponent(userInfo.email)}`,
      );

      // Set a simple session cookie with the user ID
      response.cookies.set("user_id", userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      response.cookies.set("user_email", userInfo.email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    } catch (dbError) {
      console.error("Database error during OAuth:", dbError);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}?error=database_error`,
      );
    }
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}?error=callback_failed`,
    );
  }
}
