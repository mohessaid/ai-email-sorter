import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /api/debug/cookies
 *
 * Debug endpoint to check what cookies are being sent/received
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    const cookieData = allCookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value.substring(0, 50) + (cookie.value.length > 50 ? "..." : ""),
      hasValue: !!cookie.value,
    }));

    return NextResponse.json({
      success: true,
      cookieCount: allCookies.length,
      cookies: cookieData,
      hasUserId: !!cookieStore.get("user_id")?.value,
      hasUserEmail: !!cookieStore.get("user_email")?.value,
      userId: cookieStore.get("user_id")?.value || null,
      userEmail: cookieStore.get("user_email")?.value || null,
    });
  } catch (error) {
    console.error("Debug cookies error:", error);
    return NextResponse.json(
      { error: "Failed to read cookies" },
      { status: 500 },
    );
  }
}
