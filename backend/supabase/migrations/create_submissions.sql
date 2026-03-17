-- CollabSpace: Submissions table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email TEXT DEFAULT '',
  content TEXT DEFAULT '',
  file_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id, created_at DESC);

-- RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on submissions" ON submissions;
CREATE POLICY "Service role full access on submissions"
  ON submissions FOR ALL USING (true) WITH CHECK (true);
