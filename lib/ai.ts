/**
 * ai_email_sorter/next/lib/ai.ts
 *
 * AI helper wrapper that supports OpenRouter (preferred when configured) and OpenAI as a fallback.
 *
 * - Provides: embedding generation, cosine-similarity classification using category descriptions,
 *   and LLM-based summary + tie-breaker classification.
 *
 * Environment variables:
 *  - OPENROUTER_API_KEY (optional)       : API key for an OpenRouter-compatible endpoint
 *  - OPENROUTER_API_URL (optional)       : Base URL for OpenRouter (e.g., https://api.openrouter.example)
 *  - OPENAI_API_KEY (optional)           : Fallback OpenAI API key
 *  - AI_EMBEDDING_MODEL (optional)       : Embedding model name (default: 'text-embedding-3-small')
 *  - AI_LLM_MODEL (optional)             : LLM model name for summaries/classification (default: 'gpt-4o-mini' if available)
 *
 * Implementation notes:
 *  - This file implements HTTP requests using `fetch` and is intentionally tolerant of
 *    provider response shape differences by attempting multiple common response fields.
 *  - Category description embeddings are cached in-memory for the lifetime of the Node process.
 *    For production you should persist or share embeddings across workers to avoid recomputing.
 *
 * Important:
 *  - This helper only performs server-side calls; never expose secret API keys to the browser.
 *  - The exact OpenRouter API surface varies; this wrapper expects OpenRouter to expose endpoints
 *    compatible with the OpenAI-style `v1/embeddings` and `v1/chat/completions` or similar. If your
 *    OpenRouter deployment uses different paths, set `OPENROUTER_API_URL` accordingly and verify endpoints.
 */

type Provider = 'openrouter' | 'openai'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL // e.g. https://api.openrouter.ai
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const EMBEDDING_MODEL = process.env.AI_EMBEDDING_MODEL ?? 'text-embedding-3-small'
const LLM_MODEL = process.env.AI_LLM_MODEL ?? 'gpt-4o-mini'

/**
 * Select provider based on available environment variables.
 * Priority: OpenRouter (if both API_KEY and API_URL provided) -> OpenAI (if API key provided) -> throw.
 */
function detectProvider(): { provider: Provider; apiKey: string; apiBase: string } {
  if (OPENROUTER_API_KEY && OPENROUTER_API_URL) {
    return { provider: 'openrouter', apiKey: OPENROUTER_API_KEY, apiBase: OPENROUTER_API_URL.replace(/\/+$/, '') }
  }
  if (OPENAI_API_KEY) {
    return { provider: 'openai', apiKey: OPENAI_API_KEY, apiBase: 'https://api.openai.com' }
  }
  throw new Error(
    'No AI provider configured. Set OPENROUTER_API_KEY + OPENROUTER_API_URL or OPENAI_API_KEY in environment.'
  )
}

/**
 * Small helper to perform POST requests with timeout.
 */
async function postJson(url: string, apiKey: string, body: unknown, timeoutMs = 30_000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const text = await res.text()
    // Try parse JSON, but include raw text in error messages
    let json: any
    try {
      json = text ? JSON.parse(text) : {}
    } catch (parseErr) {
      throw new Error(`Non-JSON response (${res.status}): ${text}`)
    }
    if (!res.ok) {
      // Attempt to extract error message
      const msg = json?.error?.message ?? json?.message ?? JSON.stringify(json)
      throw new Error(`AI provider responded with ${res.status}: ${msg}`)
    }
    return json
  } finally {
    clearTimeout(id)
  }
}

/**
 * Extract embedding from a provider response (supports multiple common shapes).
 */
function extractEmbedding(resp: any): number[] | null {
  if (!resp) return null
  // OpenAI style: { data: [{ embedding: [...] }] }
  if (Array.isArray(resp.data) && resp.data[0] && Array.isArray(resp.data[0].embedding)) {
    return resp.data[0].embedding
  }
  // Some providers may return `output` or `embeddings`
  if (Array.isArray(resp.output) && resp.output[0] && Array.isArray(resp.output[0].embedding)) {
    return resp.output[0].embedding
  }
  if (Array.isArray(resp.embeddings) && resp.embeddings[0] && Array.isArray(resp.embeddings[0].vector)) {
    return resp.embeddings[0].vector
  }
  // Last-ditch: try first numeric array found in the response object (not bulletproof)
  const findFirstNumericArray = (o: any): number[] | null => {
    if (!o || typeof o !== 'object') return null
    for (const k of Object.keys(o)) {
      const v = o[k]
      if (Array.isArray(v) && v.every((n: any) => typeof n === 'number')) return v as number[]
      if (typeof v === 'object') {
        const nested = findFirstNumericArray(v)
        if (nested) return nested
      }
    }
    return null
  }
  return findFirstNumericArray(resp)
}

/**
 * Extract assistant text content from chat/completion responses (multiple provider shapes).
 */
