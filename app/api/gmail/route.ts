/**
 * ai_email_sorter/next/app/api/gmail/route.ts
 *
 * Placeholder Gmail API route for the AI Email Sorter MVP.
 *
 * This file provides a small, safe scaffold for handling:
 *  - Health checks for the Gmail integration endpoint (GET)
 *  - A minimal POST handler that accepts structured JSON actions from the frontend or Gmail
 *    (e.g., webhook notifications, developer-triggered import/archive requests).
 *
 * IMPORTANT:
 *  - This is intentionally a placeholder that does NOT call Gmail or perform any privileged
 *    operations. Replace the TODO blocks below with real Gmail API interactions using
 *    stored OAuth tokens and a secure server-side client (service account or per-user OAuth tokens).
 *  - For Gmail push notifications (watch), you would typically implement a POST endpoint that
 *    validates requests (Pub/Sub push verification or channel tokens), then schedules a worker
 *    to fetch new messages and process them.
 *
 * Next steps when wiring up real behavior:
 *  - Use the server-side Supabase admin client to read stored Google OAuth refresh tokens.
 *  - Implement token refresh logic before calling Gmail endpoints.
 *  - For long-running or browser-like interactions (unsubscribe agent), dispatch background jobs
 *    to a worker/queue (Playwright container, serverless worker, etc).
 *  - Ensure all secrets (service keys, tokens) are server-only env vars and never sent to browsers.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { IncomingHttpHeaders } from 'http'

type Action =
  | 'health'
  | 'list_recent' // developer-triggered: list recent inbox messages (placeholder)
  | 'import' // developer-triggered: import and classify messages for a given account
  | 'archive' // archive a specific Gmail message (placeholder)
  | 'webhook' // Gmail push / PubSub notification forwarded here
  | 'noop' // explicit no-op for testing

type GmailWebhookPayload = {
  // Gmail push notifications are usually minimal (historyId, etc).
  // Real payloads will vary if you use Pub/Sub push + Gmail watch.
  historyId?: string
  emailAddress?: string
  messageIds?: string[]
  raw?: any
}

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * GET /api/gmail
 *
 * Simple health endpoint for the Gmail integration.
 * Useful for smoke checks in CI or when configuring webhooks.
 */
export async function GET(_req: NextRequest) {
  try {
    return jsonResponse({
      ok: true,
      service: 'ai-email-sorter-gmail-placeholder',
      timestamp: new Date().toISOString(),
      note:
        'This endpoint is a placeholder. Replace with real Gmail webhook handling and API calls in server-side code.',
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('GET /api/gmail error', err)
    return jsonResponse({ ok: false, error: 'unexpected_error' }, 500)
  }
}

/**
 * Helper to read JSON safely from the request.
 */
async function readJsonSafe(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    return body
  } catch {
    return null
  }
}

/**
 * POST /api/gmail
 *
 * Accepts a JSON body with shape:
 * {
 *   action: 'list_recent' | 'import' | 'archive' | 'webhook' | 'noop',
 *   accountId?: string,       // internal account id to operate on (for list/import/archive)
 *   messageId?: string,       // gmail message id (for archive)
 *   webhook?: { ... }         // webhook payload (for 'webhook' action)
 * }
 *
 * This route intentionally does not perform Gmail operations. It returns structured
 * guidance for what a real implementation should do.
 */
export async function POST(req: NextRequest) {
  try {
    const headers = Object.fromEntries((req.headers as unknown as Headers).entries()) as IncomingHttpHeaders
    const body = (await readJsonSafe(req)) ?? {}

    const action = (body.action as Action) || (body.webhook ? 'webhook' : 'noop')

    // Basic debug log for development to see incoming payloads in the server logs.
    // Do not log sensitive tokens or PII in production.
    // eslint-disable-next-line no-console
    console.info(`[GMAIL API PLACEHOLDER] Received action="${action}"`, {
      accountId: body.accountId,
      messageId: body.messageId,
      headers: {
        // Show a few non-sensitive headers that may be useful for webhook verification during dev
        'user-agent': headers['user-agent'],
        'x-forwarded-for': headers['x-forwarded-for'],
      },
      webhookHint: body.webhook ? { historyId: (body.webhook as GmailWebhookPayload).historyId } : undefined,
    })

    switch (action) {
      case 'health': {
        return jsonResponse({ ok: true, action: 'health', timestamp: new Date().toISOString() })
      }

      case 'noop': {
        return jsonResponse({ ok: true, action: 'noop', message: 'No operation performed (placeholder)' })
      }

      case 'list_recent': {
        // TODO: Implement: read user->google_account mapping from DB, refresh access token,
        // call Gmail API (users.messages.list with labelIds=INBOX) and return limited results.
        // For now return a deterministic placeholder.
        return jsonResponse({
          ok: true,
          action: 'list_recent',
          note: 'This is a placeholder response. Implement Gmail API calls server-side.',
          messages: [
            { id: 'msg_abc123', threadId: 'th_1', subject: 'Welcome — placeholder', snippet: 'This is a sample snippet.' },
            { id: 'msg_def456', threadId: 'th_2', subject: 'Your receipt', snippet: 'Receipt for order #12345' },
          ],
        })
      }

      case 'archive': {
        // TODO: Implement: validate the caller, lookup account tokens, call Gmail `modify` to remove INBOX label.
        const messageId = body.messageId
        if (!messageId) {
          return jsonResponse({ ok: false, error: 'messageId is required for archive action' }, 400)
        }
        return jsonResponse({
          ok: true,
          action: 'archive',
          messageId,
          note: 'Archive operation is not implemented in this placeholder. Implement Gmail API modify call server-side.',
        })
      }

      case 'import': {
        // TODO: Implement: trigger a background job that fetches unread messages for the specified account,
        // runs classification + summarization, stores emails in DB, and archives them in Gmail.
        const accountId = body.accountId
        if (!accountId) {
          return jsonResponse({ ok: false, error: 'accountId is required for import action' }, 400)
        }
        return jsonResponse({
          ok: true,
          action: 'import',
          accountId,
          note:
            'Import is a placeholder. Real implementation should enqueue a background job (worker) to poll Gmail and process messages.',
        })
      }

      case 'webhook': {
        // Many Gmail integrations use Pub/Sub: Google publishes push notifications to a Pub/Sub topic,
        // which then forwards to an HTTPS endpoint. The shape will depend on your Pub/Sub push config.
        // Here we accept an incoming webhook payload and respond quickly (200) — but do NOT process heavy work inline.
        const webhook = (body.webhook as GmailWebhookPayload) ?? {}
        // In production verify authenticity (tokens / JWTs / pull Pub/Sub, etc.) before trusting payload.
        // TODO: Validate webhook origin and enqueue a worker to fetch message details and process them.
        // Example flow:
        // 1) verify token
        // 2) enqueue job: { type: 'gmail.processNotification', accountId, historyId }
        return jsonResponse({
          ok: true,
          action: 'webhook',
          received: webhook,
          note:
            'Webhook received. In production, validate the request and enqueue a background job to fetch and process messages from Gmail.',
        })
      }

      default: {
        return jsonResponse({ ok: false, error: 'unknown_action', action }, 400)
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('POST /api/gmail error', err)
    return jsonResponse({ ok: false, error: 'unexpected_error' }, 500)
  }
}
