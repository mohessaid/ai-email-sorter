/**
 * Supabase Client Configuration
 *
 * Using @supabase/ssr for Next.js 15+ with App Router
 * This provides both client-side and server-side Supabase clients
 */

import { createBrowserClient } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Client-side Supabase client for use in React components
 * Safe to use in browser contexts
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Server-side Supabase client for use in Server Components, Route Handlers, and Server Actions
 * Handles cookie-based session management
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

/**
 * Admin client for server-side operations that bypass RLS
 * Only use for trusted server-side operations
 * NEVER expose this to the client
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for admin operations",
    );
  }

  return createBrowserClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Export types
export type { SupabaseClient } from "@supabase/supabase-js";