function extractAssistantText(resp: any): string | null {
  if (!resp) return null
  // OpenAI chat-completion: resp.choices[0].message.content
  if (Array.isArray(resp.choices) && resp.choices[0]) {
    const ch = resp.choices[0]
    if (ch.message?.content && typeof ch.message.content === 'string') return ch.message.content
    if (typeof ch.text === 'string') return ch.text
    if (ch.output && Array.isArray(ch.output) && typeof ch.output[0] === 'string') return ch.output[0]
    if (ch.delta && ch.delta.content) return ch.delta.content
  }
  // OpenRouter or other: resp.output[0].content or resp.result
  if (Array.isArray(resp.output) && resp.output[0] && typeof resp.output[0].content === 'string') {
    return resp.output[0].content
  }
  if (typeof resp.result === 'string') return resp.result
  if (typeof resp.text === 'string') return resp.text
  // fallback: stringify first top-level string found
  const findFirstString = (o: any): string | null => {
    if (!o) return null
    if (typeof o === 'string') return o
    if (Array.isArray(o)) {
      for (const el of o) {
        const val = findFirstString(el)
        if (val) return val
      }
    } else if (typeof o === 'object') {
      for (const k of Object.keys(o)) {
        const val = findFirstString(o[k])
        if (val) return val
      }
    }
    return null
  }
  return findFirstString(resp)
}

/**
 * Compute an embedding for a given input string.
 * Caches are intentionally lightweight and in-memory.
 */
const categoryEmbeddingCache = new Map<
  string,
  { embedding: number[]; ts: number } // key = categoryId or description hash
>()
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours

export async function getEmbedding(text: string): Promise<number[]> {
  const { provider, apiKey, apiBase } = detectProvider()

  // basic body shape that works for OpenAI-compatible embeddings endpoints
  const body = {
    model: EMBEDDING_MODEL,
    input: text,
  }

  // Use provider's embedding endpoint (we assume OpenAI-compatible path exists)
  const url = `${apiBase.replace(/\/$/, '')}/v1/embeddings`

  const resp = await postJson(url, apiKey, body)
  const emb = extractEmbedding(resp)
  if (!emb) throw new Error('Failed to extract embedding from AI provider response')
  return emb
}

/**
 * Cosine similarity helper.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    // It's possible to get embeddings with different dims from different models.
    // For safety, trim to shortest length.
    const n = Math.min(a.length, b.length)
    a = a.slice(0, n)
    b = b.slice(0, n)
  }
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

/**
 * Compute or retrieve cached embedding for a category description.
 * `categoryKey` is typically the category id; `text` is the description to embed.
 */
async function getCategoryEmbedding(categoryKey: string, text: string): Promise<number[]> {
  const cached = categoryEmbeddingCache.get(categoryKey)
  const now = Date.now()
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return cached.embedding
  }
  const embedding = await getEmbedding(text)
  categoryEmbeddingCache.set(categoryKey, { embedding, ts: now })
  return embedding
}

/**
 * Given an email text and a list of categories ({ id, name, description }), returns the best-match
 * category (by embedding similarity) and the similarity scores.
 *
 * If the top similarity is below `threshold` (default 0.72) the function will return `null` for
 * `categoryId` to indicate uncertain classification. Callers may then run a tie-breaker using LLM.
 */
export async function classifyByEmbeddings(
  emailText: string,
  categories: Array<{ id: string; name: string; description: string }>,
  threshold = 0.72
): Promise<{ categoryId: string | null; scores: Array<{ id: string; score: number }>; topScore: number | null }> {
  if (!categories || categories.length === 0) {
    return { categoryId: null, scores: [], topScore: null }
  }

  // Compute embedding for the email
  const emailEmb = await getEmbedding(emailText)

  // Compute category embeddings (cached)
  const scores: Array<{ id: string; score: number }> = []
  for (const c of categories) {
    const catEmb = await getCategoryEmbedding(c.id, `${c.name}\n\n${c.description ?? ''}`)
    const score = cosineSimilarity(emailEmb, catEmb)
    scores.push({ id: c.id, score })
  }

  scores.sort((a, b) => b.score - a.score)
  const top = scores[0]
  if (!top) return { categoryId: null, scores, topScore: null }

  const categoryId = top.score >= threshold ? top.id : null
  return { categoryId, scores, topScore: top.score }
}

/**
 * Ask the LLM to pick the best category from a list using a prompt.
 * This is used as a tie-breaker or when embedding confidence is low.
 */
