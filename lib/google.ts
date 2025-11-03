import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

/**
 * getGoogleClient
 * - Accepts an account object which should include `id` and `refresh_token` (and optionally access_token / token_expiry)
 * - Ensures the OAuth2 client has a valid access token (refreshing if necessary)
 * - Updates the `google_accounts` row by `id` when tokens or expiry are refreshed/changed
 */
export async function getGoogleClient(account: {
  id?: string;
  refresh_token?: string | null;
  access_token?: string | null;
  token_expiry?: string | null;
}) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  // Seed the client with any known credentials so refresh can happen when needed
  oauth2Client.setCredentials({
    refresh_token: account.refresh_token || undefined,
    access_token: account.access_token || undefined,
    // expiry_date should be a number (ms since epoch) when present; leave undefined otherwise
    expiry_date: account.token_expiry
      ? new Date(account.token_expiry).getTime()
      : undefined,
  });

  try {
    // Trigger token retrieval/refresh. This call ensures oauth2Client.credentials are populated.
    // Note: getAccessToken() may return a token string or an object depending on version; the refreshed
    // credentials are available on oauth2Client.credentials afterwards.
    await oauth2Client.getAccessToken();

    // Read refreshed credentials from the client
    const refreshed = oauth2Client.credentials || {};
    const refreshedAccessToken = refreshed.access_token as string | undefined;
    const refreshedRefreshToken = refreshed.refresh_token as string | undefined;
    const refreshedExpiry = refreshed.expiry_date as number | undefined;

    // Prepare DB updates if tokens/expiry changed
    const updates: Record<string, any> = {};
    if (refreshedAccessToken && refreshedAccessToken !== account.access_token) {
      updates.access_token = refreshedAccessToken;
    }
    if (
      refreshedRefreshToken &&
      refreshedRefreshToken !== account.refresh_token
    ) {
      updates.refresh_token = refreshedRefreshToken;
    }
    if (typeof refreshedExpiry === "number") {
      updates.token_expiry = new Date(refreshedExpiry).toISOString();
    }

    // Only update by account id (safer and deterministic) when we have an id and something changed
    if (account.id && Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("google_accounts")
        .update(updates)
        .eq("id", account.id);
      if (error) {
        // Log but don't fail hard — the token refresh itself succeeded and client is usable
        console.error(
          "Failed updating google_accounts tokens for account id",
          account.id,
          error,
        );
      }
    }

    return oauth2Client;
  } catch (err: any) {
    // Provide helpful logs for debugging server-side 500s
    console.error(
      "Error obtaining/refreshing Google access token for account",
      account?.id,
      err,
    );
    // Surface a consistent error message to callers
    throw new Error("Failed to obtain Google access token");
  }
}
