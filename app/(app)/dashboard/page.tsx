import React from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard — AI Email Sorter',
  description: 'Overview: connected accounts, custom categories, and recent imports',
}

/**
 * Dashboard page (server component)
 *
 * This is a placeholder that:
 * - Attempts to fetch data from the scaffolded API endpoints (`/api/accounts`, `/api/categories`)
 * - Falls back to small local placeholder data when the API is unavailable (useful for early dev)
 *
 * Replace placeholder behavior with authenticated server-side queries to Supabase once auth is wired up.
 */

type Account = {
  id: string
  email: string
  provider?: string
  last_sync_at?: string | null
}

type Category = {
  id: string
  name: string
  description?: string
  count?: number
}

async function fetchJson<T = unknown>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return fallback
    const data = (await res.json()) as T
    return data
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`Failed to fetch ${url}`, err)
    return fallback
  }
}

export default async function DashboardPage() {
  const accountsFallback: Account[] = [
    { id: 'acct_local_1', email: 'you@example.com', provider: 'google', last_sync_at: null },
  ]
  const categoriesFallback: Category[] = [
    { id: 'cat_local_1', name: 'Receipts', description: 'Purchase confirmations, invoices', count: 3 },
    { id: 'cat_local_2', name: 'Newsletters', description: 'Subscriptions and promotional newsletters', count: 8 },
  ]

  const [accounts, categories] = await Promise.all([
    fetchJson<Account[]>('/api/accounts', accountsFallback),
    fetchJson<Category[]>('/api/categories', categoriesFallback),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-600">
            Connect Gmail accounts, create categories, and let AI sort & summarize incoming messages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Using anchor to server route that starts OAuth flow */}
          <a
            href="/api/accounts/connect"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border text-sm hover:shadow"
          >
            Connect Gmail account
          </a>

          <a
            href="/categories/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700"
          >
            + Add Category
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="bg-white p-4 rounded-md border">
          <h2 className="font-medium text-lg">Connected Accounts</h2>
          <p className="text-sm text-slate-500 mb-3">Manage the Gmail accounts you've connected.</p>

          {accounts.length === 0 ? (
            <div className="text-sm text-slate-500">No accounts connected yet. Click &quot;Connect Gmail account&quot; to start.</div>
          ) : (
            <ul className="space-y-3">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{a.email}</div>
                    <div className="text-xs text-slate-500">
                      {a.provider ?? 'google'} • last sync:{' '}
                      {a.last_sync_at ? new Date(a.last_sync_at).toLocaleString() : 'never'}
                    </div>
                  </div>
                  <div>
                    <a href={`/accounts/${a.id}`} className="text-indigo-600 text-sm hover:underline">
                      Manage
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white p-4 rounded-md border md:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-medium text-lg">Categories</h2>
              <p className="text-sm text-slate-500 mb-3">Custom categories are used by the AI to sort incoming emails.</p>
            </div>
            <div>
              <a
                href="/categories"
                className="text-sm px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200"
              >
                View all
              </a>
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="text-sm text-slate-500">No categories yet. Click &quot;Add Category&quot; to create one.</div>
          ) : (
            <div className="mt-3 grid gap-3">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 border rounded-md bg-white">
                  <div>
                    <a href={`/categories/${c.id}`} className="font-medium text-sm text-slate-900 hover:underline">
                      {c.name}
                    </a>
                    <div className="text-xs text-slate-500">{c.description}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-xs text-slate-500">{typeof c.count === 'number' ? c.count : '—'}</div>
                    <a href={`/categories/${c.id}/edit`} className="text-sm text-indigo-600 hover:underline">
                      Edit
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="bg-white p-4 rounded-md border">
        <h2 className="font-medium text-lg">Recent Imports</h2>
        <p className="text-sm text-slate-500 mb-3">AI-summarized messages imported from your connected inboxes will appear here.</p>
        <div className="text-sm text-slate-500">No imported emails yet. Run the worker to import and classify messages.</div>
      </section>
    </div>
  )
}