export async function chooseCategoryWithLLM(
  emailText: string,
  categories: Array<{ id: string; name: string; description: string }>
): Promise<{ categoryId: string | null; reason?: string }> {
  if (!categories || categories.length === 0) return { categoryId: null, reason: 'no categories provided' }

  const providerInfo = detectProvider()
  const { apiBase, apiKey } = providerInfo

  // Build a succinct system prompt and user message
  const categoryList = categories.map((c, i) => `${i + 1}. ${c.name} — ${c.description ?? '(no description)'}`).join('\n')

  const systemPrompt = `You are an assistant that assigns an email to the single best category from a numbered list. Reply with the number (alone) of the best category and a short one-line rationale on a second line. If none apply, reply with 0 and a short reason.`
  const userPrompt = `Email:\n"""\n${emailText}\n"""\n\nCategories:\n${categoryList}\n\nRespond with the number and a one-line justification.`

  const chatPayload = {
    model: LLM_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 200,
    temperature: 0.0,
  }

  // Compose URL for chat/completions endpoint (OpenAI-compatible)
  const chatUrl = `${apiBase.replace(/\/$/, '')}/v1/chat/completions`
  const resp = await postJson(chatUrl, apiKey, chatPayload)
  const assistant = extractAssistantText(resp)
  if (!assistant) return { categoryId: null, reason: 'no response from model' }

  // Parse assistant reply: expect "N\nRationale"
  const [firstLine, ...rest] = assistant.trim().split(/\r?\n/)
  const match = firstLine.trim().match(/^(\d+)/)
  if (!match) {
    // Try to find any number in the reply
    const anyNum = assistant.match(/(\d+)/)
    if (!anyNum) return { categoryId: null, reason: assistant.trim() }
    const idx = parseInt(anyNum[1], 10)
    if (idx <= 0 || idx > categories.length) return { categoryId: null, reason: assistant.trim() }
    return { categoryId: categories[idx - 1].id, reason: rest.join(' ').trim() || assistant.trim() }
  }
  const idx = parseInt(match[1], 10)
  if (idx === 0) return { categoryId: null, reason: rest.join(' ').trim() || 'model returned 0' }
  if (idx < 1 || idx > categories.length) return { categoryId: null, reason: assistant.trim() }
  return { categoryId: categories[idx - 1].id, reason: rest.join(' ').trim() || undefined }
}

/**
 * Summarize an email with the LLM.
 * Returns a short summary and optionally detected actionable items (unsubscribe links, dates, requests).
 */
export async function summarizeEmail(emailText: string, maxTokens = 256): Promise<{ summary: string; actions?: string[] }> {
  const providerInfo = detectProvider()
  const { apiBase, apiKey } = providerInfo

  const prompt = `Summarize the following email in 2-4 sentences for a busy reader. Then list any actionable items (one per line) such as unsubscribe links, dates, calls-to-action, or things the user needs to do.\n\nEmail:\n\"\"\"\n${emailText}\n\"\"\"\n\nFormat:\nSummary:\n- <2-4 sentence summary>\nActions:\n- <bullet 1>\n- <bullet 2> (if any)\n\nKeep the language concise.`

  const chatPayload = {
    model: LLM_MODEL,
    messages: [
      { role: 'system', content: 'You are a concise assistant that produces short summaries and extracts actionable items.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.2,
  }

  const chatUrl = `${apiBase.replace(/\/$/, '')}/v1/chat/completions`
  const resp = await postJson(chatUrl, apiKey, chatPayload)
  const assistant = extractAssistantText(resp)
  if (!assistant) throw new Error('No summary returned from LLM')
  // Try to parse "Summary:" and "Actions:" sections
  const summaryMatch = assistant.match(/Summary:\s*([\s\S]*?)(?:\nActions:|\z)/i)
  const actionsMatch = assistant.match(/Actions:\s*([\s\S]*)/i)
  const summary = summaryMatch ? summaryMatch[1].trim() : assistant.trim()
  const actionsRaw = actionsMatch ? actionsMatch[1].trim() : ''
  const actions =
    actionsRaw.length === 0
      ? []
      : actionsRaw
          .split(/\r?\n/)
          .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
          .filter((l) => l.length > 0)

  return { summary, actions }
}

/**
 * High-level convenience function that classifies an email using embeddings first,
 * falls back to LLM tie-breaker if confidence is low, and returns chosen category id
 * along with debug information.
 */
export async function classifyEmail(
  emailText: string,
  categories: Array<{ id: string; name: string; description: string }>,
  options?: { threshold?: number }
): Promise<{
  categoryId: string | null
  method: 'embeddings' | 'llm' | 'none'
  scores?: Array<{ id: string; score: number }>
  reason?: string
}> {
  const threshold = options?.threshold ?? 0.72
  // 1) Try embeddings
  try {
    const embedResult = await classifyByEmbeddings(emailText, categories, threshold)
    if (embedResult.categoryId) {
      return { categoryId: embedResult.categoryId, method: 'embeddings', scores: embedResult.scores }
    }
    // 2) fallback to LLM-based selection
    const llm = await chooseCategoryWithLLM(emailText, categories)
    if (llm.categoryId) {
      return { categoryId: llm.categoryId, method: 'llm', reason: llm.reason }
    }
    return { categoryId: null, method: 'none', reason: llm.reason ?? 'no match' }
  } catch (err: any) {
    // In case of unexpected errors, try LLM as a last resort or return null
    try {
      const fallback = await chooseCategoryWithLLM(emailText, categories)
      return { categoryId: fallback.categoryId, method: 'llm', reason: fallback.reason }
    } catch (err2: any) {
      return { categoryId: null, method: 'none', reason: (err2 && String(err2)) || (err && String(err)) }
    }
  }
}

/**
 * Exported utilities for tests or external usage.
 */
export default {
  detectProvider,
  getEmbedding,
  cosineSimilarity,
  classifyByEmbeddings,
  chooseCategoryWithLLM,
  summarizeEmail,
  classifyEmail,
}
