import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * GET /api/test
 *
 * Simple health / test endpoint intended for Playwright e2e checks.
 * Returns a small JSON payload that includes a timestamp to verify the server is responding.
 *
 * Example:
 *  fetch('/api/test').then(r => r.json()) -> { ok: true, timestamp: '...' }
 */
export async function GET(_req: NextRequest) {
  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() })
}

/**
 * POST /api/test
 *
 * Echo endpoint useful for end-to-end tests that need to POST data and validate server handling.
 * Returns the JSON body that was sent (if any) and a timestamp.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    return NextResponse.json({ ok: true, received: body, timestamp: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }
}
