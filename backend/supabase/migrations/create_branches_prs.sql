-- CollabSpace Phase 2: Branches & Pull Requests
-- Run this in Supabase SQL Editor

-- ─── Branches ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  head_commit_id UUID REFERENCES commits(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(repo_id, name)
);

CREATE INDEX IF NOT EXISTS idx_branches_repo ON branches(repo_id);

-- Add branch column to commits (default = 'main')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commits' AND column_name = 'branch'
  ) THEN
    ALTER TABLE commits ADD COLUMN branch TEXT DEFAULT 'main';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_commits_branch ON commits(repo_id, branch, created_at DESC);

-- ─── Pull Requests ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  source_branch TEXT NOT NULL,
  target_branch TEXT DEFAULT 'main',
  author_id UUID NOT NULL,
  author_email TEXT DEFAULT '',
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  merged_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pr_repo ON pull_requests(repo_id, status);

-- ─── PR Comments / Reviews ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pr_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email TEXT DEFAULT '',
  body TEXT NOT NULL,
  file_path TEXT,
  line_number INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pr_comments ON pr_comments(pr_id, created_at);

-- ─── RLS ─────────────────────────────────────────────────────────────
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pull_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on branches" ON branches;
CREATE POLICY "Service role full access on branches"
  ON branches FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on pull_requests" ON pull_requests;
CREATE POLICY "Service role full access on pull_requests"
  ON pull_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on pr_comments" ON pr_comments;
CREATE POLICY "Service role full access on pr_comments"
  ON pr_comments FOR ALL USING (true) WITH CHECK (true);
