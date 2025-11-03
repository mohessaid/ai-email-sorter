# AI Email Sorter

AI-powered email sorting application built with Next.js 15, Supabase, and OpenRouter/OpenAI.

## Features

- 🔐 Google OAuth sign-in with Gmail access
- 📧 AI-powered email classification and summarization
- 📁 Custom categories with natural language descriptions
- 🤖 Automatic email archiving after import
- 🔍 **AI-powered automatic unsubscribe** (NEW! ✨)
- 📊 Dashboard with email summaries
- 🎨 Modern UI with shadcn/ui components

## 📚 Documentation

All documentation has been moved to the [`docs/`](./docs/) folder:

- **[SPECS.md](./SPECS.md)** - Complete feature specifications
- **[docs/TEST_RESULTS.md](./docs/TEST_RESULTS.md)** - Test results (121 tests passing)
- **[docs/README_TESTS.md](./docs/README_TESTS.md)** - Testing guide
- **[docs/AI_CLASSIFICATION_GUIDE.md](./docs/AI_CLASSIFICATION_GUIDE.md)** - AI classification setup
- **[docs/AI_CLASSIFICATION_COMPLETE.md](./docs/AI_CLASSIFICATION_COMPLETE.md)** - AI implementation details
- **[docs/UNSUBSCRIBE_AUTOMATION.md](./docs/UNSUBSCRIBE_AUTOMATION.md)** - Unsubscribe feature guide (NEW!)
- **[docs/UNSUBSCRIBE_COMPLETE.md](./docs/UNSUBSCRIBE_COMPLETE.md)** - Unsubscribe implementation
- **[docs/UNSUBSCRIBE_QUICKREF.md](./docs/UNSUBSCRIBE_QUICKREF.md)** - Quick reference card
- **[docs/UX_IMPROVEMENTS_COMPLETE.md](./docs/UX_IMPROVEMENTS_COMPLETE.md)** - UI/UX improvements

## Tech Stack

- **Framework:** Next.js 15 with App Router
- **Database:** Supabase (Postgres + Auth)
- **AI:** OpenRouter (or OpenAI fallback)
- **UI:** shadcn/ui + Tailwind CSS
- **Email API:** Gmail API via googleapis
- **Testing:** Vitest + Playwright

## Prerequisites

- Node.js 18.17.0 or higher
- A Supabase account (https://supabase.com)
- An OpenRouter account (https://openrouter.ai) or OpenAI API key
- A Google Cloud project with Gmail API enabled

## Quick Setup

### 1. Install Dependencies

```bash
npm install --legacy-peer-deps
```

> Note: Use `--legacy-peer-deps` if you encounter peer dependency conflicts with React 19.

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Then fill in your credentials:

```env
# Supabase (from https://supabase.com/dashboard/project/_/settings/api)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth (from https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# OpenRouter (from https://openrouter.ai/keys)
OPENROUTER_API_KEY=sk-or-v1-your-key
OPENROUTER_API_URL=https://openrouter.ai/api

# Or use OpenAI instead
# OPENAI_API_KEY=sk-proj-your-key
```

### 3. Set Up Supabase Database

Create these tables in your Supabase SQL editor:

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connected Gmail accounts
CREATE TABLE google_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  scopes TEXT[],
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, google_user_id)
);

-- Email categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Imported emails
CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_account_id UUID NOT NULL REFERENCES google_accounts(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  thread_id TEXT,
  subject TEXT,
  from_email TEXT,
  to_email TEXT,
  snippet TEXT,
  raw_text TEXT,
  html TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  summarized_text TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  UNIQUE(google_account_id, gmail_message_id)
);

-- Unsubscribe attempts
CREATE TABLE unsubscribe_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  link TEXT,
  status TEXT CHECK (status IN ('pending', 'success', 'failure')),
  details JSONB,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_google_accounts_user ON google_accounts(user_id);
CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_emails_account ON emails(google_account_id);
CREATE INDEX idx_emails_category ON emails(category_id);
CREATE INDEX idx_emails_imported ON emails(imported_at DESC);
```

### 4. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
6. In Supabase Dashboard > Authentication > Providers, enable Google
7. Paste your Client ID and Secret
8. Add test users to your Google OAuth consent screen (required for development)

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
next/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── accounts/      # Gmail account management
│   │   ├── categories/    # Category CRUD
│   │   ├── gmail/         # Gmail API integration
│   │   └── test/          # Test endpoints
│   ├── (app)/             # App route group
│   │   └── dashboard/     # Dashboard page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage/dashboard
│   └── globals.css        # Global styles
├── components/            # React components
│   └── ui/               # shadcn/ui components (add via CLI)
├── lib/                   # Utilities
│   ├── supabaseClient.ts # Supabase client helpers
│   ├── ai.ts             # OpenRouter/OpenAI wrappers
│   └── utils.ts          # Utility functions
├── tests/                 # Test files
│   ├── setup.ts          # Test configuration
│   └── ai.test.ts        # AI helper tests
├── components.json        # shadcn/ui config
├── tailwind.config.ts     # Tailwind configuration
├── tsconfig.json          # TypeScript config
└── package.json           # Dependencies
```

## Adding shadcn/ui Components

This project uses shadcn/ui for UI components. Add components as needed:

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add toast
npx shadcn@latest add select
npx shadcn@latest add checkbox
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run Vitest tests
- `npm run test:ui` - Run tests with UI
- `npm run typecheck` - Type check with TypeScript

## Implementation Status

### ✅ Completed
- Next.js 15 scaffold with App Router
- Supabase integration (SSR-ready)
- Basic UI layout and routing
- API route placeholders
- AI helper functions (classification + summarization)
- Test setup with Vitest

### 🚧 In Progress
- Google OAuth flow
- Gmail API integration
- Email import worker
- Category management UI
- Email list view with summaries

### 📋 TODO
- Background worker for Gmail polling
- Playwright unsubscribe agent
- Bulk actions (delete, unsubscribe)
- Email detail view
- Push notifications via Pub/Sub
- Production deployment config

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `OPENROUTER_API_KEY` | OpenRouter API key | Yes* |
| `OPENROUTER_API_URL` | OpenRouter base URL | Yes* |
| `OPENAI_API_KEY` | OpenAI API key (fallback) | No |
| `AI_EMBEDDING_MODEL` | Embedding model name | No |
| `AI_LLM_MODEL` | LLM model name | No |

\* Either OpenRouter or OpenAI credentials required

## Troubleshooting

### npm install fails with peer dependency errors
```bash
npm install --legacy-peer-deps
```

### Supabase client errors
- Verify environment variables are set correctly
- Check Supabase project URL and keys
- Ensure database tables are created

### Google OAuth not working
- Verify redirect URI matches in Google Console and Supabase
- Add test users to OAuth consent screen
- Check scopes include Gmail access

### AI classification not working
- Verify OpenRouter or OpenAI API key is valid
- Check API endpoint URLs
- Review logs for API errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT