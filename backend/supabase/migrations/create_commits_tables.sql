-- CollabSpace Version Control Tables
-- Run this in Supabase SQL Editor

-- Commit history
CREATE TABLE IF NOT EXISTS commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  author_id UUID NOT NULL,
  author_email TEXT DEFAULT '',
  parent_id UUID REFERENCES commits(id),
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- File snapshot per commit
CREATE TABLE IF NOT EXISTS commit_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commit_id UUID NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commits_repo ON commits(repo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commit_files_commit ON commit_files(commit_id);

-- RLS (drop first to avoid "already exists" errors)
ALTER TABLE commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE commit_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on commits" ON commits;
CREATE POLICY "Service role full access on commits"
  ON commits FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on commit_files" ON commit_files;
CREATE POLICY "Service role full access on commit_files"
  ON commit_files FOR ALL USING (true) WITH CHECK (true);
