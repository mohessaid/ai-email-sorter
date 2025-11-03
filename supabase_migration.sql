-- AI Email Sorter - Supabase Database Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
-- Extends Supabase auth.users with application-specific data
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- 2. GOOGLE ACCOUNTS TABLE
-- ============================================================================
-- Stores connected Gmail accounts with OAuth tokens
CREATE TABLE IF NOT EXISTS public.google_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  google_user_id TEXT NOT NULL,
  email TEXT NOT NULL,

  -- OAuth tokens (encrypt these in production!)
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,

  -- Granted scopes
  scopes TEXT[],

  -- Sync tracking
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('active', 'paused', 'error')) DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only connect the same Google account once
  UNIQUE(user_id, google_user_id)
);

-- Enable Row Level Security
ALTER TABLE public.google_accounts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own accounts
CREATE POLICY "Users can view own accounts" ON public.google_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts" ON public.google_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts" ON public.google_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts" ON public.google_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_google_accounts_user_id ON public.google_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_google_accounts_email ON public.google_accounts(email);

-- ============================================================================
-- 3. CATEGORIES TABLE
-- ============================================================================
-- Custom email categories for AI classification
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Category details
  name TEXT NOT NULL,
  description TEXT,

  -- Display settings
  color TEXT,
  icon TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Category names must be unique per user
  UNIQUE(user_id, name)
);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Users can only access their own categories
CREATE POLICY "Users can view own categories" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_created_at ON public.categories(created_at DESC);

-- ============================================================================
-- 4. EMAILS TABLE
-- ============================================================================
-- Imported emails from Gmail with AI summaries
CREATE TABLE IF NOT EXISTS public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_account_id UUID NOT NULL REFERENCES public.google_accounts(id) ON DELETE CASCADE,

  -- Gmail identifiers
  gmail_message_id TEXT NOT NULL,
  thread_id TEXT,

  -- Email metadata
  subject TEXT,
  from_email TEXT,
  from_name TEXT,
  to_email TEXT,
  to_name TEXT,
  date TIMESTAMPTZ,

  -- Email content
  snippet TEXT,
  raw_text TEXT,
  html TEXT,

  -- AI classification & summary
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  summarized_text TEXT,
  classification_confidence FLOAT,
  classification_method TEXT, -- 'embeddings', 'llm', 'manual'

  -- Processing status
  processing_status TEXT CHECK (processing_status IN ('pending', 'processed', 'failed')) DEFAULT 'pending',

  -- Actions taken
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate imports
  UNIQUE(google_account_id, gmail_message_id)
);

-- Enable Row Level Security
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Users can only access emails from their own Google accounts
CREATE POLICY "Users can view own emails" ON public.emails
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.google_accounts ga
      WHERE ga.id = emails.google_account_id
      AND ga.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own emails" ON public.emails
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.google_accounts ga
      WHERE ga.id = emails.google_account_id
      AND ga.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own emails" ON public.emails
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.google_accounts ga
      WHERE ga.id = emails.google_account_id
      AND ga.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own emails" ON public.emails
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.google_accounts ga
      WHERE ga.id = emails.google_account_id
      AND ga.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_account_id ON public.emails(google_account_id);
CREATE INDEX IF NOT EXISTS idx_emails_category_id ON public.emails(category_id);
CREATE INDEX IF NOT EXISTS idx_emails_gmail_message_id ON public.emails(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON public.emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_date ON public.emails(date DESC);
CREATE INDEX IF NOT EXISTS idx_emails_imported_at ON public.emails(imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_status ON public.emails(processing_status);

-- ============================================================================
-- 5. UNSUBSCRIBE ATTEMPTS TABLE
-- ============================================================================
-- Tracks automated unsubscribe attempts
CREATE TABLE IF NOT EXISTS public.unsubscribe_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,

  -- Unsubscribe details
  link TEXT,
  method TEXT CHECK (method IN ('http', 'mailto', 'unknown')) DEFAULT 'http',
  status TEXT CHECK (status IN ('pending', 'success', 'failed')) DEFAULT 'pending',

  -- Result details
  details JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,

  -- Timestamps
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.unsubscribe_attempts ENABLE ROW LEVEL SECURITY;

-- Users can only see unsubscribe attempts for their own emails
CREATE POLICY "Users can view own unsubscribe attempts" ON public.unsubscribe_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.emails e
      JOIN public.google_accounts ga ON ga.id = e.google_account_id
      WHERE e.id = unsubscribe_attempts.email_id
      AND ga.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own unsubscribe attempts" ON public.unsubscribe_attempts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.emails e
      JOIN public.google_accounts ga ON ga.id = e.google_account_id
      WHERE e.id = unsubscribe_attempts.email_id
      AND ga.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_unsubscribe_attempts_email_id ON public.unsubscribe_attempts(email_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_attempts_status ON public.unsubscribe_attempts(status);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_attempts_attempted_at ON public.unsubscribe_attempts(attempted_at DESC);

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_accounts_updated_at
  BEFORE UPDATE ON public.google_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emails_updated_at
  BEFORE UPDATE ON public.emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Email counts per category
CREATE OR REPLACE VIEW category_email_counts AS
SELECT
  c.id as category_id,
  c.user_id,
  c.name as category_name,
  COUNT(e.id) as email_count,
  COUNT(e.id) FILTER (WHERE e.read_at IS NULL) as unread_count
FROM public.categories c
LEFT JOIN public.emails e ON e.category_id = c.id AND e.deleted_at IS NULL
GROUP BY c.id, c.user_id, c.name;

-- View: Account sync status
CREATE OR REPLACE VIEW account_sync_status AS
SELECT
  ga.id as account_id,
  ga.user_id,
  ga.email,
  ga.last_sync_at,
  ga.sync_status,
  COUNT(e.id) as total_emails,
  COUNT(e.id) FILTER (WHERE e.imported_at > NOW() - INTERVAL '24 hours') as emails_last_24h,
  MAX(e.imported_at) as last_email_imported
FROM public.google_accounts ga
LEFT JOIN public.emails e ON e.google_account_id = ga.id
GROUP BY ga.id, ga.user_id, ga.email, ga.last_sync_at, ga.sync_status;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant authenticated users access to tables
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE! 🎉
-- ============================================================================

-- Verify tables were created
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN ('users', 'google_accounts', 'categories', 'emails', 'unsubscribe_attempts')
ORDER BY table_name;

-- Show created views
SELECT table_name as view_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('category_email_counts', 'account_sync_status');
